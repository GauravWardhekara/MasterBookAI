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

    // Auto-populate first message if not provided
    if (session.messages.length === 0 && session.scenarioId) {
      const scenario = await this.db.scenarios.get(session.scenarioId);
      if (scenario) {
        if (session.mode === 'story' && scenario.greeting) {
          // RPG/Story mode narrator greeting (Dungeo style)
          session.messages.push({
            id: generateId(),
            role: 'narrator',
            senderId: 'system',
            senderName: 'Narrator',
            content: scenario.greeting,
            timestamp: now(),
            generatedImageRefs: [],
            isPinnedAsMemory: false,
            tokenCount: Math.ceil(scenario.greeting.length / 4),
          });
        } else if (session.mode === 'chat' && session.activeCharacterIds.length > 0) {
          // Chat mode character greeting (SillyTavern style)
          const char = await this.db.characters.get(session.activeCharacterIds[0]);
          if (char) {
            // Priority: firstMessage, then greetingMessages[0], then alternateGreetings[0]
            const firstMsg = char.firstMessage || (char.greetingMessages && char.greetingMessages[0]) || (char.alternateGreetings && char.alternateGreetings[0]);
            
            // Build the alternates list for swiping
            const alternates: string[] = [];
            if (char.firstMessage) alternates.push(char.firstMessage);
            if (char.greetingMessages) alternates.push(...char.greetingMessages.filter(g => g !== char.firstMessage));
            if (char.alternateGreetings) alternates.push(...char.alternateGreetings.filter(g => !alternates.includes(g)));
            
            if (firstMsg) {
              session.messages.push({
                id: generateId(),
                role: 'assistant',
                senderId: char.id,
                senderName: char.name,
                content: firstMsg,
                timestamp: now(),
                generatedImageRefs: [],
                isPinnedAsMemory: false,
                tokenCount: Math.ceil(firstMsg.length / 4),
                alternates: alternates.length > 1 ? alternates : undefined,
                activeAlternateIndex: alternates.length > 1 ? 0 : undefined
              });
            }
          }
        }
      }
    }

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
