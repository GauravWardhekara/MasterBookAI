import { Injectable } from '@angular/core';
import { ConnectionService } from './connection.service';
import { ConnectionProfile, PromptTemplate, LLMProvider } from '../models/connection-profile.model';
import { Message } from '../models/chat-session.model';
import { LLMStrategy } from './providers/llm-strategy.interface';
import { OpenAIStrategy } from './providers/openai-strategy';
import { AnthropicStrategy } from './providers/anthropic-strategy';
import { LMStudioStrategy } from './providers/lmstudio-strategy';
import { OllamaStrategy } from './providers/ollama-strategy';
import { GeminiStrategy } from './providers/gemini-strategy';

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

export interface StreamChunk {
  content: string;
  done: boolean;
  finishReason?: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable({ providedIn: 'root' })
export class LLMProviderService {
  private abortController?: AbortController;
  private strategies: Record<string, LLMStrategy> = {
    openai: new OpenAIStrategy(),
    vllm: new OpenAIStrategy(), // vLLM is OpenAI compatible
    custom: new OpenAIStrategy(),
    anthropic: new AnthropicStrategy(),
    lmstudio: new LMStudioStrategy(),
    ollama: new OllamaStrategy(),
    gemini: new GeminiStrategy(),
  };

  constructor(private connectionService: ConnectionService) {}

  private getStrategy(provider: LLMProvider): LLMStrategy {
    return this.strategies[provider as string] || this.strategies['openai'];
  }

  async complete(messages: LLMMessage[], options: CompletionOptions = {}, profile?: ConnectionProfile): Promise<string> {
    const conn = profile || await this.connectionService.getDefaultProfile();
    if (!conn) throw new Error('No LLM connection profile configured. Go to Settings → Connections to add one.');

    this.abortController = new AbortController();
    const strategy = this.getStrategy(conn.provider);
    return strategy.complete(conn.endpointUrl, conn, options, messages, this.abortController.signal);
  }

  async *stream(messages: LLMMessage[], options: CompletionOptions = {}, profile?: ConnectionProfile): AsyncGenerator<StreamChunk> {
    const conn = profile || await this.connectionService.getDefaultProfile();
    if (!conn) throw new Error('No LLM connection profile configured. Go to Settings → Connections to add one.');

    this.abort();
    this.abortController = new AbortController();
    
    const strategy = this.getStrategy(conn.provider);
    yield* strategy.stream(conn.endpointUrl, conn, options, messages, this.abortController.signal);
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = undefined;
    }
  }

  convertMessages(messages: Message[], systemPrompt: string, template: PromptTemplate): LLMMessage[] {
    const llmMessages: LLMMessage[] = [];
    if (systemPrompt) {
      llmMessages.push({ role: 'system', content: systemPrompt });
    }
    for (const msg of messages) {
      let role: 'user' | 'assistant' | 'system';
      switch (msg.role) {
        case 'user': role = 'user'; break;
        case 'assistant': role = 'assistant'; break;
        case 'system':
        case 'narrator': role = 'system'; break;
        default: role = 'user';
      }
      let content = msg.content;
      if (msg.senderName && msg.role !== 'system') {
        content = `[${msg.senderName}]: ${content}`;
      }
      llmMessages.push({ role, content });
    }
    return llmMessages;
  }
}
