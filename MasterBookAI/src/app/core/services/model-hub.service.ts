import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { ConnectionService } from './connection.service';
import { DeviceCapabilityService } from './device-capability.service';
import { HubModel, ModelFile, LocalModel, DeviceTier } from '../models/model-hub.model';
import { generateId, now } from '../models/base.model';

/**
 * Service for the Model Hub feature.
 * Handles model discovery from HuggingFace, Ollama pull/delete,
 * local model tracking, and compatibility filtering.
 */
@Injectable({ providedIn: 'root' })
export class ModelHubService {
  private readonly HF_API = 'https://huggingface.co/api';

  constructor(
    private db: DatabaseService,
    private connectionService: ConnectionService,
    private deviceCapability: DeviceCapabilityService
  ) {}

  // ─── HuggingFace Integration ──────────────────────────────────────────

  /**
   * Search HuggingFace for GGUF models.
   */
  async searchHuggingFaceModels(query: string = '', limit: number = 20): Promise<HubModel[]> {
    try {
      const params = new URLSearchParams({
        library: 'gguf',
        sort: 'downloads',
        direction: '-1',
        limit: limit.toString(),
      });
      if (query) params.set('search', query);

      const response = await fetch(`${this.HF_API}/models?${params}`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`HuggingFace API error: ${response.status}`);

      const models: any[] = await response.json();
      return models.map(m => this.mapHFModelToHubModel(m));
    } catch (err) {
      console.error('Failed to search HuggingFace models:', err);
      return [];
    }
  }

  /**
   * Get GGUF files available in a HuggingFace repository.
   */
  async getHuggingFaceModelFiles(repoId: string): Promise<ModelFile[]> {
    try {
      const response = await fetch(`${this.HF_API}/models/${repoId}/tree/main`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`HuggingFace API error: ${response.status}`);

      const files: any[] = await response.json();
      return files
        .filter((f: any) => f.path?.endsWith('.gguf'))
        .map((f: any) => ({
          filename: f.path,
          sizeBytes: f.size || 0,
          quantType: this.extractQuantType(f.path),
          downloadUrl: `https://huggingface.co/${repoId}/resolve/main/${f.path}`,
          requiredRamGB: Math.ceil((f.size || 0) / (1024 * 1024 * 1024) * 1.3), // ~1.3x model size
        }));
    } catch (err) {
      console.error('Failed to get HuggingFace model files:', err);
      return [];
    }
  }

  // ─── Ollama Integration ───────────────────────────────────────────────

  /**
   * Get models installed in the local Ollama instance.
   */
  async getOllamaModels(ollamaUrl: string = 'http://localhost:11434'): Promise<HubModel[]> {
    try {
      const response = await fetch(`${ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`Ollama error: ${response.status}`);

      const data = await response.json();
      if (!data.models || !Array.isArray(data.models)) return [];

      return data.models.map((m: any) => ({
        id: m.name || m.model,
        name: (m.name || m.model).split(':')[0],
        source: 'ollama' as const,
        description: `Ollama model • ${this.formatBytes(m.size || 0)}`,
        parameterCount: m.details?.parameter_size || '',
        tags: [m.details?.family || 'unknown'],
        compatibilityTier: 'low' as DeviceTier,
        quantizations: [{
          filename: m.name || m.model,
          sizeBytes: m.size || 0,
          quantType: m.details?.quantization_level || 'unknown',
          downloadUrl: '',
          requiredRamGB: Math.ceil((m.size || 0) / (1024 * 1024 * 1024) * 1.3),
        }],
      }));
    } catch (err) {
      console.error('Failed to get Ollama models:', err);
      return [];
    }
  }

  /**
   * Pull (download) a model from the Ollama library.
   * Returns an async generator yielding progress updates.
   */
  async *pullOllamaModel(
    modelName: string,
    ollamaUrl: string = 'http://localhost:11434'
  ): AsyncGenerator<{ status: string; completed?: number; total?: number }> {
    const response = await fetch(`${ollamaUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelName, stream: true }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Ollama pull error ${response.status}: ${text}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            yield {
              status: parsed.status || 'downloading',
              completed: parsed.completed,
              total: parsed.total,
            };
          } catch { /* skip malformed lines */ }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Delete a model from the local Ollama instance.
   */
  async deleteOllamaModel(modelName: string, ollamaUrl: string = 'http://localhost:11434'): Promise<void> {
    const response = await fetch(`${ollamaUrl}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelName }),
    });
    if (!response.ok) {
      throw new Error(`Failed to delete model: ${response.status}`);
    }
  }

  // ─── Cloud Models ─────────────────────────────────────────────────────

  /**
   * Get models from all configured cloud connection profiles.
   */
  async getCloudModels(): Promise<HubModel[]> {
    const profiles = await this.connectionService.getAllProfiles();
    const models: HubModel[] = [];

    for (const profile of profiles) {
      if (profile.type === 'cloud' || profile.provider === 'openai' || profile.provider === 'anthropic' || profile.provider === 'gemini') {
        for (const modelId of profile.modelList) {
          models.push({
            id: `${profile.provider}/${modelId}`,
            name: modelId,
            source: 'local' as const, // "local" here means "locally configured"
            description: `${profile.name} • ${profile.provider}`,
            tags: [profile.provider],
            compatibilityTier: 'low', // Cloud models have no local requirements
          });
        }
      }
    }

    return models;
  }

  // ─── Local Model Tracking (IndexedDB) ─────────────────────────────────

  /**
   * Get all locally tracked models.
   */
  async getLocalModels(): Promise<LocalModel[]> {
    return this.db.localModels.toArray();
  }

  /**
   * Add a model to local tracking.
   */
  async addLocalModel(data: Partial<LocalModel>): Promise<LocalModel> {
    const model: LocalModel = {
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
      name: data.name || 'Unknown Model',
      source: data.source || 'ollama',
      modelId: data.modelId || '',
      filename: data.filename,
      filePath: data.filePath,
      sizeBytes: data.sizeBytes || 0,
      quantType: data.quantType,
      status: data.status || 'ready',
      downloadProgress: data.downloadProgress || 100,
      provider: data.provider || 'ollama',
      addedAt: now(),
    };
    await this.db.localModels.add(model);
    return model;
  }

  /**
   * Update a local model's status or progress.
   */
  async updateLocalModel(id: string, data: Partial<LocalModel>): Promise<void> {
    await this.db.localModels.update(id, { ...data, updatedAt: now() });
  }

  /**
   * Delete a local model record.
   */
  async deleteLocalModel(id: string): Promise<void> {
    await this.db.localModels.delete(id);
  }

  // ─── Compatibility Filtering ──────────────────────────────────────────

  /**
   * Filter models to only those compatible with the current device.
   */
  filterByCompatibility(models: HubModel[], maxSizeGB: number): HubModel[] {
    return models.filter(model => {
      if (!model.quantizations || model.quantizations.length === 0) return true;
      // Keep the model if at least one quantization fits
      return model.quantizations.some(q => q.requiredRamGB <= maxSizeGB);
    });
  }

  /**
   * Filter model files to only those compatible with the device.
   */
  filterFilesByCompatibility(files: ModelFile[], maxSizeGB: number): ModelFile[] {
    return files.map(f => ({
      ...f,
      _compatible: f.requiredRamGB <= maxSizeGB,
    })) as any;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  private mapHFModelToHubModel(m: any): HubModel {
    const name = m.modelId || m.id || '';
    const paramMatch = name.match(/(\d+\.?\d*)[bB]/);

    return {
      id: m.modelId || m.id,
      name: name.split('/').pop() || name,
      source: 'huggingface',
      description: m.pipeline_tag || 'GGUF Model',
      parameterCount: paramMatch ? `${paramMatch[1]}B` : undefined,
      tags: m.tags || [],
      downloads: m.downloads,
      likes: m.likes,
      lastUpdated: m.lastModified,
      compatibilityTier: this.estimateTierFromName(name),
    };
  }

  private estimateTierFromName(name: string): DeviceTier {
    const lower = name.toLowerCase();
    if (/70b|65b|72b|80b/i.test(lower)) return 'ultra';
    if (/13b|14b|20b|34b/i.test(lower)) return 'high';
    if (/7b|8b|9b|10b/i.test(lower)) return 'medium';
    return 'low'; // 1B-3B or unknown
  }

  private extractQuantType(filename: string): string {
    const match = filename.match(/[._-](Q\d[_A-Z0-9]*)\./i);
    return match ? match[1].toUpperCase() : 'unknown';
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
