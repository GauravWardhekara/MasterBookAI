import { ConnectionProfile } from '../../models/connection-profile.model';
import { CompletionOptions, StreamChunk, LLMMessage } from '../llm-provider.service';

export interface LLMStrategy {
  complete(url: string, conn: ConnectionProfile, options: CompletionOptions, messages: LLMMessage[], signal: AbortSignal): Promise<string>;
  stream(url: string, conn: ConnectionProfile, options: CompletionOptions, messages: LLMMessage[], signal: AbortSignal): AsyncGenerator<StreamChunk>;
}

export abstract class BaseSSEStrategy implements LLMStrategy {
  abstract complete(url: string, conn: ConnectionProfile, options: CompletionOptions, messages: LLMMessage[], signal: AbortSignal): Promise<string>;
  abstract stream(url: string, conn: ConnectionProfile, options: CompletionOptions, messages: LLMMessage[], signal: AbortSignal): AsyncGenerator<StreamChunk>;

  protected async *parseSSE(reader: ReadableStreamDefaultReader<Uint8Array>, lineParser: (line: string) => StreamChunk | null | 'skip' | 'stop'): AsyncGenerator<StreamChunk> {
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
          const trimmed = line.trim();
          if (!trimmed) continue;

          const result = lineParser(trimmed);
          if (result === 'stop') return;
          if (result === 'skip' || !result) continue;
          
          yield result;
          if (result.done) return;
        }
      }
      yield { content: '', done: true, finishReason: 'stop' };
    } finally {
      reader.releaseLock();
    }
  }

  protected removeTrailingSlash(url: string) {
    return url.replace(/\/+$/, '');
  }
}
