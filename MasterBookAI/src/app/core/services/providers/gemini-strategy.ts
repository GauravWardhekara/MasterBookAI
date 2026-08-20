import { ConnectionProfile } from '../../models/connection-profile.model';
import { CompletionOptions, StreamChunk, LLMMessage } from '../llm-provider.service';
import { BaseSSEStrategy } from './llm-strategy.interface';

export class GeminiStrategy extends BaseSSEStrategy {
  async complete(url: string, conn: ConnectionProfile, options: CompletionOptions, messages: LLMMessage[], signal: AbortSignal): Promise<string> {
    const model = options.model || conn.modelList[0] || 'gemini-1.5-pro';
    const endpoint = `${this.removeTrailingSlash(url)}/v1beta/models/${model}:generateContent?key=${conn.apiKey}`;
    const body = this.buildRequestBody(messages, conn, options);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Gemini Error ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async *stream(url: string, conn: ConnectionProfile, options: CompletionOptions, messages: LLMMessage[], signal: AbortSignal): AsyncGenerator<StreamChunk> {
    const model = options.model || conn.modelList[0] || 'gemini-1.5-pro';
    const endpoint = `${this.removeTrailingSlash(url)}/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${conn.apiKey}`;
    const body = this.buildRequestBody(messages, conn, options);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Gemini Error ${response.status}: ${errorText || response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    yield* this.parseSSE(reader, (line) => {
      if (!line.startsWith('data: ')) return 'skip';
      const dataStr = line.slice(6);
      
      try {
        const parsed = JSON.parse(dataStr);
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        const finishReason = parsed.candidates?.[0]?.finishReason;
        
        if (text) {
          return { content: text, done: false };
        } else if (finishReason) {
           return { content: '', done: true, finishReason };
        }
      } catch {}
      return 'skip';
    });
  }

  private buildRequestBody(messages: LLMMessage[], conn: ConnectionProfile, options: CompletionOptions): Record<string, any> {
    const contents: any[] = [];
    let systemInstruction: any = undefined;

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = { parts: [{ text: msg.content }] };
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }

    return {
      system_instruction: systemInstruction,
      contents,
      generationConfig: {
        temperature: options.temperature ?? conn.defaultSampling?.temperature,
        maxOutputTokens: options.maxTokens ?? conn.defaultSampling?.maxTokens,
        topP: options.topP ?? conn.defaultSampling?.topP,
        topK: options.topK ?? conn.defaultSampling?.topK,
        stopSequences: options.stop,
      }
    };
  }
}
