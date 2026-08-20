import { ConnectionProfile } from '../../models/connection-profile.model';
import { CompletionOptions, StreamChunk, LLMMessage } from '../llm-provider.service';
import { BaseSSEStrategy } from './llm-strategy.interface';
import { OpenAIStrategy } from './openai-strategy';

export class OllamaStrategy extends BaseSSEStrategy {
  private fallbackOpenAI = new OpenAIStrategy();

  async complete(url: string, conn: ConnectionProfile, options: CompletionOptions, messages: LLMMessage[], signal: AbortSignal): Promise<string> {
    if (url.includes('v1')) {
       return this.fallbackOpenAI.complete(url, conn, options, messages, signal);
    }
    const endpoint = `${this.removeTrailingSlash(url)}/api/chat`;
    const body = this.buildRequestBody(messages, conn, { ...options, stream: false });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Ollama Error ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return data.message?.content || '';
  }

  async *stream(url: string, conn: ConnectionProfile, options: CompletionOptions, messages: LLMMessage[], signal: AbortSignal): AsyncGenerator<StreamChunk> {
    if (url.includes('v1')) {
       yield* this.fallbackOpenAI.stream(url, conn, options, messages, signal);
       return;
    }
    const endpoint = `${this.removeTrailingSlash(url)}/api/chat`;
    const body = this.buildRequestBody(messages, conn, { ...options, stream: true });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Ollama Error ${response.status}: ${errorText || response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
           if (!line.trim()) continue;
           try {
             const parsed = JSON.parse(line);
             if (parsed.message?.content) {
               yield { content: parsed.message.content, done: false };
             }
             if (parsed.done) {
               yield { content: '', done: true, finishReason: 'stop' };
               return;
             }
           } catch {}
        }
      }
      yield { content: '', done: true, finishReason: 'stop' };
    } finally {
      reader.releaseLock();
    }
  }

  private buildRequestBody(messages: LLMMessage[], conn: ConnectionProfile, options: CompletionOptions): Record<string, any> {
    const sampling = conn.defaultSampling || {};
    return {
      model: options.model || conn.modelList[0] || 'default',
      messages: messages,
      stream: options.stream ?? conn.streamingEnabled ?? true,
      options: {
        temperature: options.temperature ?? sampling.temperature ?? 0.7,
        top_p: options.topP ?? sampling.topP,
        top_k: options.topK ?? sampling.topK,
        stop: options.stop,
        num_predict: options.maxTokens ?? sampling.maxTokens ?? 512,
        repeat_penalty: options.repetitionPenalty ?? sampling.repetitionPenalty
      }
    };
  }
}
