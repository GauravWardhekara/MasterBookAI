import { ConnectionProfile } from '../../models/connection-profile.model';
import { CompletionOptions, StreamChunk, LLMMessage } from '../llm-provider.service';
import { BaseSSEStrategy } from './llm-strategy.interface';

export class OpenAIStrategy extends BaseSSEStrategy {
  async complete(url: string, conn: ConnectionProfile, options: CompletionOptions, messages: LLMMessage[], signal: AbortSignal): Promise<string> {
    const endpoint = `${this.removeTrailingSlash(url)}/v1/chat/completions`;
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
      throw new Error(`OpenAI Error ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async *stream(url: string, conn: ConnectionProfile, options: CompletionOptions, messages: LLMMessage[], signal: AbortSignal): AsyncGenerator<StreamChunk> {
    const endpoint = `${this.removeTrailingSlash(url)}/v1/chat/completions`;
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
      throw new Error(`OpenAI Error ${response.status}: ${errorText || response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    yield* this.parseSSE(reader, (line) => {
      if (!line.startsWith('data: ')) return 'skip';
      const dataStr = line.slice(6);
      if (dataStr === '[DONE]') return 'stop';
      
      try {
        const parsed = JSON.parse(dataStr);
        const delta = parsed.choices?.[0]?.delta;
        const finishReason = parsed.choices?.[0]?.finish_reason;

        if (delta?.content) return { content: delta.content, done: false };
        if (finishReason) return { content: '', done: true, finishReason };
      } catch {}
      return 'skip';
    });
  }

  protected buildHeaders(conn: ConnectionProfile): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if ((conn.authMethod === 'api-key' || conn.authMethod === 'bearer-token') && conn.apiKey) {
      headers['Authorization'] = `Bearer ${conn.apiKey}`;
    }
    return headers;
  }

  protected buildRequestBody(messages: LLMMessage[], conn: ConnectionProfile, options: CompletionOptions): Record<string, any> {
    const sampling = conn.defaultSampling || {};
    const body: Record<string, any> = {
      model: options.model || conn.modelList[0] || 'default',
      messages,
      temperature: options.temperature ?? sampling.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? sampling.maxTokens ?? 512,
      stream: options.stream ?? conn.streamingEnabled ?? true,
    };

    if (options.topP ?? sampling.topP) body['top_p'] = options.topP ?? sampling.topP;
    if (options.repetitionPenalty ?? sampling.repetitionPenalty) {
      body['frequency_penalty'] = ((options.repetitionPenalty ?? sampling.repetitionPenalty ?? 1.0) - 1.0);
    }
    if (options.stop) body['stop'] = options.stop;

    return body;
  }
}
