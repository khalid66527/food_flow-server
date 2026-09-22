export class AgentRouterService {
  private static dynamicKeys: string[] = [];
  private static currentKeyIndex = 0;

  /**
   * Set dynamic keys from DB
   */
  public static setDynamicKeys(keys: string[]) {
    this.dynamicKeys = (keys || []).map((k) => k.trim()).filter(Boolean);
  }

  /**
   * Get merged keys from process.env and DB
   */
  private static getMergedKeys(): string[] {
    const envKeys = process.env.AGENTROUTER_API_KEYS
      ? process.env.AGENTROUTER_API_KEYS.split(',').map((k) => k.trim()).filter(Boolean)
      : [];
    const singleEnv = process.env.AGENTROUTER_API_KEY?.trim();

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
   * Test a single Agent Router key live
   */
  public static async testKey(apiKey: string): Promise<{ success: boolean; message: string }> {
    if (!apiKey || !apiKey.trim()) {
      return { success: false, message: 'API key cannot be empty' };
    }

    try {
      const res = await fetch('https://agentrouter.org/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
          Originator: 'codex_cli_rs',
          Version: '0.114.0',
          'anthropic-dangerous-direct-browser-access': 'true',
          'x-app': 'cli',
        },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          messages: [{ role: 'user', content: 'hi' }],
          stream: true,
          max_tokens: 10,
        }),
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => null)) as any;
        const errMsg = errJson?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        return { success: false, message: errMsg };
      }

      // Consume first few chunks to verify connection
      if (res.body) {
        const reader = res.body.getReader();
        await reader.read();
        reader.cancel();
      }

      return { success: true, message: 'Agent Router API key verified successfully!' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Connection failed' };
    }
  }

  /**
   * Parse SSE stream from response and concatenate response text
   */
  private static async readSseStream(response: Response): Promise<string> {
    if (!response.body) {
      throw new Error('Response body is empty');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // keep last partial line in buffer

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith(':')) continue; // Skip keep-alives and empty lines

        if (line.startsWith('data:')) {
          const dataStr = line.slice(5).trim();
          if (dataStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed?.choices?.[0]?.delta;
            if (delta?.content) {
              accumulatedText += delta.content;
            }
          } catch {
            // Ignore non-json chunks
          }
        }
      }
    }

    return accumulatedText.trim();
  }

  /**
   * Generate content using Agent Router with SSE Streaming & key failover
   */
  public static async generateContent(options: {
    messages: Array<{ role: string; content: string }>;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    const keys = this.getMergedKeys();
    if (keys.length === 0) {
      throw new Error('No Agent Router API keys available in environment or database.');
    }

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
        const res = await fetch('https://agentrouter.org/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeKey}`,
            Originator: 'codex_cli_rs',
            Version: '0.114.0',
            'anthropic-dangerous-direct-browser-access': 'true',
            'x-app': 'cli',
          },
          body: JSON.stringify({
            model: 'deepseek-v4-flash',
            messages: chatPayloadMessages,
            temperature: options.temperature ?? 0.6,
            max_tokens: options.maxTokens ?? 1000,
            stream: true, // Mandatory on Agent Router to avoid 500 errors
          }),
        });

        if (res.ok) {
          const content = await this.readSseStream(res);
          if (content) {
            return content;
          }
        }

        const errJson = (await res.json().catch(() => null)) as any;
        lastError = errJson?.error?.message || `Agent Router HTTP ${res.status}: ${res.statusText}`;

        this.currentKeyIndex = (this.currentKeyIndex + 1) % totalKeys;
        attempts++;
      } catch (err: any) {
        lastError = err?.message || err;
        this.currentKeyIndex = (this.currentKeyIndex + 1) % totalKeys;
        attempts++;
      }
    }

    throw new Error(`All Agent Router API keys failed. Last error: ${lastError}`);
  }
}
