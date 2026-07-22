import { BaseModel } from './base.model';

/**
 * A Character represents an AI-controlled or player-controlled entity in a scenario.
 */
export interface Character extends BaseModel {
  name: string;
  avatar?: string;                    // base64 data URI or file path
  description: string;                // physical appearance, background
  personality: string;                // personality traits, demeanor
  speechStyle: string;                // how the character talks
  greetingMessages: string[];         // possible opening messages
  exampleDialogues: string[];         // sample conversations for AI context
  tags: string[];                     // organizational tags
  isPlayable: boolean;                // true = user controls this character
  samplingOverrides?: SamplingOverrides;
  linkedLoreEntryIds: string[];       // cross-ref to lore entries about this character
}

/**
 * A Persona represents the user's own identity in chat.
 */
export interface Persona extends BaseModel {
  name: string;
  description: string;
  avatar?: string;                    // base64 data URI or file path
  isDefault: boolean;
}

/**
 * Per-character or per-scenario sampling parameter overrides.
 */
export interface SamplingOverrides {
  temperature?: number;
  topP?: number;
  topK?: number;
  repetitionPenalty?: number;
  maxTokens?: number;
}

/**
 * Create a default Character with empty fields.
 */
export function createDefaultCharacter(): Partial<Character> {
  return {
    name: '',
    description: '',
    personality: '',
    speechStyle: '',
    greetingMessages: [''],
    exampleDialogues: [],
    tags: [],
    isPlayable: false,
    linkedLoreEntryIds: [],
  };
}

/**
 * Create a default Persona.
 */
export function createDefaultPersona(): Partial<Persona> {
  return {
    name: 'User',
    description: '',
    isDefault: true,
  };
}
