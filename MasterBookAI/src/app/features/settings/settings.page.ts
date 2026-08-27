import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
  IonLabel, IonIcon, IonToggle, IonButton, IonInput,
  IonChip,
  AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  serverOutline, colorPaletteOutline, keyOutline, cloudOutline,
  informationCircleOutline, shieldOutline, addOutline, trashOutline,
  refreshOutline, checkmarkCircleOutline, closeCircleOutline,
  flashOutline, saveOutline, createOutline, closeOutline,
  wifiOutline, cloudDoneOutline, desktopOutline, chevronDownOutline,
  chevronUpOutline, imageOutline
} from 'ionicons/icons';
import { ConnectionService } from '../../core/services/connection.service';
import { ImageProviderService } from '../../core/services/image-provider.service';
import { ConnectionProfile, createDefaultConnectionProfile, ImageGenConfig } from '../../core/models/connection-profile.model';

@Component({
  selector: 'app-settings',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>🔗 Connections</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      <div class="settings-container mb-fade-in">
    
        <!-- ── LLM Connections ── -->
        <div class="mb-section-header">
          <span class="mb-section-title">
            <ion-icon name="server-outline"></ion-icon> LLM Connections
          </span>
          <ion-button fill="clear" size="small" (click)="startCreateProfile()">
            <ion-icon slot="start" name="add-outline"></ion-icon>
            Add
          </ion-button>
        </div>
    
        @if (profiles.length === 0 && !showEditor) {
          <div class="empty-connections">
            <ion-icon name="wifi-outline"></ion-icon>
            <p>No connections configured</p>
            <ion-button class="mb-btn-primary" size="small" (click)="startCreateProfile()">
              <ion-icon slot="start" name="add-outline"></ion-icon>
              Add Connection
            </ion-button>
          </div>
        }
    
        <!-- Connection Profile Cards -->
        @if (profiles.length > 0) {
          <div class="connection-list">
            @for (p of profiles; track p; let i = $index) {
              <div
                class="connection-card mb-card mb-fade-in"
                [style.animation-delay]="(i * 0.04) + 's'"
                [class.is-default]="p.isDefault">
                <div class="conn-header" (click)="toggleExpand(p.id)">
                  <div class="conn-status-dot" [class.online]="connectionStatus[p.id] === 'online'"
                    [class.offline]="connectionStatus[p.id] === 'offline'"
                    [class.unknown]="!connectionStatus[p.id] || connectionStatus[p.id] === 'unknown'">
                  </div>
                  <div class="conn-info">
                    <div class="conn-name">
                      {{ p.name }}
                      @if (p.isDefault) {
                        <span class="mb-badge mb-badge-premise">Default</span>
                      }
                    </div>
                    <div class="conn-url">{{ p.endpointUrl }}</div>
                  </div>
                  <div class="conn-type-badge">
                    <ion-icon [name]="p.type === 'local' ? 'desktop-outline' : 'cloud-done-outline'"></ion-icon>
                    {{ p.type | titlecase }}
                  </div>
                  <ion-icon [name]="expandedProfileId === p.id ? 'chevron-up-outline' : 'chevron-down-outline'"
                  class="expand-icon"></ion-icon>
                </div>
                <!-- Expanded Details -->
                @if (expandedProfileId === p.id) {
                  <div class="conn-details">
                    <div class="conn-detail-row">
                      <span class="detail-label">Provider</span>
                      <span class="detail-value">{{ p.provider | titlecase }}</span>
                    </div>
                    <div class="conn-detail-row">
                      <span class="detail-label">Auth</span>
                      <span class="detail-value">{{ p.authMethod }}</span>
                    </div>
                    <div class="conn-detail-row">
                      <span class="detail-label">Models</span>
                      <span class="detail-value">{{ p.modelList.length }} available</span>
                    </div>
                    @if (p.modelList.length > 0) {
                      <div class="conn-detail-row">
                        <span class="detail-label">Active Model</span>
                        <span class="detail-value model-name">{{ p.modelList[0] }}</span>
                      </div>
                    }
                    <div class="conn-detail-row">
                      <span class="detail-label">Context Size</span>
                      <span class="detail-value">{{ p.contextSize }} tokens</span>
                    </div>
                    <div class="conn-detail-row">
                      <span class="detail-label">Streaming</span>
                      <span class="detail-value">{{ p.streamingEnabled ? 'Enabled' : 'Disabled' }}</span>
                    </div>
                    <div class="conn-detail-row">
                      <span class="detail-label">Template</span>
                      <span class="detail-value">{{ p.promptTemplate }}</span>
                    </div>
                    <!-- Model list chips -->
                    @if (p.modelList.length > 0) {
                      <div class="model-chips">
                        <span class="detail-label">All Models:</span>
                        <div class="chips-wrap">
                          @for (m of p.modelList | slice:0:10; track m) {
                            <ion-chip class="mb-chip model-chip">
                              {{ m }}
                            </ion-chip>
                          }
                          @if (p.modelList.length > 10) {
                            <span class="more-models">+{{ p.modelList.length - 10 }} more</span>
                          }
                        </div>
                      </div>
                    }
                    <div class="conn-actions">
                      <ion-button fill="clear" size="small" (click)="testProfile(p)">
                        <ion-icon slot="start" name="flash-outline"></ion-icon>
                        Test
                      </ion-button>
                      <ion-button fill="clear" size="small" (click)="refreshModels(p)">
                        <ion-icon slot="start" name="refresh-outline"></ion-icon>
                        Refresh Models
                      </ion-button>
                      <ion-button fill="clear" size="small" (click)="editProfile(p)">
                        <ion-icon slot="start" name="create-outline"></ion-icon>
                        Edit
                      </ion-button>
                      @if (!p.isDefault) {
                        <ion-button fill="clear" size="small" (click)="setAsDefault(p)">
                          <ion-icon slot="start" name="checkmark-circle-outline"></ion-icon>
                          Set Default
                        </ion-button>
                      }
                      <ion-button fill="clear" size="small" color="danger" (click)="confirmDeleteProfile(p)">
                        <ion-icon slot="start" name="trash-outline"></ion-icon>
                        Delete
                      </ion-button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
    
        <!-- ── Connection Editor (inline) ── -->
        @if (showEditor) {
          <div class="editor-panel mb-glass-card mb-fade-in">
            <div class="editor-header">
              <span class="editor-title">{{ isEditingProfile ? 'Edit Connection' : 'New Connection' }}</span>
              <ion-button fill="clear" size="small" (click)="cancelEditor()">
                <ion-icon slot="icon-only" name="close-outline"></ion-icon>
              </ion-button>
            </div>
            <div class="form-field">
              <label>Name</label>
              <ion-input [(ngModel)]="editorProfile.name" placeholder="e.g. Local Ollama, OpenAI" class="mb-input"></ion-input>
            </div>
            <div class="form-field">
              <label>Type</label>
              <div class="toggle-group">
                <span class="mb-chip" [class.active]="editorProfile.type === 'local'" (click)="editorProfile.type = 'local'">
                  <ion-icon name="desktop-outline"></ion-icon> Local
                </span>
                <span class="mb-chip" [class.active]="editorProfile.type === 'cloud'" (click)="editorProfile.type = 'cloud'">
                  <ion-icon name="cloud-done-outline"></ion-icon> Cloud
                </span>
              </div>
            </div>
            <div class="form-field">
              <label>Provider</label>
              <div class="toggle-group">
                <span class="mb-chip" [class.active]="editorProfile.provider === 'openai'" (click)="editorProfile.provider = 'openai'">OpenAI</span>
                <span class="mb-chip" [class.active]="editorProfile.provider === 'anthropic'" (click)="editorProfile.provider = 'anthropic'">Anthropic</span>
                <span class="mb-chip" [class.active]="editorProfile.provider === 'gemini'" (click)="editorProfile.provider = 'gemini'">Gemini</span>
                <span class="mb-chip" [class.active]="editorProfile.provider === 'ollama'" (click)="editorProfile.provider = 'ollama'">Ollama</span>
                <span class="mb-chip" [class.active]="editorProfile.provider === 'lmstudio'" (click)="editorProfile.provider = 'lmstudio'">LM Studio</span>
                <span class="mb-chip" [class.active]="editorProfile.provider === 'vllm'" (click)="editorProfile.provider = 'vllm'">vLLM</span>
                <span class="mb-chip" [class.active]="editorProfile.provider === 'custom'" (click)="editorProfile.provider = 'custom'">Custom</span>
              </div>
            </div>
            <div class="form-field">
              <label>Endpoint URL</label>
              <ion-input [(ngModel)]="editorProfile.endpointUrl" placeholder="http://localhost:11434" class="mb-input"></ion-input>
            </div>
            <div class="form-field">
              <label>Auth Method</label>
              <div class="toggle-group">
                <span class="mb-chip" [class.active]="editorProfile.authMethod === 'none'" (click)="editorProfile.authMethod = 'none'">None</span>
                <span class="mb-chip" [class.active]="editorProfile.authMethod === 'api-key'" (click)="editorProfile.authMethod = 'api-key'">API Key</span>
                <span class="mb-chip" [class.active]="editorProfile.authMethod === 'bearer-token'" (click)="editorProfile.authMethod = 'bearer-token'">Bearer Token</span>
              </div>
            </div>
            @if (editorProfile.authMethod !== 'none') {
              <div class="form-field">
                <label>API Key / Token</label>
                <ion-input [(ngModel)]="editorProfile.apiKey" type="password" placeholder="sk-..." class="mb-input"></ion-input>
              </div>
            }
            <div class="form-row">
              <div class="form-field half">
                <label>Context Size</label>
                <ion-input type="number" [(ngModel)]="editorProfile.contextSize" class="mb-input"></ion-input>
              </div>
              <div class="form-field half">
                <label>Prompt Template</label>
                <select [(ngModel)]="editorProfile.promptTemplate" class="native-select">
                  <option value="chatml">ChatML</option>
                  <option value="alpaca">Alpaca</option>
                  <option value="llama3">Llama 3</option>
                  <option value="mistral">Mistral</option>
                  <option value="raw">Raw</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-field half">
                <label>Temperature</label>
                <ion-input type="number" [(ngModel)]="editorProfile.defaultSampling!.temperature" step="0.1" min="0" max="2" class="mb-input"></ion-input>
              </div>
              <div class="form-field half">
                <label>Max Tokens</label>
                <ion-input type="number" [(ngModel)]="editorProfile.defaultSampling!.maxTokens" class="mb-input"></ion-input>
              </div>
            </div>
            <ion-item lines="none" class="toggle-item">
              <ion-label>Enable Streaming</ion-label>
              <ion-toggle [(ngModel)]="editorProfile.streamingEnabled" slot="end"></ion-toggle>
            </ion-item>
            <ion-item lines="none" class="toggle-item">
              <ion-label>Set as Default</ion-label>
              <ion-toggle [(ngModel)]="editorProfile.isDefault" slot="end"></ion-toggle>
            </ion-item>
            <div class="editor-actions">
              <ion-button fill="clear" (click)="testEditorProfile()">
                <ion-icon slot="start" name="flash-outline"></ion-icon>
                Test Connection
              </ion-button>
              <ion-button class="mb-btn-primary" (click)="saveProfile()">
                <ion-icon slot="start" name="save-outline"></ion-icon>
                {{ isEditingProfile ? 'Update' : 'Create' }}
              </ion-button>
            </div>
            <!-- Test Result -->
            @if (testResult) {
              <div class="test-result" [class.success]="testResult.success" [class.error]="!testResult.success">
                <ion-icon [name]="testResult.success ? 'checkmark-circle-outline' : 'close-circle-outline'"></ion-icon>
                <div class="test-result-text">
                  <strong>{{ testResult.success ? 'Connected!' : 'Failed' }}</strong>
                  <span>{{ testResult.message }}</span>
                </div>
              </div>
            }
          </div>
        }
    
        <!-- ── Image Generation ── -->
        <div class="mb-section-header" style="margin-top: 24px;">
          <span class="mb-section-title">
            <ion-icon name="color-palette-outline"></ion-icon> Image Generation
          </span>
          <ion-button fill="clear" size="small" (click)="startCreateImageConfig()">
            <ion-icon slot="start" name="add-outline"></ion-icon>
            Add
          </ion-button>
        </div>
    
        @if (imageConfigs.length === 0 && !showImageEditor) {
          <div class="empty-connections">
            <ion-icon name="color-palette-outline"></ion-icon>
            <p>No image providers configured</p>
            <ion-button class="mb-btn-primary" size="small" (click)="startCreateImageConfig()">
              <ion-icon slot="start" name="add-outline"></ion-icon>
              Add Provider
            </ion-button>
          </div>
        }
    
        @if (imageConfigs.length > 0) {
          <div class="connection-list">
            @for (ic of imageConfigs; track ic; let i = $index) {
              <div
                class="connection-card mb-card mb-fade-in"
                [style.animation-delay]="(i * 0.04) + 's'"
                [class.is-default]="ic.isDefault">
                <div class="conn-header" (click)="expandedImageConfigId = expandedImageConfigId === ic.id ? null : ic.id">
                  <div class="conn-status-dot online"></div>
                  <div class="conn-info">
                    <div class="conn-name">
                      {{ getImageProviderName(ic.providerType) }}
                      @if (ic.isDefault) {
                        <span class="mb-badge mb-badge-premise">Default</span>
                      }
                    </div>
                    <div class="conn-url">{{ ic.endpointUrl || 'No endpoint' }}</div>
                  </div>
                  <ion-icon [name]="expandedImageConfigId === ic.id ? 'chevron-up-outline' : 'chevron-down-outline'"
                  class="expand-icon"></ion-icon>
                </div>
                @if (expandedImageConfigId === ic.id) {
                  <div class="conn-details">
                    <div class="conn-detail-row">
                      <span class="detail-label">Model/Checkpoint</span>
                      <span class="detail-value model-name">{{ ic.modelOrCheckpoint || 'Default' }}</span>
                    </div>
                    <div class="conn-detail-row">
                      <span class="detail-label">Negative Defaults</span>
                      <span class="detail-value">{{ ic.negativePromptDefaults ? 'Set' : 'None' }}</span>
                    </div>
                    <div class="conn-actions">
                      <ion-button fill="clear" size="small" (click)="editImageConfig(ic)">
                        <ion-icon slot="start" name="create-outline"></ion-icon>
                        Edit
                      </ion-button>
                      @if (!ic.isDefault) {
                        <ion-button fill="clear" size="small" (click)="setImageConfigDefault(ic)">
                          <ion-icon slot="start" name="checkmark-circle-outline"></ion-icon>
                          Set Default
                        </ion-button>
                      }
                      <ion-button fill="clear" size="small" color="danger" (click)="confirmDeleteImageConfig(ic)">
                        <ion-icon slot="start" name="trash-outline"></ion-icon>
                        Delete
                      </ion-button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
    
        <!-- Image Config Editor -->
        @if (showImageEditor) {
          <div class="editor-panel mb-glass-card mb-fade-in">
            <div class="editor-header">
              <span class="editor-title">{{ isEditingImageConfig ? 'Edit Image Provider' : 'New Image Provider' }}</span>
              <ion-button fill="clear" size="small" (click)="showImageEditor = false">
                <ion-icon slot="icon-only" name="close-outline"></ion-icon>
              </ion-button>
            </div>
            <div class="form-field">
              <label>Provider Type</label>
              <div class="toggle-group">
                <span class="mb-chip" [class.active]="editingImageConfig.providerType === 'openai'" (click)="editingImageConfig.providerType = 'openai'">OpenAI</span>
                <span class="mb-chip" [class.active]="editingImageConfig.providerType === 'stability'" (click)="editingImageConfig.providerType = 'stability'">Stability</span>
                <span class="mb-chip" [class.active]="editingImageConfig.providerType === 'a1111'" (click)="editingImageConfig.providerType = 'a1111'">A1111</span>
                <span class="mb-chip" [class.active]="editingImageConfig.providerType === 'comfyui'" (click)="editingImageConfig.providerType = 'comfyui'">ComfyUI</span>
                <span class="mb-chip" [class.active]="editingImageConfig.providerType === 'copy-tags'" (click)="editingImageConfig.providerType = 'copy-tags'">Copy Tags</span>
              </div>
            </div>
            @if (editingImageConfig.providerType !== 'copy-tags') {
              <div class="form-field">
                <label>Endpoint URL</label>
                <ion-input [(ngModel)]="editingImageConfig.endpointUrl"
                  [placeholder]="getImageEndpointPlaceholder()"
                class="mb-input"></ion-input>
              </div>
            }
            @if (editingImageConfig.providerType !== 'copy-tags' && editingImageConfig.providerType !== 'openai') {
              <div class="form-field">
                <label>Model / Checkpoint</label>
                <ion-input [(ngModel)]="editingImageConfig.modelOrCheckpoint"
                  placeholder="e.g. sd_xl_base_1.0"
                class="mb-input"></ion-input>
              </div>
            }
            <div class="form-field">
              <label>Default Negative Prompt</label>
              <ion-input [(ngModel)]="editingImageConfig.negativePromptDefaults"
                placeholder="low quality, bad anatomy, blurry..."
              class="mb-input"></ion-input>
            </div>
            <ion-item lines="none" class="toggle-item">
              <ion-label>Set as Default</ion-label>
              <ion-toggle [(ngModel)]="editingImageConfig.isDefault" slot="end"></ion-toggle>
            </ion-item>
            <div class="editor-actions">
              <ion-button class="mb-btn-primary" (click)="saveImageConfig()">
                <ion-icon slot="start" name="save-outline"></ion-icon>
                {{ isEditingImageConfig ? 'Update' : 'Create' }}
              </ion-button>
            </div>
          </div>
        }
    
        <!-- ── Security ── -->
        <div class="mb-section-header">
          <span class="mb-section-title">
            <ion-icon name="shield-outline"></ion-icon> Security
          </span>
        </div>
        <ion-list class="settings-list">
          <ion-item class="settings-item">
            <ion-icon name="key-outline" slot="start"></ion-icon>
            <ion-label>
              <h3>API Keys</h3>
              <p>API keys are stored locally in your browser's IndexedDB</p>
            </ion-label>
          </ion-item>
          <ion-item class="settings-item">
            <ion-icon name="shield-outline" slot="start"></ion-icon>
            <ion-label>
              <h3>Privacy</h3>
              <p>All data is stored locally on your device</p>
            </ion-label>
          </ion-item>
        </ion-list>
    
        <!-- ── About ── -->
        <div class="mb-section-header">
          <span class="mb-section-title">About</span>
        </div>
        <ion-list class="settings-list">
          <ion-item class="settings-item">
            <ion-icon name="information-circle-outline" slot="start"></ion-icon>
            <ion-label>
              <h3>MasterBookAI</h3>
              <p>Version 1.0.0 — Local-first AI Chat & Story Platform</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>
    `,
  styles: [`
    .settings-container { max-width: 700px; margin: 0 auto; }

    .settings-list { background: transparent; margin-bottom: 16px; }

    .settings-item {
      --background: var(--mb-bg-card);
      --border-color: var(--mb-border);
      border-radius: var(--mb-radius-md);
      margin-bottom: 6px;
    }

    .settings-item ion-icon { color: var(--mb-primary); font-size: 22px; }
    .settings-item h3 { font-weight: 600; font-size: 15px; color: var(--mb-text-primary); }
    .settings-item p { font-size: 13px; color: var(--mb-text-muted); }

    .empty-connections {
      text-align: center; padding: 32px 16px;
      color: var(--mb-text-muted);
    }
    .empty-connections ion-icon { font-size: 40px; opacity: 0.4; display: block; margin: 0 auto 12px; }

    .connection-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }

    .connection-card { padding: 0; overflow: hidden; }
    .connection-card.is-default { border-color: rgba(167, 139, 250, 0.3); }

    .conn-header {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px; cursor: pointer;
      transition: background var(--mb-transition-fast);
    }
    .conn-header:hover { background: var(--mb-bg-card-hover); }

    .conn-status-dot {
      width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
      transition: background 200ms;
    }
    .conn-status-dot.online { background: var(--mb-success); box-shadow: 0 0 6px rgba(52, 211, 153, 0.5); }
    .conn-status-dot.offline { background: var(--mb-danger); }
    .conn-status-dot.unknown { background: var(--mb-text-muted); }

    .conn-info { flex: 1; min-width: 0; }
    .conn-name {
      font-weight: 700; font-size: 15px; color: var(--mb-text-primary);
      display: flex; align-items: center; gap: 8px;
    }
    .conn-url { font-size: 12px; color: var(--mb-text-muted); }

    .conn-type-badge {
      display: flex; align-items: center; gap: 4px;
      font-size: 11px; color: var(--mb-text-muted);
      background: var(--mb-bg-elevated); padding: 3px 8px;
      border-radius: var(--mb-radius-full);
    }
    .conn-type-badge ion-icon { font-size: 13px; }

    .expand-icon { font-size: 16px; color: var(--mb-text-muted); }

    .conn-details {
      padding: 0 16px 16px; border-top: 1px solid var(--mb-border);
    }

    .conn-detail-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 0; font-size: 13px;
    }
    .detail-label { color: var(--mb-text-muted); }
    .detail-value { color: var(--mb-text-secondary); font-weight: 500; }
    .model-name { font-family: monospace; font-size: 12px; color: var(--mb-primary); }

    .model-chips { margin-top: 8px; }
    .chips-wrap { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .model-chip { font-size: 11px; font-family: monospace; padding: 2px 8px; }
    .more-models { font-size: 11px; color: var(--mb-text-muted); align-self: center; }

    .conn-actions {
      display: flex; flex-wrap: wrap; gap: 0; margin-top: 12px;
      padding-top: 10px; border-top: 1px solid var(--mb-border);
    }

    /* ── Editor Panel ── */
    .editor-panel { padding: 20px; margin-bottom: 20px; }

    .editor-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 16px;
    }
    .editor-title { font-weight: 700; font-size: 17px; color: var(--mb-text-primary); }

    .form-field { margin-bottom: 14px; }
    .form-field label {
      display: block; font-size: 13px; font-weight: 600;
      color: var(--mb-text-secondary); margin-bottom: 6px;
    }

    .form-row { display: flex; gap: 12px; }
    .form-field.half { flex: 1; }

    .toggle-group { display: flex; gap: 8px; flex-wrap: wrap; }

    .native-select {
      width: 100%; padding: 10px 14px;
      background: var(--mb-bg-input); color: var(--mb-text-primary);
      border: 1px solid var(--mb-border); border-radius: var(--mb-radius-md);
      font-size: 14px; appearance: auto;
    }

    .toggle-item {
      --background: var(--mb-bg-elevated);
      border-radius: var(--mb-radius-md);
      border: 1px solid var(--mb-border);
      margin-bottom: 8px;
    }

    .editor-actions {
      display: flex; justify-content: flex-end; gap: 8px;
      margin-top: 16px;
    }

    .test-result {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 12px 14px; border-radius: var(--mb-radius-md);
      margin-top: 12px; font-size: 13px;
    }
    .test-result.success {
      background: rgba(52, 211, 153, 0.1);
      border: 1px solid rgba(52, 211, 153, 0.3);
    }
    .test-result.error {
      background: rgba(248, 113, 113, 0.1);
      border: 1px solid rgba(248, 113, 113, 0.3);
    }
    .test-result ion-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
    .test-result.success ion-icon { color: var(--mb-success); }
    .test-result.error ion-icon { color: var(--mb-danger); }
    .test-result-text { display: flex; flex-direction: column; gap: 2px; }
    .test-result-text strong { color: var(--mb-text-primary); }
    .test-result-text span { color: var(--mb-text-muted); }
  `],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
    IonLabel, IonIcon, IonToggle, IonButton, IonInput,
    IonChip
  ],
})
export class SettingsPage implements OnInit {
  profiles: ConnectionProfile[] = [];
  expandedProfileId: string | null = null;
  connectionStatus: Record<string, 'online' | 'offline' | 'unknown'> = {};

  // Editor state
  showEditor = false;
  isEditingProfile = false;
  editingProfileId?: string;
  editorProfile: Partial<ConnectionProfile> = createDefaultConnectionProfile();
  testResult?: { success: boolean; message: string };

  // Image config state
  imageConfigs: ImageGenConfig[] = [];
  expandedImageConfigId: string | null = null;
  showImageEditor = false;
  isEditingImageConfig = false;
  editingImageConfigId?: string;
  editingImageConfig: Partial<ImageGenConfig> = this.createDefaultImageGenConfig();

  constructor(
    private connectionService: ConnectionService,
    private imageProviderService: ImageProviderService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      serverOutline, colorPaletteOutline, keyOutline, cloudOutline,
      informationCircleOutline, shieldOutline, addOutline, trashOutline,
      refreshOutline, checkmarkCircleOutline, closeCircleOutline,
      flashOutline, saveOutline, createOutline, closeOutline,
      wifiOutline, cloudDoneOutline, desktopOutline, chevronDownOutline,
      chevronUpOutline, imageOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadProfiles();
    await this.loadImageConfigs();
  }

  async loadProfiles(): Promise<void> {
    this.profiles = await this.connectionService.getAllProfiles();
  }

  toggleExpand(id: string): void {
    this.expandedProfileId = this.expandedProfileId === id ? null : id;
  }

  // ── Profile CRUD ──

  startCreateProfile(): void {
    this.showEditor = true;
    this.isEditingProfile = false;
    this.editingProfileId = undefined;
    this.editorProfile = createDefaultConnectionProfile();
    this.testResult = undefined;
  }

  editProfile(p: ConnectionProfile): void {
    this.showEditor = true;
    this.isEditingProfile = true;
    this.editingProfileId = p.id;
    this.editorProfile = { ...p, defaultSampling: { ...p.defaultSampling } };
    this.testResult = undefined;
  }

  cancelEditor(): void {
    this.showEditor = false;
    this.testResult = undefined;
  }

  async saveProfile(): Promise<void> {
    if (!this.editorProfile.name?.trim()) {
      const toast = await this.toastCtrl.create({ message: 'Connection name is required', duration: 2000, color: 'danger' });
      await toast.present();
      return;
    }

    if (this.isEditingProfile && this.editingProfileId) {
      await this.connectionService.updateProfile(this.editingProfileId, this.editorProfile);
    } else {
      await this.connectionService.createProfile(this.editorProfile);
    }

    await this.loadProfiles();
    this.showEditor = false;
    this.testResult = undefined;

    const toast = await this.toastCtrl.create({
      message: this.isEditingProfile ? 'Connection updated!' : 'Connection created!',
      duration: 2000, color: 'success'
    });
    await toast.present();
  }

  async confirmDeleteProfile(p: ConnectionProfile): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Delete Connection',
      message: `Delete "${p.name}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: async () => {
            await this.connectionService.deleteProfile(p.id);
            await this.loadProfiles();
            if (this.expandedProfileId === p.id) this.expandedProfileId = null;
          },
        },
      ],
    });
    await alert.present();
  }

  async setAsDefault(p: ConnectionProfile): Promise<void> {
    await this.connectionService.updateProfile(p.id, { isDefault: true });
    await this.loadProfiles();
    const toast = await this.toastCtrl.create({ message: `${p.name} set as default`, duration: 2000, color: 'success' });
    await toast.present();
  }

  // ── Testing ──

  async testProfile(p: ConnectionProfile): Promise<void> {
    this.connectionStatus[p.id] = 'unknown';
    try {
      const models = await this.connectionService.testConnection(p);
      this.connectionStatus[p.id] = 'online';
      const toast = await this.toastCtrl.create({
        message: `Connected! Found ${models.length} model(s)`,
        duration: 2500, color: 'success'
      });
      await toast.present();
    } catch (e: any) {
      this.connectionStatus[p.id] = 'offline';
      const toast = await this.toastCtrl.create({
        message: `Connection failed: ${e.message}`,
        duration: 3000, color: 'danger'
      });
      await toast.present();
    }
  }

  async testEditorProfile(): Promise<void> {
    this.testResult = undefined;
    try {
      const models = await this.connectionService.testConnection(this.editorProfile);
      this.testResult = {
        success: true,
        message: `Found ${models.length} model(s): ${models.slice(0, 3).join(', ')}${models.length > 3 ? '...' : ''}`
      };
      // Auto-populate model list
      if (!this.editorProfile.modelList || this.editorProfile.modelList.length === 0) {
        this.editorProfile.modelList = models;
      }
    } catch (e: any) {
      this.testResult = { success: false, message: e.message };
    }
  }

  async refreshModels(p: ConnectionProfile): Promise<void> {
    try {
      const models = await this.connectionService.refreshModels(p.id);
      await this.loadProfiles();
      const toast = await this.toastCtrl.create({
        message: `Found ${models.length} model(s)`,
        duration: 2000, color: 'success'
      });
      await toast.present();
      this.connectionStatus[p.id] = 'online';
    } catch (e: any) {
      this.connectionStatus[p.id] = 'offline';
      const toast = await this.toastCtrl.create({
        message: `Failed: ${e.message}`,
        duration: 3000, color: 'danger'
      });
      await toast.present();
    }
  }

  // ── Image Config CRUD ──

  async loadImageConfigs(): Promise<void> {
    this.imageConfigs = await this.imageProviderService.getAllConfigs();
  }

  private createDefaultImageGenConfig(): Partial<ImageGenConfig> {
    return {
      providerType: 'copy-tags',
      endpointUrl: '',
      modelOrCheckpoint: '',
      stylePresets: [],
      negativePromptDefaults: 'low quality, bad anatomy, worst quality, blurry',
      isDefault: false,
    };
  }

  startCreateImageConfig(): void {
    this.showImageEditor = true;
    this.isEditingImageConfig = false;
    this.editingImageConfigId = undefined;
    this.editingImageConfig = this.createDefaultImageGenConfig();
  }

  editImageConfig(ic: ImageGenConfig): void {
    this.showImageEditor = true;
    this.isEditingImageConfig = true;
    this.editingImageConfigId = ic.id;
    this.editingImageConfig = { ...ic };
  }

  async saveImageConfig(): Promise<void> {
    if (this.isEditingImageConfig && this.editingImageConfigId) {
      await this.imageProviderService.updateConfig(this.editingImageConfigId, this.editingImageConfig);
    } else {
      await this.imageProviderService.createConfig(this.editingImageConfig);
    }

    await this.loadImageConfigs();
    this.showImageEditor = false;

    const toast = await this.toastCtrl.create({
      message: this.isEditingImageConfig ? 'Image provider updated!' : 'Image provider created!',
      duration: 2000, color: 'success'
    });
    await toast.present();
  }

  async confirmDeleteImageConfig(ic: ImageGenConfig): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Delete Image Provider',
      message: `Delete this ${this.getImageProviderName(ic.providerType)} configuration?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: async () => {
            await this.imageProviderService.deleteConfig(ic.id);
            await this.loadImageConfigs();
            if (this.expandedImageConfigId === ic.id) this.expandedImageConfigId = null;
          },
        },
      ],
    });
    await alert.present();
  }

  async setImageConfigDefault(ic: ImageGenConfig): Promise<void> {
    await this.imageProviderService.updateConfig(ic.id, { isDefault: true });
    await this.loadImageConfigs();
    const toast = await this.toastCtrl.create({
      message: `${this.getImageProviderName(ic.providerType)} set as default`,
      duration: 2000, color: 'success'
    });
    await toast.present();
  }

  getImageProviderName(type: string): string {
    switch (type) {
      case 'openai': return 'OpenAI (DALL·E)';
      case 'stability': return 'Stability AI';
      case 'a1111': return 'Automatic1111';
      case 'comfyui': return 'ComfyUI';
      case 'copy-tags': return 'Copy Tags Only';
      default: return type;
    }
  }

  getImageEndpointPlaceholder(): string {
    switch (this.editingImageConfig.providerType) {
      case 'openai': return 'https://api.openai.com';
      case 'stability': return 'https://api.stability.ai';
      case 'a1111': return 'http://localhost:7860';
      case 'comfyui': return 'http://localhost:8188';
      default: return '';
    }
  }
}
