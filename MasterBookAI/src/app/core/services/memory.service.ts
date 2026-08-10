import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { LLMProviderService } from './llm-provider.service';
import { ConnectionService } from './connection.service';
import { Memory, Message } from '../models/chat-session.model';
import { generateId, now } from '../models/base.model';

/**
 * Service for the Memory Engine — automatic and manual memory management,
 * embedding-based semantic search, and importance/decay scoring.
 *
 * Memories are facts/events extracted from chat sessions that persist
 * across conversations and are injected into prompts via RAG-style retrieval.
 */
@Injectable({ providedIn: 'root' })
export class MemoryService {
  /** Embedding dimension for the lightweight local embeddings */
  private readonly EMBED_DIM = 128;

  constructor(
    private db: DatabaseService,
    private llmProvider: LLMProviderService,
    private connectionService: ConnectionService,
  ) {}

  // ── CRUD ──

  async getAllMemories(): Promise<Memory[]> {
    return this.db.memories.orderBy('updatedAt').reverse().toArray();
  }

  async getMemory(id: string): Promise<Memory | undefined> {
    return this.db.memories.get(id);
  }

  async getMemoriesBySession(sessionId: string): Promise<Memory[]> {
    return this.db.memories
      .where('linkedChatSessionId')
      .equals(sessionId)
      .toArray();
  }

  async getMemoriesByScenario(scenarioId: string): Promise<Memory[]> {
    return this.db.memories
      .where('linkedScenarioId')
      .equals(scenarioId)
      .toArray();
  }

  async createMemory(data: Partial<Memory>): Promise<Memory> {
    const memory: Memory = {
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
      source: data.source || 'manual',
      summaryText: data.summaryText || '',
      embeddingVector: data.embeddingVector,
      linkedMessageIds: data.linkedMessageIds || [],
      importanceScore: data.importanceScore ?? 0.5,
      linkedScenarioId: data.linkedScenarioId,
      linkedChatSessionId: data.linkedChatSessionId,
      decayFactor: data.decayFactor ?? 1.0,
    };

    // Generate embedding if not provided
    if (!memory.embeddingVector && memory.summaryText.trim()) {
      memory.embeddingVector = this.generateLocalEmbedding(memory.summaryText);
    }

    await this.db.memories.add(memory);
    return memory;
  }

  async updateMemory(id: string, data: Partial<Memory>): Promise<void> {
    // Re-embed if text changed
    if (data.summaryText !== undefined) {
      data.embeddingVector = this.generateLocalEmbedding(data.summaryText);
    }
    await this.db.memories.update(id, { ...data, updatedAt: now() });
  }

  async deleteMemory(id: string): Promise<void> {
    await this.db.memories.delete(id);
  }

  async deleteMemoriesBySession(sessionId: string): Promise<void> {
    await this.db.memories
      .where('linkedChatSessionId')
      .equals(sessionId)
      .delete();
  }

  // ── MANUAL PIN FROM MESSAGE ──

  /**
   * Pin a specific message as a memory entry.
   * The user can optionally edit the summary before saving.
   */
  async pinMessageAsMemory(
    message: Message,
    sessionId: string,
    scenarioId: string,
    summaryOverride?: string
  ): Promise<Memory> {
    const summaryText = summaryOverride || message.content;

    return this.createMemory({
      source: 'manual',
      summaryText,
      linkedMessageIds: [message.id],
      linkedChatSessionId: sessionId,
      linkedScenarioId: scenarioId,
      importanceScore: 0.8, // Manual pins are considered high-importance
      decayFactor: 1.0,
    });
  }

  // ── AUTO-EXTRACTION ──

  /**
   * Automatically extract important events/facts from the last N messages
   * using the connected LLM. Returns the newly created memories.
   */
  async autoExtractMemories(
    messages: Message[],
    sessionId: string,
    scenarioId: string,
    messageWindow: number = 10
  ): Promise<Memory[]> {
    const conn = await this.connectionService.getDefaultProfile();
    if (!conn) return [];

    const recentMessages = messages.slice(-messageWindow);
    if (recentMessages.length < 3) return []; // Too few messages to extract from

    const chatContent = recentMessages
      .map(m => `[${m.senderName}]: ${m.content}`)
      .join('\n');

    const extractionPrompt = `Analyze the following conversation and extract the most important events, facts, and character developments. Return each as a separate memory entry.

Rules:
- Extract only genuinely important or plot-significant information
- Each memory should be a concise 1-2 sentence summary
- Include character names when relevant
- Focus on: key plot events, character revelations, relationship changes, important decisions, world-building facts
- Return between 0-5 memories (fewer is fine if nothing noteworthy happened)
- Format: Return ONLY a JSON array of strings, each being a memory summary
- If nothing important happened, return an empty array: []

Conversation:
${chatContent}

Return ONLY valid JSON (an array of strings):`;

    try {
      const response = await this.llmProvider.complete(
        [
          { role: 'system', content: 'You are a memory extraction assistant. You analyze conversations and extract important facts and events. Return ONLY valid JSON arrays of strings.' },
          { role: 'user', content: extractionPrompt },
        ],
        { temperature: 0.3, maxTokens: 500 },
        conn
      );

      // Parse the JSON response
      const cleaned = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      let memorySummaries: string[];

      try {
        memorySummaries = JSON.parse(cleaned);
      } catch {
        // Try to extract array from response
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (match) {
          memorySummaries = JSON.parse(match[0]);
        } else {
          return [];
        }
      }

      if (!Array.isArray(memorySummaries)) return [];

      // Create memories from extracted summaries
      const newMemories: Memory[] = [];
      for (const summary of memorySummaries) {
        if (typeof summary === 'string' && summary.trim()) {
          const memory = await this.createMemory({
            source: 'auto',
            summaryText: summary.trim(),
            linkedMessageIds: recentMessages.map(m => m.id),
            linkedChatSessionId: sessionId,
            linkedScenarioId: scenarioId,
            importanceScore: 0.5,
            decayFactor: 1.0,
          });
          newMemories.push(memory);
        }
      }

      return newMemories;
    } catch (error) {
      console.warn('Memory auto-extraction failed:', error);
      return [];
    }
  }

  // ── SEMANTIC RETRIEVAL ──

  /**
   * Retrieve the top-K most relevant memories for the given context text.
   * Uses cosine similarity between embeddings for semantic matching.
   */
  async retrieveRelevantMemories(
    contextText: string,
    scenarioId: string,
    topK: number = 5,
    minScore: number = 0.2
  ): Promise<Array<{ memory: Memory; score: number }>> {
    const queryEmbedding = this.generateLocalEmbedding(contextText);

    // Get all memories for this scenario (or unlinked)
    let candidates: Memory[];
    if (scenarioId) {
      candidates = await this.db.memories
        .where('linkedScenarioId')
        .equals(scenarioId)
        .toArray();
    } else {
      candidates = await this.db.memories.toArray();
    }

    // Score each candidate by cosine similarity × importance × decay
    const scored = candidates
      .filter(m => m.embeddingVector && m.embeddingVector.length > 0)
      .map(m => {
        const cosineSim = this.cosineSimilarity(queryEmbedding, m.embeddingVector!);
        const adjustedScore = cosineSim * m.importanceScore * m.decayFactor;
        return { memory: m, score: adjustedScore };
      })
      .filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored;
  }

  /**
   * Full-text search across memory summaries (for the memory browser UI).
   */
  async searchMemories(query: string): Promise<Memory[]> {
    const q = query.toLowerCase();
    return this.db.memories
      .filter(m => m.summaryText.toLowerCase().includes(q))
      .toArray();
  }

  // ── DECAY & MAINTENANCE ──

  /**
   * Apply time-based decay to all memories. Older, less-accessed memories
   * gradually lose relevance. Called periodically or on app startup.
   */
  async applyDecay(decayRate: number = 0.995): Promise<void> {
    const allMemories = await this.db.memories.toArray();
    const updates: Array<{ id: string; decayFactor: number }> = [];

    for (const m of allMemories) {
      const newDecay = Math.max(0.1, m.decayFactor * decayRate);
      if (newDecay !== m.decayFactor) {
        updates.push({ id: m.id, decayFactor: newDecay });
      }
    }

    // Batch update
    for (const u of updates) {
      await this.db.memories.update(u.id, { decayFactor: u.decayFactor });
    }
  }

  /**
   * Boost a memory's importance (e.g., when it's retrieved and used,
   * or when the user explicitly marks it as important).
   */
  async boostMemory(id: string, boostAmount: number = 0.1): Promise<void> {
    const memory = await this.db.memories.get(id);
    if (memory) {
      await this.db.memories.update(id, {
        importanceScore: Math.min(1.0, memory.importanceScore + boostAmount),
        decayFactor: 1.0, // Reset decay on boost
        updatedAt: now(),
      });
    }
  }

  /**
   * Get memory statistics for a session or overall.
   */
  async getStats(sessionId?: string): Promise<{
    total: number;
    auto: number;
    manual: number;
    avgImportance: number;
  }> {
    let memories: Memory[];
    if (sessionId) {
      memories = await this.getMemoriesBySession(sessionId);
    } else {
      memories = await this.db.memories.toArray();
    }

    const auto = memories.filter(m => m.source === 'auto').length;
    const manual = memories.filter(m => m.source === 'manual').length;
    const avgImportance = memories.length > 0
      ? memories.reduce((sum, m) => sum + m.importanceScore, 0) / memories.length
      : 0;

    return { total: memories.length, auto, manual, avgImportance };
  }

  // ── LOCAL EMBEDDING (Lightweight, no external model) ──

  /**
   * Generate a lightweight local embedding for text using a deterministic
   * hash-based approach. This is NOT as good as a real embedding model,
   * but works offline and is instant. For production, swap to a real
   * embedding model (e.g., transformers.js, or call the LLM's embedding API).
   *
   * Strategy: character n-gram hashing with dimensional folding.
   */
  generateLocalEmbedding(text: string): number[] {
    const normalized = text.toLowerCase().trim();
    const vector = new Float32Array(this.EMBED_DIM).fill(0);

    if (!normalized) return Array.from(vector);

    // 1. Character trigram hashing
    for (let i = 0; i < normalized.length - 2; i++) {
      const trigram = normalized.substring(i, i + 3);
      const hash = this.hashString(trigram);
      const dim = Math.abs(hash) % this.EMBED_DIM;
      vector[dim] += (hash > 0 ? 1 : -1);
    }

    // 2. Word-level hashing (captures semantic units)
    const words = normalized.split(/\s+/);
    for (const word of words) {
      if (word.length < 2) continue;
      const hash = this.hashString(word);
      const dim = Math.abs(hash) % this.EMBED_DIM;
      vector[dim] += (hash > 0 ? 2 : -2); // Words weighted more than trigrams
    }

    // 3. Bigram hashing (captures word pairs)
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = words[i] + ' ' + words[i + 1];
      const hash = this.hashString(bigram);
      const dim = Math.abs(hash) % this.EMBED_DIM;
      vector[dim] += (hash > 0 ? 1.5 : -1.5);
    }

    // 4. L2 normalize
    let magnitude = 0;
    for (let i = 0; i < this.EMBED_DIM; i++) {
      magnitude += vector[i] * vector[i];
    }
    magnitude = Math.sqrt(magnitude);
    if (magnitude > 0) {
      for (let i = 0; i < this.EMBED_DIM; i++) {
        vector[i] /= magnitude;
      }
    }

    return Array.from(vector);
  }

  // ── Private Helpers ──

  /**
   * Simple string hash function (DJB2 variant).
   */
  private hashString(s: string): number {
    let hash = 5381;
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0;
    }
    return hash;
  }

  /**
   * Cosine similarity between two vectors.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}
