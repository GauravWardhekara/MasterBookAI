/**
 * Memory — extracted important events for long-term coherence
 */
export interface Memory {
  id: string;
  source: 'auto' | 'manual';
  summary: string;
  fullText?: string;
  embedding?: number[]; // vector embedding for semantic search
  linkedMessageIds: string[];
  linkedCharacterIds: string[];
  linkedScenarioId?: string;
  linkedChatSessionId?: string;
  importanceScore: number; // 0-1
  lastRetrievedAt?: Date;
  retrievalCount: number;
  createdAt: Date;
  updatedAt: Date;
}
