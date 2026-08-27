import { Character } from './character.model';
import { Persona } from './character.model';
import { Lorebook } from './lorebook.model';
import { Memory } from './chat-session.model';
import { ChatSession } from './chat-session.model';
import { Scenario } from './scenario.model';

/**
 * Self-contained export format for saving chats/stories to local files.
 * Uses .json extension with a distinctive formatVersion for identification.
 */
export interface ChatExportFile {
  formatVersion: '1.0';
  formatIdentifier: 'masterbookai-export';
  exportedAt: string;
  appVersion: string;

  type: 'chat' | 'story';
  session: ChatSession;

  // Embedded data (self-contained)
  scenario: Scenario;
  characters: Character[];
  persona: Persona;
  lorebooks: Lorebook[];
  memories: Memory[];

  // Image data (base64 or references)
  images: Record<string, string>;     // imageId → base64 data URI
}

/**
 * SillyTavern World Info import format (for compatibility).
 */
export interface SillyTavernWorldInfo {
  entries: Record<string, SillyTavernWIEntry>;
}

export interface SillyTavernWIEntry {
  uid: number;
  key: string[];
  keysecondary: string[];
  comment: string;
  content: string;
  constant: boolean;
  selective: boolean;
  selectiveLogic: number;
  addMemo: boolean;
  order: number;
  position: number;
  disable: boolean;
  excludeRecursion: boolean;
  probability: number;
  depth: number;
  group: string;
  scanDepth?: number;
  caseSensitive?: boolean;
  matchWholeWords?: boolean;
  automationId?: string;
  role?: number;
  vectorized?: boolean;
}

/**
 * SillyTavern V2 Character Card format.
 */
export interface SillyTavernV2Character {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes: string;
  system_prompt: string;
  post_history_instructions: string;
  tags: string[];
  creator: string;
  character_version: string;
  alternate_greetings: string[];
  extensions: Record<string, any>;
  character_book?: {
    name?: string;
    description?: string;
    entries: SillyTavernWIEntry[];
  };
}

/**
 * Root structure inside a SillyTavern V2 character card PNG.
 */
export interface SillyTavernV2Data {
  spec: 'chara_card_v2';
  spec_version: '2.0';
  data: SillyTavernV2Character;
}
