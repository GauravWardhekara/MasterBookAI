import { BaseModel } from './base.model';

export interface RpgItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  equipped?: boolean;
}

export interface DnDStats {
  level: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  gold: number;
}

export interface CultivationStats {
  realm: string;
  stage: number;
  qi: number;
  maxQi: number;
  bodyStrength: number;
  soulStrength: number;
  daoComprehension: number;
  spiritStones: number;
}

export interface RpgData {
  dndStats?: DnDStats;
  cultivationStats?: CultivationStats;
  inventory: RpgItem[];
  needs?: {
    hunger: number;
    thirst: number;
    rest: number;
  };
  dispositions?: Record<string, number>;
}

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

  // ── SillyTavern V2 Character Card Fields ──
  creatorNotes?: string;              // notes about the character for other users
  systemPrompt?: string;              // character-specific system prompt override
  postHistoryInstructions?: string;   // injected after chat history (jailbreak position)
  firstMessage?: string;              // initial message (separate from greetingMessages)
  alternateGreetings?: string[];      // multiple greeting options (swipeable)
  characterBook?: {                   // embedded lorebook entries
    entries: EmbeddedLoreEntry[];
  };
  talkativeness?: number;             // 0-1, how often the character initiates
  creatorComment?: string;            // creator-facing comment
  extensions?: Record<string, any>;   // arbitrary extension data for interop

  // ── RPG Data ──
  rpgData?: RpgData;
}

/**
 * A Persona represents the user's own identity in chat.
 */
export interface Persona extends BaseModel {
  name: string;
  description: string;
  avatar?: string;                    // base64 data URI or file path
  isDefault: boolean;

  // ── RPG Data ──
  rpgData?: RpgData;
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
  minP?: number;
}

/**
 * A lore entry embedded within a character card (SillyTavern V2 character book).
 */
export interface EmbeddedLoreEntry {
  keys: string[];
  content: string;
  extensions?: Record<string, any>;
  enabled: boolean;
  insertionOrder: number;
  caseSensitive?: boolean;
  name?: string;
  priority?: number;
  id?: number;
  comment?: string;
  selective?: boolean;
  secondaryKeys?: string[];
  constant?: boolean;
  position?: 'before_char' | 'after_char' | 'before_example' | 'after_example';
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
    // SillyTavern V2 defaults
    alternateGreetings: [],
    talkativeness: 0.5,
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
