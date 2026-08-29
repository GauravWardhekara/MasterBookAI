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
import { HuggingFaceStrategy } from './providers/huggingface-strategy';
import { OpenRouterStrategy } from './providers/openrouter-strategy';
import { NanoGptStrategy } from './providers/nanogpt-strategy';

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  repetitionPenalty?: number;
  minP?: number;
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
    openrouter: new OpenRouterStrategy(),
    nanogpt: new NanoGptStrategy(),
    literouter: new OpenAIStrategy(),
    featherless: new OpenAIStrategy(),
    deepinfra: new OpenAIStrategy(),
    togetherai: new OpenAIStrategy(),
    groq: new OpenAIStrategy(),
    wavespeed: new OpenAIStrategy(),
    ofox: new OpenAIStrategy(),
    aimlapi: new OpenAIStrategy(),
    vllm: new OpenAIStrategy(), // vLLM is OpenAI compatible
    custom: new OpenAIStrategy(),
    anthropic: new AnthropicStrategy(),
    lmstudio: new LMStudioStrategy(),
    ollama: new OllamaStrategy(),
    gemini: new GeminiStrategy(),
    huggingface: new HuggingFaceStrategy(),
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
    try {
      yield* strategy.stream(conn.endpointUrl, conn, options, messages, this.abortController.signal);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream manually aborted.');
        yield { content: '', done: true, finishReason: 'abort' };
      } else {
        console.error('Stream error:', err);
        // Error recovery: we yield what we can, then terminate.
        // The UI will keep what was successfully streamed before the crash.
        yield { content: `\n\n[Connection Error: ${err.message}]`, done: true, finishReason: 'error' };
      }
    }
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = undefined;
    }
  }

  convertMessages(messages: Message[], systemPrompt: string, template: PromptTemplate): LLMMessage[] {
    const rawMessages: { role: string; content: string }[] = [];
    if (systemPrompt) {
      rawMessages.push({ role: 'system', content: systemPrompt });
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
      if (msg.senderName && msg.role !== 'system' && msg.role !== 'user') {
        content = `[${msg.senderName}]: ${content}`;
      }
      rawMessages.push({ role, content });
    }

    // Apply instruct template formatting if requested (squashes into a single string)
    // Most standard API endpoints (OpenAI /v1/chat/completions) expect the raw objects and handle formatting themselves.
    // We only apply this if the user specifically requests a forced format over a raw string.
    
    if (template === 'chatml') {
      let formatted = '';
      for (const m of rawMessages) {
        formatted += `<|im_start|>${m.role}\n${m.content}<|im_end|>\n`;
      }
      formatted += `<|im_start|>assistant\n`;
      return [{ role: 'user', content: formatted }];
    } 
    else if (template === 'alpaca') {
      let formatted = '';
      for (const m of rawMessages) {
        if (m.role === 'system') formatted += `${m.content}\n\n`;
        else if (m.role === 'user') formatted += `### Instruction:\n${m.content}\n\n`;
        else if (m.role === 'assistant') formatted += `### Response:\n${m.content}\n\n`;
      }
      formatted += `### Response:\n`;
      return [{ role: 'user', content: formatted }];
    }
    else if (template === 'llama3') {
      let formatted = `<|begin_of_text|>`;
      for (const m of rawMessages) {
        formatted += `<|start_header_id|>${m.role}<|end_header_id|>\n\n${m.content}<|eot_id|>`;
      }
      formatted += `<|start_header_id|>assistant<|end_header_id|>\n\n`;
      return [{ role: 'user', content: formatted }];
    }

    // Default: return standard array of objects for Chat endpoints
    return rawMessages as LLMMessage[];
  }
}
