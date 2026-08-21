import { BaseModel } from './base.model';
import { SamplingOverrides } from './character.model';

/**
 * A chat or story session.
 */
export interface ChatSession extends BaseModel {
  scenarioId: string;
  personaId: string;
  activeCharacterIds: string[];
  mode: 'chat' | 'story';
  messages: Message[];
  linkedMemoryIds: string[];

  // Gallery metadata
  title: string;
  summary?: string;
  thumbnailImage?: string;            // manually uploaded
  isFavorite: boolean;
  tags: string[];

  // Active configuration for this session
  activeModel?: string;
  activePresetId?: string;
  activeSystemPrompt?: string;
  activeSamplingOverrides?: SamplingOverrides;
}

/**
 * A single message within a chat session.
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'narrator';
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  generatedImageRefs: string[];
  isPinnedAsMemory: boolean;
  tokenCount: number;
}

/**
 * A memory extracted from chat.
 */
export interface Memory extends BaseModel {
  source: 'auto' | 'manual';
  summaryText: string;
  embeddingVector?: number[];
  linkedMessageIds: string[];
  importanceScore: number;
  linkedScenarioId?: string;
  linkedChatSessionId?: string;
  decayFactor: number;
}

/**
 * Create a default ChatSession.
 */
export function createDefaultChatSession(scenarioId: string, personaId: string): Partial<ChatSession> {
  return {
    scenarioId,
    personaId,
    activeCharacterIds: [],
    mode: 'chat',
    messages: [],
    linkedMemoryIds: [],
    title: 'New Chat',
    isFavorite: false,
    tags: [],
  };
}
