import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonMenuButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonIcon, IonList, IonItem, IonLabel, IonBadge,
  IonInput, IonSelect, IonSelectOption, IonToggle, IonTextarea,
  IonFab, IonFabButton, IonModal, IonSpinner,
  ToastController, AlertController,
} from '@ionic/angular/standalone';
import { StorageService } from '../../core/services/storage.service';
import { LlmProviderService } from '../../core/services/llm-provider.service';
import { ConnectionProfile, DEFAULT_SAMPLING_PARAMS, SamplingParams } from '../../core/models/connection-profile.model';

@Component({
  selector: 'app-connections',
  templateUrl: './connections.page.html',
  styleUrls: ['./connections.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonButtons, IonMenuButton,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonIcon, IonList, IonItem, IonLabel, IonBadge,
    IonInput, IonSelect, IonSelectOption, IonToggle, IonTextarea,
    IonFab, IonFabButton, IonModal, IonSpinner,
    RouterLink,
  ],
})
export class ConnectionsPage {
  private storage = inject(StorageService);
  private llmProvider = inject(LlmProviderService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  profiles = signal<ConnectionProfile[]>([]);
  showModal = signal(false);
  testingProfileId = signal<string | null>(null);

  newProfile = signal<Partial<ConnectionProfile>>({
    name: '',
    type: 'cloud',
    provider: 'openai-compatible',
    endpointUrl: 'https://api.openai.com/v1',
    modelId: 'gpt-4o-mini',
    contextSize: 8192,
    streaming: true,
    samplingParams: { ...DEFAULT_SAMPLING_PARAMS },
    promptTemplate: 'chatml',
  });

  providerPresets = [
    { label: 'OpenAI', provider: 'openai-compatible' as const, url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    { label: 'Anthropic', provider: 'anthropic' as const, url: 'https://api.anthropic.com/v1', model: 'claude-3-5-sonnet-20241022' },
    { label: 'Google Gemini', provider: 'google-gemini' as const, url: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-1.5-pro' },
    { label: 'OpenRouter', provider: 'openai-compatible' as const, url: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
    { label: 'Ollama (Local)', provider: 'openai-compatible' as const, url: 'http://localhost:11434/v1', model: 'llama3.2' },
    { label: 'LM Studio (Local)', provider: 'openai-compatible' as const, url: 'http://localhost:1234/v1', model: 'local-model' },
    { label: 'Custom', provider: 'custom' as const, url: '', model: '' },
  ];

  async ionViewWillEnter() {
    await this.loadProfiles();
  }

  private async loadProfiles() {
    this.profiles.set(await this.storage.getConnectionProfiles());
  }

  applyPreset(presetLabel: string) {
    const preset = this.providerPresets.find(p => p.label === presetLabel);
    if (!preset) return;
    this.newProfile.set({
      ...this.newProfile(),
      provider: preset.provider,
      endpointUrl: preset.url,
      modelId: preset.model,
      type: preset.label.includes('Local') ? 'local' : 'cloud',
    });
  }

  async testConnection(profile: ConnectionProfile) {
    this.testingProfileId.set(profile.id);
    const result = await this.llmProvider.testConnection(profile);
    this.testingProfileId.set(null);

    const toast = await this.toastCtrl.create({
      message: result.success
        ? `Connected! ${result.models?.length || 0} models found (${result.latencyMs}ms)`
        : `Failed: ${result.error}`,
      duration: 4000,
      color: result.success ? 'success' : 'danger',
    });
    await toast.present();
  }

  async createProfile() {
    const p = this.newProfile();
    if (!p.name?.trim() || !p.endpointUrl?.trim()) {
      const toast = await this.toastCtrl.create({
        message: 'Name and endpoint URL are required',
        duration: 2000,
        color: 'warning',
      });
      await toast.present();
      return;
    }

    const profile: ConnectionProfile = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: p.name.trim(),
      type: p.type || 'cloud',
      provider: p.provider || 'openai-compatible',
      endpointUrl: p.endpointUrl.trim(),
      apiKey: p.apiKey,
      modelId: p.modelId || 'gpt-4o-mini',
      contextSize: p.contextSize || 8192,
      streaming: p.streaming ?? true,
      samplingParams: { ...(p.samplingParams || DEFAULT_SAMPLING_PARAMS) },
      promptTemplate: p.promptTemplate || 'chatml',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.storage.saveConnectionProfile(profile);
    await this.loadProfiles();
    this.showModal.set(false);
    this.resetForm();

    const toast = await this.toastCtrl.create({
      message: `Profile "${profile.name}" created`,
      duration: 2000,
      color: 'success',
    });
    await toast.present();
  }

  async deleteProfile(id: string, name: string) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Profile?',
      message: `Delete "${name}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            await this.storage.deleteConnectionProfile(id);
            await this.loadProfiles();
          },
        },
      ],
    });
    await alert.present();
  }

  private resetForm() {
    this.newProfile.set({
      name: '',
      type: 'cloud',
      provider: 'openai-compatible',
      endpointUrl: 'https://api.openai.com/v1',
      modelId: 'gpt-4o-mini',
      contextSize: 8192,
      streaming: true,
      samplingParams: { ...DEFAULT_SAMPLING_PARAMS },
      promptTemplate: 'chatml',
    });
  }

  updateNewProfile(field: keyof ConnectionProfile, value: any) {
    this.newProfile.set({ ...this.newProfile(), [field]: value });
  }

  updateSamplingParam(param: string, value: any) {
    const current = this.newProfile();
    const params = { ...current.samplingParams };
    params[param as keyof typeof params] = value;
    // Ensure all required fields have values
    const samplingParams: SamplingParams = {
      temperature: params.temperature ?? 0.8,
      topP: params.topP ?? 0.9,
      topK: params.topK ?? 40,
      repetitionPenalty: params.repetitionPenalty ?? 1.0,
      maxTokens: params.maxTokens ?? 2048,
    };
    this.newProfile.set({ ...current, samplingParams });
  }

  parseFloat(value: string | number | null | undefined, defaultValue: number = 0): number {
    if (value === null || value === undefined) return defaultValue;
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? defaultValue : parsed;
  }

  parseInt(value: string | number | null | undefined, defaultValue: number = 0, radix: number = 10): number {
    if (value === null || value === undefined) return defaultValue;
    const parsed = parseInt(String(value), radix);
    return isNaN(parsed) ? defaultValue : parsed;
  }
}
