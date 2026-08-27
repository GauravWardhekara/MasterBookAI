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

  // Story statistics (Dungeo-ai /stats)
  stats?: StoryStats;

  // Save slots for checkpoints (Dungeo-ai /save /load)
  saveSlots?: SaveSlot[];
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

  // Swipe alternates (SillyTavern feature)
  alternates?: string[];
  activeAlternateIndex?: number;

  // Action classification (Dungeo-ai adventure mode)
  actionType?: 'direction' | 'action' | 'dialogue' | 'continue';
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
 * A named save slot / checkpoint within a story session.
 * Inspired by Dungeo-ai's /save and /load commands.
 */
export interface SaveSlot {
  name: string;
  messagesSnapshot: Message[];
  savedAt: string;
  wordCount: number;
}

/**
 * Statistics tracked per story session.
 * Inspired by Dungeo-ai's /stats command.
 */
export interface StoryStats {
  totalWords: number;
  totalTurns: number;
  aiWords: number;
  userDirections: number;
  playTimeMinutes: number;
  startedAt: string;
  lastPlayedAt: string;
  genre?: string;
  role?: string;
  undoCount: number;
  regenCount: number;
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
