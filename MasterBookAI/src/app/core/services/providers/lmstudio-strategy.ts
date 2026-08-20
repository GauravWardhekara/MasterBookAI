import { OpenAIStrategy } from './openai-strategy';
import { ConnectionProfile } from '../../models/connection-profile.model';
import { CompletionOptions, StreamChunk, LLMMessage } from '../llm-provider.service';

export class LMStudioStrategy extends OpenAIStrategy {
  override async complete(url: string, conn: ConnectionProfile, options: CompletionOptions, messages: LLMMessage[], signal: AbortSignal): Promise<string> {
    const base = this.removeTrailingSlash(url);
    const endpoint = base.endsWith('/api') ? `${base}/v1/chat` : `${base}/v1/chat/completions`;
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
      throw new Error(`LM Studio Error ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  override async *stream(url: string, conn: ConnectionProfile, options: CompletionOptions, messages: LLMMessage[], signal: AbortSignal): AsyncGenerator<StreamChunk> {
    const base = this.removeTrailingSlash(url);
    const endpoint = base.endsWith('/api') ? `${base}/v1/chat` : `${base}/v1/chat/completions`;
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
      throw new Error(`LM Studio Error ${response.status}: ${errorText || response.statusText}`);
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
}
