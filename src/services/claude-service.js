class ClaudeService {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || null;
    this.apiUrl = 'https://api.anthropic.com/v1/messages';
    this.model = 'claude-sonnet-4-6';
    this.maxTokens = 300;
    this.temperature = 0.85;
  }

  /**
   * Check whether the service has a valid API key configured.
   * @returns {boolean}
   */
  isConfigured() {
    return Boolean(this.apiKey);
  }

  /**
   * Set the API key at runtime (e.g. from a settings endpoint).
   * @param {string} key - Anthropic API key
   */
  setApiKey(key) {
    this.apiKey = key;
  }

  /**
   * Send a chat request to the Claude Messages API.
   *
   * @param {string} systemPrompt - The system-level instruction for Claude.
   * @param {Array<{role: string, content: string}>} messages - Prior conversation
   *   history formatted as alternating user/assistant messages.
   * @param {string} userMessage - The latest message from the user.
   * @returns {Promise<string|null>} The assistant's response text, or null on
   *   any failure so the caller can fall back to built-in responses.
   */
  async chat(systemPrompt, messages, userMessage) {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const formattedMessages = this._buildMessages(messages, userMessage);

      const body = {
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: systemPrompt,
        messages: formattedMessages,
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          `[ClaudeService] API error ${response.status}: ${errorBody}`
        );
        return null;
      }

      const data = await response.json();

      // Extract the text from the first text content block.
      if (data.content && Array.isArray(data.content)) {
        const textBlock = data.content.find((block) => block.type === 'text');
        if (textBlock) {
          return textBlock.text;
        }
      }

      console.error('[ClaudeService] Unexpected response shape:', JSON.stringify(data));
      return null;
    } catch (err) {
      console.error('[ClaudeService] Request failed:', err.message);
      return null;
    }
  }

  /**
   * Build the messages array for the API, ensuring alternating user/assistant
   * roles and appending the latest user message at the end.
   *
   * @param {Array<{role: string, content: string}>} history
   * @param {string} userMessage
   * @returns {Array<{role: string, content: string}>}
   * @private
   */
  _buildMessages(history, userMessage) {
    const formatted = [];

    if (Array.isArray(history)) {
      for (const msg of history) {
        const role = msg.role === 'assistant' ? 'assistant' : 'user';
        // Avoid consecutive messages with the same role.
        if (formatted.length > 0 && formatted[formatted.length - 1].role === role) {
          // Merge into the previous message to keep alternation valid.
          formatted[formatted.length - 1].content += '\n' + msg.content;
        } else {
          formatted.push({ role, content: msg.content });
        }
      }
    }

    // Append the new user message.
    if (formatted.length > 0 && formatted[formatted.length - 1].role === 'user') {
      formatted[formatted.length - 1].content += '\n' + userMessage;
    } else {
      formatted.push({ role: 'user', content: userMessage });
    }

    return formatted;
  }
}

module.exports = ClaudeService;
