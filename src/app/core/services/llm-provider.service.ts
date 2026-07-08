import { Injectable } from '@angular/core';
import {
  ConnectionProfile,
  SamplingParams,
  PromptTemplate,
  DEFAULT_SAMPLING_PARAMS,
} from '../models/connection-profile.model';

export interface LLMChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMStreamEvent {
  done: boolean;
  content?: string;
  error?: string;
}

/**
 * LLM Provider Service
 * Adapter pattern supporting OpenAI-compatible, Anthropic, and Google Gemini backends.
 */
@Injectable({ providedIn: 'root' })
export class LlmProviderService {
  /**
   * Test a connection profile by fetching available models
   */
  async testConnection(profile: ConnectionProfile): Promise<{ success: boolean; models?: string[]; latencyMs: number; error?: string }> {
    const start = performance.now();
    try {
      const models = await this.listModels(profile);
      const latencyMs = Math.round(performance.now() - start);
      return { success: true, models, latencyMs };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      return { success: false, latencyMs, error: err.message || 'Connection failed' };
    }
  }

  /**
   * List available models from the endpoint
   */
  async listModels(profile: ConnectionProfile): Promise<string[]> {
    if (profile.provider === 'openai-compatible' || profile.provider === 'custom') {
      const res = await fetch(`${profile.endpointUrl}/models`, {
        headers: profile.apiKey ? { Authorization: `Bearer ${profile.apiKey}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      return (data.data || []).map((m: any) => m.id || m.name).sort();
    }
    if (profile.provider === 'anthropic') {
      // Anthropic doesn't have a public models endpoint; return known models
      return ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'];
    }
    if (profile.provider === 'google-gemini') {
      return ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'];
    }
    return [];
  }

  /**
   * Stream a chat completion
   * Returns an async generator that yields LLMStreamEvent objects
   */
  async *streamChatCompletion(
    profile: ConnectionProfile,
    messages: LLMChatMessage[],
    sampling?: Partial<SamplingParams>
  ): AsyncGenerator<LLMStreamEvent> {
    const params = { ...DEFAULT_SAMPLING_PARAMS, ...profile.samplingParams, ...sampling };

    if (profile.provider === 'openai-compatible' || profile.provider === 'custom') {
      yield* this.streamOpenAI(profile, messages, params);
    } else if (profile.provider === 'anthropic') {
      yield* this.streamAnthropic(profile, messages, params);
    } else if (profile.provider === 'google-gemini') {
      yield* this.streamGemini(profile, messages, params);
    } else {
      yield { done: true, error: 'Unknown provider' };
    }
  }

  /**
   * Non-streaming chat completion
   */
  async chatCompletion(
    profile: ConnectionProfile,
    messages: LLMChatMessage[],
    sampling?: Partial<SamplingParams>
  ): Promise<string> {
    const params = { ...DEFAULT_SAMPLING_PARAMS, ...profile.samplingParams, ...sampling };

    if (profile.provider === 'openai-compatible' || profile.provider === 'custom') {
      return this.chatOpenAI(profile, messages, params);
    } else if (profile.provider === 'anthropic') {
      return this.chatAnthropic(profile, messages, params);
    } else if (profile.provider === 'google-gemini') {
      return this.chatGemini(profile, messages, params);
    }
    throw new Error('Unknown provider');
  }

  // =================== OpenAI-compatible ===================
  private async *streamOpenAI(
    profile: ConnectionProfile,
    messages: LLMChatMessage[],
    sampling: SamplingParams
  ): AsyncGenerator<LLMStreamEvent> {
    const res = await fetch(`${profile.endpointUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(profile.apiKey ? { Authorization: `Bearer ${profile.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: profile.modelId,
        messages,
        stream: true,
        temperature: sampling.temperature,
        top_p: sampling.topP,
        max_tokens: sampling.maxTokens,
        repetition_penalty: sampling.repetitionPenalty,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      yield { done: true, error: `HTTP ${res.status}: ${text}` };
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      yield { done: true, error: 'No response body' };
      return;
    }

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
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const chunk = JSON.parse(trimmed.slice(6));
              const delta = chunk.choices?.[0]?.delta?.content;
              if (delta) {
                yield { done: false, content: delta };
              }
            } catch {
              // Ignore parse errors for malformed SSE lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { done: true };
  }

  private async chatOpenAI(profile: ConnectionProfile, messages: LLMChatMessage[], sampling: SamplingParams): Promise<string> {
    const res = await fetch(`${profile.endpointUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(profile.apiKey ? { Authorization: `Bearer ${profile.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: profile.modelId,
        messages,
        stream: false,
        temperature: sampling.temperature,
        top_p: sampling.topP,
        max_tokens: sampling.maxTokens,
        repetition_penalty: sampling.repetitionPenalty,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // =================== Anthropic ===================
  private async *streamAnthropic(
    profile: ConnectionProfile,
    messages: LLMChatMessage[],
    sampling: SamplingParams
  ): AsyncGenerator<LLMStreamEvent> {
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role,
      content: m.content,
    }));

    const res = await fetch(`${profile.endpointUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': profile.apiKey || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: profile.modelId,
        system: systemMsg?.content,
        messages: chatMessages,
        stream: true,
        max_tokens: sampling.maxTokens,
        temperature: sampling.temperature,
        top_p: sampling.topP,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      yield { done: true, error: `HTTP ${res.status}: ${text}` };
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      yield { done: true, error: 'No response body' };
      return;
    }

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
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const chunk = JSON.parse(trimmed.slice(6));
              if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
                yield { done: false, content: chunk.delta.text };
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { done: true };
  }

  private async chatAnthropic(profile: ConnectionProfile, messages: LLMChatMessage[], sampling: SamplingParams): Promise<string> {
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role,
      content: m.content,
    }));

    const res = await fetch(`${profile.endpointUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': profile.apiKey || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: profile.modelId,
        system: systemMsg?.content,
        messages: chatMessages,
        max_tokens: sampling.maxTokens,
        temperature: sampling.temperature,
        top_p: sampling.topP,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  // =================== Google Gemini ===================
  private async *streamGemini(
    profile: ConnectionProfile,
    messages: LLMChatMessage[],
    _sampling: SamplingParams
  ): AsyncGenerator<LLMStreamEvent> {
    const apiKey = profile.apiKey || '';
    const url = `${profile.endpointUrl}/models/${profile.modelId}:streamGenerateContent?key=${apiKey}`;

    const geminiMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : m.role === 'system' ? 'user' : m.role,
      parts: [{ text: m.content }],
    }));

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: geminiMessages }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      yield { done: true, error: `HTTP ${res.status}: ${text}` };
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      yield { done: true, error: 'No response body' };
      return;
    }

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
          try {
            const chunk = JSON.parse(trimmed);
            const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              yield { done: false, content: text };
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { done: true };
  }

  private async chatGemini(profile: ConnectionProfile, messages: LLMChatMessage[], _sampling: SamplingParams): Promise<string> {
    const apiKey = profile.apiKey || '';
    const url = `${profile.endpointUrl}/models/${profile.modelId}:generateContent?key=${apiKey}`;

    const geminiMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : m.role === 'system' ? 'user' : m.role,
      parts: [{ text: m.content }],
    }));

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: geminiMessages }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * Format messages according to the prompt template (for local models)
   */
  formatPrompt(messages: LLMChatMessage[], template: PromptTemplate): string {
    switch (template) {
      case 'chatml':
        return messages.map(m => `<|im_start|>${m.role}\n${m.content}<|im_end|>`).join('\n') + '\n<|im_start|>assistant\n';
      case 'llama3':
        return messages.map(m => `<|start_header_id|>${m.role}<|end_header_id|>\n${m.content}<|eot_id|>`).join('\n') + '\n<|start_header_id|>assistant<|end_header_id|>\n';
      case 'alpaca':
        return messages.map(m => {
          if (m.role === 'system') return m.content;
          if (m.role === 'user') return `### Instruction:\n${m.content}`;
          return `### Response:\n${m.content}`;
        }).join('\n\n') + '\n\n### Response:\n';
      case 'mistral':
        return messages.map(m => `[INST] ${m.content} [/INST]`).join('\n');
      case 'raw':
      default:
        return messages.map(m => `${m.role}: ${m.content}`).join('\n\n') + '\nassistant: ';
    }
  }
}
