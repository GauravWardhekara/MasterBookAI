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
