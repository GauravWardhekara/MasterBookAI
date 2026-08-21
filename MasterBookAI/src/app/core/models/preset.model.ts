import { BaseModel } from './base.model';
import { SamplingOverrides } from './character.model';

export interface Preset extends BaseModel {
  name: string;
  description: string;
  isAuthorPreset?: boolean;       // Determines if it goes into the "Author's" tab or "Mine" tab
  model?: string;                 // e.g. "Gemini 2.5 Pro", "sao10k_-_l3-8b-stheno-v3.2"
  systemPrompt?: string;          // The raw text of the system prompt
  parameters: SamplingOverrides;
}

export function createDefaultPreset(name: string = 'New Preset'): Partial<Preset> {
  return {
    name,
    description: '',
    isAuthorPreset: false,
    parameters: {
      temperature: 0.7,
      topP: 1.0,
      topK: 40,
      repetitionPenalty: 1.0,
      maxTokens: 300,
      minP: 0.05,
    }
  };
}
