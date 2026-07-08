/**
 * ConnectionProfile — LLM backend configuration
 * Supports local (Ollama, LM Studio, etc.) and cloud (OpenAI, Anthropic, etc.) endpoints
 */
export interface ConnectionProfile {
  id: string;
  name: string;
  type: 'local' | 'cloud';
  provider: 'openai-compatible' | 'anthropic' | 'google-gemini' | 'custom';
  endpointUrl: string;
  apiKey?: string; // encrypted at rest
  modelId: string;
  modelList?: string[]; // cached from listModels()
  contextSize: number;
  streaming: boolean;
  samplingParams: SamplingParams;
  promptTemplate: PromptTemplate;
  createdAt: Date;
  updatedAt: Date;
}

export interface SamplingParams {
  temperature: number;
  topP: number;
  topK: number;
  repetitionPenalty: number;
  maxTokens: number;
}

export type PromptTemplate = 'alpaca' | 'chatml' | 'llama3' | 'mistral' | 'raw';

export const DEFAULT_SAMPLING_PARAMS: SamplingParams = {
  temperature: 0.8,
  topP: 0.9,
  topK: 40,
  repetitionPenalty: 1.1,
  maxTokens: 2048,
};
