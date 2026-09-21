import { GoogleGenAI } from '@google/genai';

// Pre-configured list of fallback keys provided by the platform
const FALLBACK_KEYS: string[] = [];

export class GeminiPoolService {
  private static keys: string[] = [];
  private static currentKeyIndex = 0;
  private static initialized = false;
  // Remember the primary working model to avoid trial-and-error latency
  private static workingModel: string = 'gemini-2.5-flash';

  private static initKeys() {
    if (this.initialized) return;

    const envKeys = process.env.GEMINI_API_KEYS
      ? process.env.GEMINI_API_KEYS.split(',').map((k) => k.trim()).filter(Boolean)
      : [];
    const singleKey = process.env.GEMINI_API_KEY?.trim();

    const pool = Array.from(
      new Set([...envKeys, ...(singleKey ? [singleKey] : [])])
    );

    this.keys = pool;
    this.initialized = true;
  }

  public static getPoolSize(): number {
    this.initKeys();
    return this.keys.length;
  }

  /**
   * Ultra-fast content generation with zero-overhead failover
   */
  public static async generateContentWithFailover(options: {
    contents: any;
    systemInstruction?: string;
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
      this.workingModel,
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ].filter((v, i, a) => a.indexOf(v) === i);

    while (attempts < totalKeys) {
      const activeKey = this.keys[this.currentKeyIndex];

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
