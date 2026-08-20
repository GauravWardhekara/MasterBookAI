import { ConnectionProfile } from '../../models/connection-profile.model';
import { CompletionOptions, StreamChunk, LLMMessage } from '../llm-provider.service';
import { BaseSSEStrategy } from './llm-strategy.interface';

export class AnthropicStrategy extends BaseSSEStrategy {
  async complete(url: string, conn: ConnectionProfile, options: CompletionOptions, messages: LLMMessage[], signal: AbortSignal): Promise<string> {
    const endpoint = `${this.removeTrailingSlash(url)}/v1/messages`;
    const body = this.buildRequestBody(messages, conn, { ...options, stream: false });
    const headers = this.buildHeaders(conn);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Anthropic Error ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  async *stream(url: string, conn: ConnectionProfile, options: CompletionOptions, messages: LLMMessage[], signal: AbortSignal): AsyncGenerator<StreamChunk> {
    const endpoint = `${this.removeTrailingSlash(url)}/v1/messages`;
    const body = this.buildRequestBody(messages, conn, { ...options, stream: true });
    const headers = this.buildHeaders(conn);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Anthropic Error ${response.status}: ${errorText || response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    yield* this.parseSSE(reader, (line) => {
      if (line.startsWith('event: ')) return 'skip';
      if (!line.startsWith('data: ')) return 'skip';
      
      const dataStr = line.slice(6);
      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
          return { content: parsed.delta.text, done: false };
        } else if (parsed.type === 'message_stop') {
          return 'stop';
        }
      } catch {}
      return 'skip';
    });
  }

  private buildHeaders(conn: ConnectionProfile): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (conn.apiKey) headers['x-api-key'] = conn.apiKey;
    headers['anthropic-version'] = '2023-06-01';
    return headers;
  }

  private buildRequestBody(messages: LLMMessage[], conn: ConnectionProfile, options: CompletionOptions): Record<string, any> {
    const sampling = conn.defaultSampling || {};
    const model = options.model || conn.modelList[0] || 'default';
    
    const systemMessages = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
    const chatMessages = messages.filter(m => m.role !== 'system');
      
    const req: Record<string, any> = {
      model: model,
      messages: chatMessages,
      temperature: options.temperature ?? sampling.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? sampling.maxTokens ?? 1024,
      stream: options.stream ?? conn.streamingEnabled ?? true,
    };

    if (systemMessages) req['system'] = systemMessages;
    if (options.topP ?? sampling.topP) req['top_p'] = options.topP ?? sampling.topP;
    if (options.topK ?? sampling.topK) req['top_k'] = options.topK ?? sampling.topK;
    if (options.stop) req['stop_sequences'] = options.stop;
      
    return req;
  }
}
