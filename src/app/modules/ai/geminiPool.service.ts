import { GoogleGenAI } from '@google/genai';

export class GeminiPoolService {
  private static dynamicKeys: string[] = [];
  private static keys: string[] = [];
  private static currentKeyIndex = 0;
  private static initialized = false;
  // Remember the primary working model to avoid trial-and-error latency
  private static workingModel: string = 'gemini-2.5-flash';

  public static setDynamicKeys(keys: string[]) {
    this.dynamicKeys = (keys || []).map((k) => k.trim()).filter(Boolean);
    this.initialized = false;
  }

  private static initKeys() {
    if (this.initialized) return;

    const envKeys = process.env.GEMINI_API_KEYS
      ? process.env.GEMINI_API_KEYS.split(',').map((k) => k.trim()).filter(Boolean)
      : [];
    const singleKey = process.env.GEMINI_API_KEY?.trim();

    const pool = Array.from(
      new Set([
        ...this.dynamicKeys,
        ...envKeys,
        ...(singleKey ? [singleKey] : []),
      ])
    ).filter(Boolean);

    this.keys = pool;
    this.initialized = true;
  }

  public static getPoolSize(): number {
    this.initKeys();
    return this.keys.length;
  }

  /**
   * Live test a single Gemini key against the Google Generative Language API
   */
  public static async testKey(apiKey: string, model: string = 'gemini-2.5-flash'): Promise<{ success: boolean; message: string }> {
    if (!apiKey || !apiKey.trim()) {
      return { success: false, message: 'API key cannot be empty' };
    }

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        config: {
          maxOutputTokens: 5,
        },
      });

      if (response && response.text) {
        return { success: true, message: 'Google Gemini API key verified successfully!' };
      }
      return { success: true, message: 'Gemini responded successfully!' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Gemini key validation failed' };
    }
  }

  /**
   * Ultra-fast content generation with zero-overhead failover
   */
  public static async generateContentWithFailover(options: {
    contents: any;
    systemInstruction?: string;
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
  }): Promise<string> {
    this.initKeys();

    if (this.keys.length === 0) {
      throw new Error('No Gemini API keys configured in pool.');
    }

    const totalKeys = this.keys.length;
    let attempts = 0;
    let lastError: any = null;

    // Fast, production-ready Gemini models ordered by response speed
    const candidateModels = [
      options.model || this.workingModel,
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ].filter((v, i, a) => a.indexOf(v) === i);

    while (attempts < totalKeys) {
      const activeKey = this.keys[this.currentKeyIndex % totalKeys];

      try {
        const ai = new GoogleGenAI({ apiKey: activeKey });

        for (const model of candidateModels) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents: options.contents,
              config: {
                systemInstruction: options.systemInstruction,
                temperature: options.temperature ?? 0.6,
                maxOutputTokens: options.maxOutputTokens ?? 900,
              },
            });

            if (response && response.text) {
              this.workingModel = model; // Cache working model for next calls
              return response.text;
            }
          } catch (modelErr: any) {
            if (
              modelErr?.status === 404 ||
              modelErr?.message?.includes('404') ||
              modelErr?.message?.toLowerCase().includes('not found')
            ) {
              continue;
            }
            throw modelErr;
          }
        }
      } catch (err: any) {
        lastError = err;
        const errString = String(err?.message || err?.status || err).toLowerCase();
        const isQuotaOrLimitError =
          err?.status === 429 ||
          err?.status === 403 ||
          errString.includes('quota') ||
          errString.includes('resource_exhausted') ||
          errString.includes('rate limit') ||
          errString.includes('limit') ||
          errString.includes('429');

        // Rotate index to next key immediately
        this.currentKeyIndex = (this.currentKeyIndex + 1) % totalKeys;
        attempts++;

        if (!isQuotaOrLimitError && attempts >= 2) {
          break;
        }
      }
    }

    throw new Error(
      `All Gemini API keys failed. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }
}
