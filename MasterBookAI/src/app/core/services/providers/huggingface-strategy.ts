import { LLMStrategy } from './llm-strategy.interface';
import { ConnectionProfile } from '../../models/connection-profile.model';
import { LLMMessage, CompletionOptions, StreamChunk } from '../llm-provider.service';

/**
 * Strategy for the HuggingFace Inference API (Serverless).
 */
export class HuggingFaceStrategy implements LLMStrategy {

  async complete(
    endpoint: string,
    profile: ConnectionProfile,
    options: CompletionOptions,
    messages: LLMMessage[],
    signal?: AbortSignal
  ): Promise<string> {
    const url = this.buildUrl(endpoint, options.model || profile.modelList[0]);
    const headers = this.buildHeaders(profile);
    const body = this.buildBody(messages, options);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HuggingFace API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    
    // HF Inference API sometimes returns an array of objects
    if (Array.isArray(data) && data.length > 0) {
      return data[0].generated_text || '';
    }
    return data.generated_text || '';
  }

  async *stream(
    endpoint: string,
    profile: ConnectionProfile,
    options: CompletionOptions,
    messages: LLMMessage[],
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    // Note: The standard HF Inference API does not natively support true SSE streaming for all models
    // via a simple /models endpoint like OpenAI. Text Generation Inference (TGI) does.
    // We'll attempt to use the TGI compatible streaming endpoint.
    
    const url = this.buildUrl(endpoint, options.model || profile.modelList[0]);
    const headers = this.buildHeaders(profile);
    const body = this.buildBody(messages, options);
    body.stream = true;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HuggingFace API Error (${response.status}): ${errText}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported by response');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
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
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.substring(5).trim();
          if (dataStr === '[DONE]') {
            yield { content: '', done: true };
            return;
          }

          try {
            const data = JSON.parse(dataStr);
            // TGI format: data.token.text
            const text = data.token?.text || data.generated_text || '';
            if (text) {
              yield { content: text, done: false };
            }
          } catch (e) {
            console.warn('Error parsing HF stream chunk', e);
          }
        }
      }
      
      if (buffer.trim() && buffer.trim() !== 'data: [DONE]') {
         try {
             const dataStr = buffer.trim().substring(5).trim();
             const data = JSON.parse(dataStr);
             const text = data.token?.text || data.generated_text || '';
             if (text) {
               yield { content: text, done: false };
             }
         } catch(e) {}
      }
      
      yield { content: '', done: true };
    } finally {
      reader.releaseLock();
    }
  }

  private buildUrl(endpoint: string, model: string): string {
    // Default HF inference API base
    const base = endpoint || 'https://api-inference.huggingface.co/models';
    return `${base.replace(/\/+$/, '')}/${model}`;
  }

  private buildHeaders(profile: ConnectionProfile): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (profile.apiKey) {
      headers['Authorization'] = `Bearer ${profile.apiKey}`;
    }
    return headers;
  }

  private buildBody(messages: LLMMessage[], options: CompletionOptions): any {
    // Combine messages into a single prompt string since HF basic API expects 'inputs'
    const prompt = messages.map(m => {
        if (m.role === 'system') return `System: ${m.content}\n`;
        if (m.role === 'user') return `User: ${m.content}\n`;
        return `Assistant: ${m.content}\n`;
    }).join('') + 'Assistant: ';

    return {
      inputs: prompt,
      parameters: {
        max_new_tokens: options.maxTokens || 512,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        top_k: options.topK || 40,
        repetition_penalty: options.repetitionPenalty || 1.1,
        return_full_text: false,
      }
    };
  }
}
