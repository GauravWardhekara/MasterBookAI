import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { ConnectionProfile } from '../models/connection-profile.model';
import { Character } from '../models/character.model';
import { Persona } from '../models/persona.model';
import { ChatSession, ChatMessage } from '../models/chat-session.model';
import { Scenario } from '../models/scenario.model';
import { WorldInfoEntry } from '../models/world-info.model';
import { Memory } from '../models/memory.model';
import { ImageGenConfig } from '../models/image-gen-config.model';

/**
 * MasterBookAI Local Database
 * Uses Dexie (IndexedDB wrapper) for web; SQLite via Capacitor on native.
 */
class MasterBookAIDatabase extends Dexie {
  connectionProfiles!: Table<ConnectionProfile, string>;
  characters!: Table<Character, string>;
  personas!: Table<Persona, string>;
  chatSessions!: Table<ChatSession, string>;
  scenarios!: Table<Scenario, string>;
  worldInfo!: Table<WorldInfoEntry, string>;
  memories!: Table<Memory, string>;
  imageGenConfigs!: Table<ImageGenConfig, string>;

  constructor() {
    super('MasterBookAIDatabase');
    this.version(1).stores({
      connectionProfiles: 'id, name, provider, createdAt',
      characters: 'id, name, isPlayable, isNpc, tags, createdAt',
      personas: 'id, name, isDefault, createdAt',
      chatSessions: 'id, title, scenarioId, mode, createdAt, updatedAt',
      scenarios: 'id, title, isFavorite, createdAt, updatedAt',
      worldInfo: 'id, title, keywords, createdAt',
      memories: 'id, source, importanceScore, linkedChatSessionId, createdAt',
      imageGenConfigs: 'id, name, providerType, isDefault, createdAt',
    });
  }
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private db = new MasterBookAIDatabase();

  // =================== Connection Profiles ===================
  async getConnectionProfiles(): Promise<ConnectionProfile[]> {
    return this.db.connectionProfiles.orderBy('createdAt').toArray();
  }

  async getConnectionProfile(id: string): Promise<ConnectionProfile | undefined> {
    return this.db.connectionProfiles.get(id);
  }

  async saveConnectionProfile(profile: ConnectionProfile): Promise<void> {
    profile.updatedAt = new Date();
    await this.db.connectionProfiles.put(profile);
  }

  async deleteConnectionProfile(id: string): Promise<void> {
    await this.db.connectionProfiles.delete(id);
  }

  // =================== Characters ===================
  async getCharacters(): Promise<Character[]> {
    return this.db.characters.orderBy('name').toArray();
  }

  async getCharacter(id: string): Promise<Character | undefined> {
    return this.db.characters.get(id);
  }

  async saveCharacter(character: Character): Promise<void> {
    character.updatedAt = new Date();
    await this.db.characters.put(character);
  }

  async deleteCharacter(id: string): Promise<void> {
    await this.db.characters.delete(id);
  }

  // =================== Personas ===================
  async getPersonas(): Promise<Persona[]> {
    return this.db.personas.orderBy('name').toArray();
  }

  async getDefaultPersona(): Promise<Persona | undefined> {
    return this.db.personas.where('isDefault').equals(1).first();
  }

  async savePersona(persona: Persona): Promise<void> {
    persona.updatedAt = new Date();
    await this.db.personas.put(persona);
  }

  async deletePersona(id: string): Promise<void> {
    await this.db.personas.delete(id);
  }

  // =================== Chat Sessions ===================
  async getChatSessions(): Promise<ChatSession[]> {
    return this.db.chatSessions.orderBy('updatedAt').reverse().toArray();
  }

  async getChatSession(id: string): Promise<ChatSession | undefined> {
    return this.db.chatSessions.get(id);
  }

  async saveChatSession(session: ChatSession): Promise<void> {
    session.updatedAt = new Date();
    await this.db.chatSessions.put(session);
  }

  async deleteChatSession(id: string): Promise<void> {
    await this.db.chatSessions.delete(id);
  }

  async addMessage(sessionId: string, message: ChatMessage): Promise<void> {
    const session = await this.db.chatSessions.get(sessionId);
    if (!session) return;
    session.messages.push(message);
    session.updatedAt = new Date();
    await this.db.chatSessions.put(session);
  }

  async updateMessage(sessionId: string, messageId: string, updates: Partial<ChatMessage>): Promise<void> {
    const session = await this.db.chatSessions.get(sessionId);
    if (!session) return;
    const idx = session.messages.findIndex(m => m.id === messageId);
    if (idx >= 0) {
      session.messages[idx] = { ...session.messages[idx], ...updates };
      session.updatedAt = new Date();
      await this.db.chatSessions.put(session);
    }
  }

  async deleteMessage(sessionId: string, messageId: string): Promise<void> {
    const session = await this.db.chatSessions.get(sessionId);
    if (!session) return;
    session.messages = session.messages.filter(m => m.id !== messageId);
    session.updatedAt = new Date();
    await this.db.chatSessions.put(session);
  }

  // =================== Scenarios ===================
  async getScenarios(): Promise<Scenario[]> {
    return this.db.scenarios.orderBy('updatedAt').reverse().toArray();
  }

  async getScenario(id: string): Promise<Scenario | undefined> {
    return this.db.scenarios.get(id);
  }

  async saveScenario(scenario: Scenario): Promise<void> {
    scenario.updatedAt = new Date();
    await this.db.scenarios.put(scenario);
  }

  async deleteScenario(id: string): Promise<void> {
    await this.db.scenarios.delete(id);
  }

  // =================== World Info ===================
  async getWorldInfoEntries(): Promise<WorldInfoEntry[]> {
    return this.db.worldInfo.orderBy('title').toArray();
  }

  async saveWorldInfoEntry(entry: WorldInfoEntry): Promise<void> {
    entry.updatedAt = new Date();
    await this.db.worldInfo.put(entry);
  }

  async deleteWorldInfoEntry(id: string): Promise<void> {
    await this.db.worldInfo.delete(id);
  }

  // =================== Memories ===================
  async getMemories(): Promise<Memory[]> {
    return this.db.memories.orderBy('createdAt').reverse().toArray();
  }

  async saveMemory(memory: Memory): Promise<void> {
    memory.updatedAt = new Date();
    await this.db.memories.put(memory);
  }

  async deleteMemory(id: string): Promise<void> {
    await this.db.memories.delete(id);
  }

  // =================== Image Gen Configs ===================
  async getImageGenConfigs(): Promise<ImageGenConfig[]> {
    return this.db.imageGenConfigs.orderBy('name').toArray();
  }

  async saveImageGenConfig(config: ImageGenConfig): Promise<void> {
    config.updatedAt = new Date();
    await this.db.imageGenConfigs.put(config);
  }

  async deleteImageGenConfig(id: string): Promise<void> {
    await this.db.imageGenConfigs.delete(id);
  }

  // =================== Export / Import ===================
  async exportAllData(): Promise<string> {
    const data = {
      connectionProfiles: await this.db.connectionProfiles.toArray(),
      characters: await this.db.characters.toArray(),
      personas: await this.db.personas.toArray(),
      chatSessions: await this.db.chatSessions.toArray(),
      scenarios: await this.db.scenarios.toArray(),
      worldInfo: await this.db.worldInfo.toArray(),
      memories: await this.db.memories.toArray(),
      imageGenConfigs: await this.db.imageGenConfigs.toArray(),
    };
    return JSON.stringify(data, null, 2);
  }

  async importAllData(json: string): Promise<void> {
    const data = JSON.parse(json);
    if (data.connectionProfiles) await this.db.connectionProfiles.bulkPut(data.connectionProfiles);
    if (data.characters) await this.db.characters.bulkPut(data.characters);
    if (data.personas) await this.db.personas.bulkPut(data.personas);
    if (data.chatSessions) await this.db.chatSessions.bulkPut(data.chatSessions);
    if (data.scenarios) await this.db.scenarios.bulkPut(data.scenarios);
    if (data.worldInfo) await this.db.worldInfo.bulkPut(data.worldInfo);
    if (data.memories) await this.db.memories.bulkPut(data.memories);
    if (data.imageGenConfigs) await this.db.imageGenConfigs.bulkPut(data.imageGenConfigs);
  }
}
