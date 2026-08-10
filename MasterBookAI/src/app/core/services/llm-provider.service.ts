import { Injectable } from '@angular/core';
import { ConnectionService } from './connection.service';
import { ConnectionProfile, PromptTemplate } from '../models/connection-profile.model';
import { Message } from '../models/chat-session.model';

/**
 * Options for an LLM completion request.
 */
export interface CompletionOptions {
  model?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  repetitionPenalty?: number;
  stop?: string[];
  stream?: boolean;
}

/**
 * A streamed chunk from the LLM.
 */
export interface StreamChunk {
  content: string;
  done: boolean;
  finishReason?: string;
}

/**
 * Service for communicating with LLM backends.
 * Uses the OpenAI-compatible /v1/chat/completions endpoint.
 * Supports streaming via SSE/fetch ReadableStream.
 */
@Injectable({ providedIn: 'root' })
export class LLMProviderService {
  private abortController?: AbortController;

  constructor(private connectionService: ConnectionService) {}

  /**
   * Send a completion request and receive the full response at once (non-streaming).
   */
  async complete(
    messages: LLMMessage[],
    options: CompletionOptions = {},
    profile?: ConnectionProfile
  ): Promise<string> {
    const conn = profile || await this.connectionService.getDefaultProfile();
    if (!conn) throw new Error('No LLM connection profile configured. Go to Settings → Connections to add one.');

    const url = this.normalizeUrl(conn.endpointUrl);
    const headers = this.buildHeaders(conn);
    const body = this.buildRequestBody(messages, conn, { ...options, stream: false });

    const response = await fetch(`${url}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`LLM Error ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Send a streaming completion request.
   * Yields chunks as they arrive via an async generator.
   */
  async *stream(
    messages: LLMMessage[],
    options: CompletionOptions = {},
    profile?: ConnectionProfile
  ): AsyncGenerator<StreamChunk> {
    const conn = profile || await this.connectionService.getDefaultProfile();
    if (!conn) throw new Error('No LLM connection profile configured. Go to Settings → Connections to add one.');

    // Cancel any previous ongoing stream
    this.abort();
    this.abortController = new AbortController();

    const url = this.normalizeUrl(conn.endpointUrl);
    const headers = this.buildHeaders(conn);
    const body = this.buildRequestBody(messages, conn, { ...options, stream: true });

    const response = await fetch(`${url}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`LLM Error ${response.status}: ${errorText || response.statusText}`);
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

        // Parse SSE events from the buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue; // Skip empty lines and comments

          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);

            if (data === '[DONE]') {
              yield { content: '', done: true, finishReason: 'stop' };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              const finishReason = parsed.choices?.[0]?.finish_reason;

              if (delta?.content) {
                yield { content: delta.content, done: false };
              }

              if (finishReason) {
                yield { content: '', done: true, finishReason };
                return;
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      }

      // If we exit the read loop without a [DONE], signal completion
      yield { content: '', done: true, finishReason: 'stop' };
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Abort any ongoing streaming request.
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = undefined;
    }
  }

  /**
   * Convert app Message[] to the LLM message format,
   * applying the appropriate prompt template.
   */
  convertMessages(messages: Message[], systemPrompt: string, template: PromptTemplate): LLMMessage[] {
    const llmMessages: LLMMessage[] = [];

    // System prompt always goes first
    if (systemPrompt) {
      llmMessages.push({ role: 'system', content: systemPrompt });
    }

    // Convert chat messages
    for (const msg of messages) {
      let role: 'user' | 'assistant' | 'system';
      switch (msg.role) {
        case 'user':
          role = 'user';
          break;
        case 'assistant':
          role = 'assistant';
          break;
        case 'system':
        case 'narrator':
          role = 'system';
          break;
        default:
          role = 'user';
      }

      // Include sender name for multi-character contexts
      let content = msg.content;
      if (msg.senderName && msg.role !== 'system') {
        content = `[${msg.senderName}]: ${content}`;
      }

      llmMessages.push({ role, content });
    }

    return llmMessages;
  }

  // ── Private helpers ──

  private buildHeaders(conn: ConnectionProfile): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if ((conn.authMethod === 'api-key' || conn.authMethod === 'bearer-token') && conn.apiKey) {
      headers['Authorization'] = `Bearer ${conn.apiKey}`;
    }

    return headers;
  }

  private buildRequestBody(
    messages: LLMMessage[],
    conn: ConnectionProfile,
    options: CompletionOptions
  ): Record<string, any> {
    const sampling = conn.defaultSampling || {};

    const body: Record<string, any> = {
      model: options.model || conn.modelList[0] || 'default',
      messages,
      temperature: options.temperature ?? sampling.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? sampling.maxTokens ?? 512,
      stream: options.stream ?? conn.streamingEnabled ?? true,
    };

    // Some providers support top_p
    if (options.topP ?? sampling.topP) {
      body['top_p'] = options.topP ?? sampling.topP;
    }

    // repetition_penalty (some providers call it frequency_penalty)
    if (options.repetitionPenalty ?? sampling.repetitionPenalty) {
      body['frequency_penalty'] = ((options.repetitionPenalty ?? sampling.repetitionPenalty ?? 1.0) - 1.0);
    }

    if (options.stop) {
      body['stop'] = options.stop;
    }

    return body;
  }

  private normalizeUrl(url: string): string {
    return url.replace(/\/+$/, '');
  }
}

/**
 * Message format for the LLM API (OpenAI-compatible).
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
