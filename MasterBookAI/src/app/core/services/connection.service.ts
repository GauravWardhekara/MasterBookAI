import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { ConnectionProfile } from '../models/connection-profile.model';
import { generateId, now } from '../models/base.model';

/**
 * Service for managing LLM connection profiles.
 * Handles CRUD, health checks, and model discovery.
 */
@Injectable({ providedIn: 'root' })
export class ConnectionService {
  constructor(private db: DatabaseService) {}

  async getAllProfiles(): Promise<ConnectionProfile[]> {
    return this.db.connectionProfiles.orderBy('name').toArray();
  }

  async getProfile(id: string): Promise<ConnectionProfile | undefined> {
    return this.db.connectionProfiles.get(id);
  }

  async getDefaultProfile(): Promise<ConnectionProfile | undefined> {
    return this.db.connectionProfiles.where('isDefault').equals(1).first();
  }

  async createProfile(data: Partial<ConnectionProfile>): Promise<ConnectionProfile> {
    const profile: ConnectionProfile = {
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
      name: data.name || 'New Connection',
      type: data.type || 'local',
      endpointUrl: data.endpointUrl || 'http://localhost:11434',
      authMethod: data.authMethod || 'none',
      apiKey: data.apiKey,
      modelList: data.modelList || [],
      contextSize: data.contextSize || 4096,
      defaultSampling: data.defaultSampling || {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        repetitionPenalty: 1.1,
        maxTokens: 512,
      },
      streamingEnabled: data.streamingEnabled ?? true,
      promptTemplate: data.promptTemplate || 'chatml',
      isDefault: data.isDefault || false,
    };

    // If this is being set as default, unset others
    if (profile.isDefault) {
      await this.db.connectionProfiles.where('isDefault').equals(1).modify({ isDefault: false });
    }

    await this.db.connectionProfiles.add(profile);
    return profile;
  }

  async updateProfile(id: string, data: Partial<ConnectionProfile>): Promise<void> {
    if (data.isDefault) {
      await this.db.connectionProfiles.where('isDefault').equals(1).modify({ isDefault: false });
    }
    await this.db.connectionProfiles.update(id, { ...data, updatedAt: now() });
  }

  async deleteProfile(id: string): Promise<void> {
    await this.db.connectionProfiles.delete(id);
  }

  /**
   * Test connectivity to an endpoint by fetching the models list.
   * Returns the list of available models on success, or throws on failure.
   */
  async testConnection(profile: Partial<ConnectionProfile>): Promise<string[]> {
    const url = this.normalizeUrl(profile.endpointUrl || '');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (profile.authMethod === 'api-key' && profile.apiKey) {
      headers['Authorization'] = `Bearer ${profile.apiKey}`;
    } else if (profile.authMethod === 'bearer-token' && profile.apiKey) {
      headers['Authorization'] = `Bearer ${profile.apiKey}`;
    }

    try {
      // Try OpenAI-compatible /v1/models endpoint
      const response = await fetch(`${url}/v1/models`, { headers, signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();

      // OpenAI format: { data: [{ id: "model-name", ... }] }
      if (data.data && Array.isArray(data.data)) {
        return data.data.map((m: any) => m.id);
      }

      // Ollama format: { models: [{ name: "model-name", ... }] }
      if (data.models && Array.isArray(data.models)) {
        return data.models.map((m: any) => m.name || m.model);
      }

      return [];
    } catch (firstErr) {
      // Fallback: try Ollama's /api/tags endpoint
      try {
        const response = await fetch(`${url}/api/tags`, { headers, signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw firstErr;
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
          return data.models.map((m: any) => m.name || m.model);
        }
        return [];
      } catch {
        throw firstErr;
      }
    }
  }

  /**
   * Discover models from an endpoint and update the profile's model list.
   */
  async refreshModels(id: string): Promise<string[]> {
    const profile = await this.getProfile(id);
    if (!profile) throw new Error('Profile not found');

    const models = await this.testConnection(profile);
    await this.updateProfile(id, { modelList: models });
    return models;
  }

  private normalizeUrl(url: string): string {
    // Remove trailing slashes
    return url.replace(/\/+$/, '');
  }
}
