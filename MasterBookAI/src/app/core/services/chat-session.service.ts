import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { ChatSession } from '../models/chat-session.model';
import { generateId, now } from '../models/base.model';

@Injectable({ providedIn: 'root' })
export class ChatSessionService {
  constructor(private db: DatabaseService) {}

  async getAllSessions(): Promise<ChatSession[]> {
    return this.db.chatSessions.orderBy('updatedAt').reverse().toArray();
  }

  async getSession(id: string): Promise<ChatSession | undefined> {
    return this.db.chatSessions.get(id);
  }

  async getSessionsByScenario(scenarioId: string): Promise<ChatSession[]> {
    return this.db.chatSessions.where('scenarioId').equals(scenarioId).toArray();
  }

  async getFavoriteSessions(): Promise<ChatSession[]> {
    return this.db.chatSessions.where('isFavorite').equals(1).toArray();
  }

  async searchSessions(query: string): Promise<ChatSession[]> {
    const q = query.toLowerCase();
    return this.db.chatSessions
      .filter(s => s.title.toLowerCase().includes(q) ||
                   (s.summary || '').toLowerCase().includes(q) ||
                   s.tags.some(t => t.toLowerCase().includes(q)))
      .toArray();
  }

  async createSession(data: Partial<ChatSession>): Promise<ChatSession> {
    const session: ChatSession = {
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
      scenarioId: data.scenarioId || '',
      personaId: data.personaId || 'default-persona',
      activeCharacterIds: data.activeCharacterIds || [],
      mode: data.mode || 'chat',
      messages: data.messages || [],
      linkedMemoryIds: data.linkedMemoryIds || [],
      title: data.title || 'New Chat',
      summary: data.summary,
      thumbnailImage: data.thumbnailImage,
      isFavorite: data.isFavorite || false,
      tags: data.tags || [],
    };
    await this.db.chatSessions.add(session);
    return session;
  }

  async updateSession(id: string, data: Partial<ChatSession>): Promise<void> {
    await this.db.chatSessions.update(id, { ...data, updatedAt: now() });
  }

  async deleteSession(id: string): Promise<void> {
    // Also delete associated memories
    await this.db.memories.where('linkedChatSessionId').equals(id).delete();
    await this.db.chatSessions.delete(id);
  }

  async toggleFavorite(id: string): Promise<void> {
    const session = await this.db.chatSessions.get(id);
    if (session) {
      await this.db.chatSessions.update(id, {
        isFavorite: !session.isFavorite,
        updatedAt: now(),
      });
    }
  }

  async duplicateSession(id: string): Promise<ChatSession | undefined> {
    const original = await this.db.chatSessions.get(id);
    if (!original) return undefined;

    const newSession: ChatSession = {
      ...original,
      id: generateId(),
      title: `${original.title} (Copy)`,
      createdAt: now(),
      updatedAt: now(),
      isFavorite: false,
    };
    await this.db.chatSessions.add(newSession);
    return newSession;
  }
}
