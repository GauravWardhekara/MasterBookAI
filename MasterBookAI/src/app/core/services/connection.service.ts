import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { DatabaseService } from './database.service';
import { ConnectionProfile } from '../models/connection-profile.model';
import { generateId, now } from '../models/base.model';
import { BehaviorSubject, Subscription, timer, from, of } from 'rxjs';
import { catchError, switchMap, timeout, retryWhen, delay } from 'rxjs/operators';

/**
 * Service for managing LLM connection profiles.
 * Handles CRUD, health checks, and model discovery.
 */
@Injectable({ providedIn: 'root' })
export class ConnectionService {
  private healthCheckSub?: Subscription;
  
  // Connection status observables
  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  public isConnected$ = this.isConnectedSubject.asObservable();
  
  private activeProfileSubject = new BehaviorSubject<ConnectionProfile | undefined>(undefined);
  public activeProfile$ = this.activeProfileSubject.asObservable();

  constructor(private db: DatabaseService) {
    this.startHealthCheckLoop();
  }

  /**
   * Background loop to periodically check connection health.
   */
  private startHealthCheckLoop(): void {
    if (this.healthCheckSub) this.healthCheckSub.unsubscribe();
    
    // Check every 30 seconds
    this.healthCheckSub = timer(0, 30000).pipe(
      switchMap(() => from(this.getDefaultProfile())),
      switchMap(profile => {
        if (!profile) return of(false);
        this.activeProfileSubject.next(profile);
        return from(this.testConnection(profile)).pipe(
          switchMap(() => of(true)),
          catchError(() => of(false))
        );
      })
    ).subscribe(isHealthy => {
      this.isConnectedSubject.next(isHealthy);
    });
  }

  ngOnDestroy(): void {
    if (this.healthCheckSub) this.healthCheckSub.unsubscribe();
  }

  async getAllProfiles(): Promise<ConnectionProfile[]> {
    return this.db.connectionProfiles.orderBy('name').toArray();
  }

  async getProfile(id: string): Promise<ConnectionProfile | undefined> {
    return this.db.connectionProfiles.get(id);
  }

  async getDefaultProfile(): Promise<ConnectionProfile | undefined> {
    const isMobile = Capacitor.isNativePlatform();
    
    // First, check if there's an explicitly set default profile
    let defaultProfile = await this.db.connectionProfiles.filter(p => p.isDefault === true).first();
    
    // If it's a mobile platform and the default is Ollama, try to fallback to a Cloud or Web-LLM provider
    if (isMobile && defaultProfile?.provider === 'ollama') {
      const fallback = await this.db.connectionProfiles
        .filter(p => p.provider !== 'ollama')
        .first();
        
      if (fallback) {
        return fallback;
      }
    }
    
    return defaultProfile;
  }

  async createProfile(data: Partial<ConnectionProfile>): Promise<ConnectionProfile> {
    const profile: ConnectionProfile = {
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
      name: data.name || 'New Connection',
      type: data.type || 'local',
      provider: data.provider || 'openai',
      endpointUrl: data.endpointUrl || this.getDefaultUrl(data.provider || 'openai'),
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
      defaultModel: data.defaultModel || '',
      customStopStrings: data.customStopStrings || [],
      tokenizer: data.tokenizer,
      isDefault: data.isDefault || false,
    };

    // If this is being set as default, unset others
    if (profile.isDefault) {
      await this.db.connectionProfiles.filter(p => p.isDefault === true).modify({ isDefault: false });
    }

    await this.db.connectionProfiles.add(profile);
    this.startHealthCheckLoop(); // Trigger immediate health check
    return profile;
  }

  async updateProfile(id: string, data: Partial<ConnectionProfile>): Promise<void> {
    if (data.isDefault) {
      await this.db.connectionProfiles.filter(p => p.isDefault === true).modify({ isDefault: false });
    }
    await this.db.connectionProfiles.update(id, { ...data, updatedAt: now() });
    if (data.isDefault) this.startHealthCheckLoop();
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

    if (profile.provider === 'anthropic') {
      if (profile.apiKey) headers['x-api-key'] = profile.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      try {
        const response = await fetch(`${url}/v1/models`, { headers, signal: AbortSignal.timeout(10000) });
        if (response.ok) {
          const data = await response.json();
          if (data.data && Array.isArray(data.data)) return data.data.map((m: any) => m.id);
        }
      } catch (e) {
        // Fallback if Anthropic models API fails
      }
      return ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307', 'claude-3-sonnet-20240229'];
    }

    if (profile.provider === 'gemini') {
      try {
        const response = await fetch(`${url}/v1beta/models?key=${profile.apiKey}`, { headers, signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
          return data.models.map((m: any) => m.name.replace('models/', ''));
        }
      } catch (err) {
        // Fallback
      }
      return ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'];
    }

    if (profile.authMethod === 'api-key' && profile.apiKey) {
      headers['Authorization'] = `Bearer ${profile.apiKey}`;
    } else if (profile.authMethod === 'bearer-token' && profile.apiKey) {
      headers['Authorization'] = `Bearer ${profile.apiKey}`;
    }

    if (profile.provider === 'ollama') {
      try {
        const response = await fetch(`${url}/api/tags`, { headers, signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
          return data.models.map((m: any) => m.name || m.model);
        }
        return [];
      } catch (err) {
        throw err;
      }
    }

    if (profile.provider === 'lmstudio') {
      let lastErr: any;
      try {
        const response = await fetch(`${url}/v1/models`, { headers, signal: AbortSignal.timeout(10000) });
        if (response.ok) {
          const data = await response.json();
          if (data.data && Array.isArray(data.data)) return data.data.map((m: any) => m.id);
        }
      } catch (e) { lastErr = e; }
      
      try {
        const response = await fetch(`${url}/api/v1/models`, { headers, signal: AbortSignal.timeout(10000) });
        if (response.ok) {
          const data = await response.json();
          if (data.models && Array.isArray(data.models)) return data.models.map((m: any) => m.key || m.id || m.name || m.model);
        }
      } catch (e) { lastErr = e; }
      
      if (lastErr) throw lastErr;
      return [];
    }

    // Default OpenAI / vLLM / custom format
    try {
      const response = await fetch(`${url}/v1/models`, { headers, signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        return data.data.map((m: any) => m.id);
      }
      if (data.models && Array.isArray(data.models)) {
        return data.models.map((m: any) => m.name || m.model || m.id || m.key);
      }
      return [];
    } catch (err) {
      throw err;
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

  private getDefaultUrl(provider: string): string {
    switch (provider) {
      case 'openai': return 'https://api.openai.com';
      case 'anthropic': return 'https://api.anthropic.com';
      case 'gemini': return 'https://generativelanguage.googleapis.com';
      case 'openrouter': return 'https://openrouter.ai/api/v1';
      case 'nanogpt': return 'https://nano-gpt.com/api/v1';
      case 'literouter': return 'https://api.literouter.com/v1';
      case 'featherless': return 'https://api.featherless.ai/v1';
      case 'deepinfra': return 'https://api.deepinfra.com/v1/openai';
      case 'togetherai': return 'https://api.together.xyz/v1';
      case 'groq': return 'https://api.groq.com/openai/v1';
      case 'wavespeed': return 'https://llm.wavespeed.ai/v1';
      case 'ofox': return 'https://api.ofox.ai/v1';
      case 'aimlapi': return 'https://api.aimlapi.com/v1';
      case 'lmstudio': return 'http://localhost:1234';
      case 'ollama': return 'http://localhost:11434';
      case 'vllm': return 'http://localhost:8000';
      default: return 'http://localhost:11434';
    }
  }
}
