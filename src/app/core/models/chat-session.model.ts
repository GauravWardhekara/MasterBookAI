import { Character } from './character.model';
import { Persona } from './persona.model';

export type ChatMode = 'chat' | 'story';
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * ChatSession — a single conversation thread
 */
export interface ChatSession {
  id: string;
  title: string;
  scenarioId?: string;
  personaId?: string;
  activeCharacterIds: string[];
  messages: ChatMessage[];
  mode: ChatMode;
  connectionProfileId: string;
  linkedMemoryIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ChatMessage — individual message within a session
 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  senderId?: string; // characterId or personaId
  senderName: string;
  content: string;
  timestamp: Date;
  imageRefs?: string[]; // generated image attachments
  isPinnedMemory: boolean;
  tokenCount?: number;
  isStreaming?: boolean;
  isError?: boolean;
}

/**
 * Story-specific state (when mode === 'story')
 */
export interface StoryState {
  pov: 'first-person' | 'third-person';
  tense: 'present' | 'past';
  authorNote?: string; // pinned near end of context
  narrativeBuffer: string; // continuous prose buffer
}
