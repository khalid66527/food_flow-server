export class GroqService {
  private static dynamicKeys: string[] = [];
  private static currentKeyIndex = 0;

  /**
   * Set dynamic keys from DB or cache
   */
  public static setDynamicKeys(keys: string[]) {
    this.dynamicKeys = (keys || []).map((k) => k.trim()).filter(Boolean);
  }

  /**
   * Get merged keys from process.env and DB
   */
  private static getMergedKeys(): string[] {
    const envKeys = process.env.GROQ_API_KEYS
      ? process.env.GROQ_API_KEYS.split(',').map((k) => k.trim()).filter(Boolean)
      : [];
    const singleEnv = process.env.GROQ_API_KEY?.trim();

    return Array.from(
      new Set([
        ...this.dynamicKeys,
        ...envKeys,
        ...(singleEnv ? [singleEnv] : []),
      ])
    ).filter(Boolean);
  }

  public static getPoolSize(): number {
    return this.getMergedKeys().length;
  }

  /**
   * Test a single Groq key live against the Groq API
   */
  public static async testKey(apiKey: string, model: string = 'openai/gpt-oss-120b'): Promise<{ success: boolean; message: string }> {
    if (!apiKey || !apiKey.trim()) {
      return { success: false, message: 'API key cannot be empty' };
    }

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: model || 'openai/gpt-oss-120b',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
        }),
      });

      if (res.ok) {
        return { success: true, message: 'Groq API key verified successfully!' };
      }

      const errJson = (await res.json().catch(() => null)) as any;
      const errMsg = errJson?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      return { success: false, message: errMsg };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Connection failed' };
    }
  }

  /**
   * Generate content using Groq with multi-key round-robin rotation
   */
  public static async generateContent(options: {
    messages: Array<{ role: string; content: string }>;
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    const keys = this.getMergedKeys();
    if (keys.length === 0) {
      throw new Error('No Groq API keys available in environment or database.');
    }

    const targetModel = options.model || 'qwen/qwen3.8-27b';
    const totalKeys = keys.length;
    let attempts = 0;
    let lastError: any = null;

    const chatPayloadMessages: Array<{ role: string; content: string }> = [];
    if (options.systemPrompt) {
      chatPayloadMessages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    options.messages.forEach((m) => {
      chatPayloadMessages.push({
        role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content || '',
      });
    });

    while (attempts < totalKeys) {
      const activeKey = keys[this.currentKeyIndex % totalKeys];

      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeKey}`,
          },
          body: JSON.stringify({
            model: targetModel,
            messages: chatPayloadMessages,
            temperature: options.temperature ?? 0.6,
            max_tokens: options.maxTokens ?? 900,
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          const reply = data?.choices?.[0]?.message?.content;
          if (reply && typeof reply === 'string') {
            return reply;
          }
        }

        const errJson = (await res.json().catch(() => null)) as any;
        lastError = errJson?.error?.message || `Groq HTTP ${res.status}: ${res.statusText}`;

        // Rotate index on rate limit, quota, or authentication failure
        this.currentKeyIndex = (this.currentKeyIndex + 1) % totalKeys;
        attempts++;
      } catch (err: any) {
        lastError = err?.message || err;
        this.currentKeyIndex = (this.currentKeyIndex + 1) % totalKeys;
        attempts++;
      }
    }

    throw new Error(`All Groq API keys failed. Last error: ${lastError}`);
  }
}
