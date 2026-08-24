import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Character, Persona } from '../models/character.model';
import { Lorebook, LoreEntry } from '../models/lorebook.model';
import { Scenario } from '../models/scenario.model';
import { ChatSession, Memory } from '../models/chat-session.model';
import { ConnectionProfile, ImageGenConfig } from '../models/connection-profile.model';
import { Preset } from '../models/preset.model';
import { LocalModel } from '../models/model-hub.model';

/**
 * MasterBookAI local database using Dexie.js (IndexedDB wrapper).
 * This is the single source of truth for all local data.
 */
@Injectable({ providedIn: 'root' })
export class DatabaseService extends Dexie {
  characters!: Table<Character, string>;
  personas!: Table<Persona, string>;
  lorebooks!: Table<Lorebook, string>;
  loreEntries!: Table<LoreEntry, string>;
  scenarios!: Table<Scenario, string>;
  chatSessions!: Table<ChatSession, string>;
  memories!: Table<Memory, string>;
  connectionProfiles!: Table<ConnectionProfile, string>;
  imageGenConfigs!: Table<ImageGenConfig, string>;
  presets!: Table<Preset, string>;
  localModels!: Table<LocalModel, string>;

  constructor() {
    super('MasterBookAI');

    this.version(2).stores({
      characters: 'id, name, *tags, createdAt, updatedAt',
      personas: 'id, name, isDefault',
      lorebooks: 'id, title, *tags, createdAt, updatedAt',
      loreEntries: 'id, lorebookId, loreType, *triggerWords, isEnabled',
      scenarios: 'id, title, *tags, *characterIds, *lorebookIds, createdAt, updatedAt',
      chatSessions: 'id, scenarioId, personaId, mode, isFavorite, title, createdAt, updatedAt',
      memories: 'id, source, linkedChatSessionId, linkedScenarioId, importanceScore',
      connectionProfiles: 'id, name, type, isDefault',
      imageGenConfigs: 'id, providerType, isDefault',
      presets: 'id, name, isAuthorPreset, createdAt',
    });

    this.version(3).stores({
      characters: 'id, name, *tags, createdAt, updatedAt',
      personas: 'id, name, isDefault',
      lorebooks: 'id, title, *tags, createdAt, updatedAt',
      loreEntries: 'id, lorebookId, loreType, *triggerWords, isEnabled',
      scenarios: 'id, title, *tags, *characterIds, *lorebookIds, createdAt, updatedAt',
      chatSessions: 'id, scenarioId, personaId, mode, isFavorite, title, createdAt, updatedAt',
      memories: 'id, source, linkedChatSessionId, linkedScenarioId, importanceScore',
      connectionProfiles: 'id, name, type, isDefault',
      imageGenConfigs: 'id, providerType, isDefault',
      presets: 'id, name, isAuthorPreset, createdAt',
      localModels: 'id, name, source, modelId, status, addedAt',
    });
  }

  /**
   * Initialize with default data if the database is empty.
   */
  async initializeDefaults(): Promise<void> {
    const personaCount = await this.personas.count();
    if (personaCount === 0) {
      await this.personas.add({
        id: 'default-persona',
        name: 'User',
        description: 'The default user persona.',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const connectionCount = await this.connectionProfiles.count();
    if (connectionCount === 0) {
      await this.connectionProfiles.add({
        id: 'default-ollama',
        name: 'Local Ollama (Bundled)',
        type: 'local',
        provider: 'ollama',
        endpointUrl: 'http://127.0.0.1:11434',
        authMethod: 'none',
        modelList: [],
        contextSize: 4096,
        defaultSampling: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          repetitionPenalty: 1.1,
          maxTokens: 512,
        },
        streamingEnabled: true,
        promptTemplate: 'chatml',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const webLlmCount = await this.connectionProfiles.where('provider').equals('web-llm').count();
    if (webLlmCount === 0) {
      await this.connectionProfiles.add({
        id: 'default-web-llm',
        name: 'Mobile-Native (Web-LLM)',
        type: 'local',
        provider: 'web-llm',
        endpointUrl: 'local', // Run entirely on device
        authMethod: 'none',
        modelList: ['Llama-3-8B-Instruct-q4f32_1-MLC'], // Default small model
        contextSize: 4096,
        defaultSampling: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          repetitionPenalty: 1.1,
          maxTokens: 512,
        },
        streamingEnabled: true,
        promptTemplate: 'chatml',
        isDefault: false, // We'll conditionally set it in connection.service
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }
}
