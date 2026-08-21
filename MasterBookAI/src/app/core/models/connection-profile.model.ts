import { BaseModel } from './base.model';
import { SamplingOverrides } from './character.model';

export type LLMProvider = 'openai' | 'anthropic' | 'ollama' | 'lmstudio' | 'vllm' | 'gemini' | 'huggingface' | 'custom';

/**
 * Connection profile for an LLM backend.
 */
export interface ConnectionProfile extends BaseModel {
  name: string;
  type: 'local' | 'cloud';
  provider: LLMProvider;
  endpointUrl: string;
  authMethod: 'none' | 'api-key' | 'bearer-token';
  apiKey?: string;                    // stored encrypted via secure storage
  modelList: string[];                // available models at this endpoint
  contextSize: number;
  defaultSampling: SamplingOverrides;
  streamingEnabled: boolean;
  promptTemplate: PromptTemplate;
  isDefault: boolean;
}

/**
 * Prompt template formats for different model architectures.
 */
export type PromptTemplate = 'chatml' | 'alpaca' | 'llama3' | 'mistral' | 'raw' | 'custom';

/**
 * Image generation configuration.
 */
export interface ImageGenConfig extends BaseModel {
  providerType: 'openai' | 'stability' | 'comfyui' | 'a1111' | 'copy-tags';
  endpointUrl?: string;
  modelOrCheckpoint?: string;
  stylePresets: string[];
  negativePromptDefaults: string;
  isDefault: boolean;
}

/**
 * Create a default ConnectionProfile.
 */
export function createDefaultConnectionProfile(): Partial<ConnectionProfile> {
  return {
    name: '',
    type: 'local',
    provider: 'openai',
    endpointUrl: 'http://localhost:11434',
    authMethod: 'none',
    modelList: [],
    contextSize: 4096,
    defaultSampling: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      repetitionPenalty: 1.1,
      maxTokens: 512,
    },
    streamingEnabled: true,
    promptTemplate: 'chatml',
    isDefault: false,
  };
}
