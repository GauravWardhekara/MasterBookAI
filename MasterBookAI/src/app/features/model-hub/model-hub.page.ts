import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonSearchbar, IonSegment, IonSegmentButton, IonLabel, IonSpinner,
  IonRefresher, IonRefresherContent, IonBadge,
  ModalController, AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline, cloudDownloadOutline, trashOutline, playOutline,
  stopOutline, refreshOutline, searchOutline, hardwareChipOutline,
  downloadOutline, serverOutline, cloudOutline, phonePortraitOutline,
  desktopOutline, tabletPortraitOutline, informationCircleOutline,
  checkmarkCircleOutline, alertCircleOutline, hourglassOutline
} from 'ionicons/icons';
import { Router } from '@angular/router';
import { ModelHubService } from '../../core/services/model-hub.service';
import { DeviceCapabilityService } from '../../core/services/device-capability.service';
import { HubModel, ModelFile, DeviceCapabilities, LocalModel } from '../../core/models/model-hub.model';

@Component({
  selector: 'app-model-hub',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonSearchbar, IonSegment, IonSegmentButton, IonLabel, IonSpinner,
    IonRefresher, IonRefresherContent, IonBadge
  ],
  template: `
    <ion-header class="ion-no-border mh-header">
      <ion-toolbar class="transparent-toolbar">
        <ion-buttons slot="start">
          <ion-button (click)="goBack()">
            <ion-icon slot="icon-only" name="chevron-back-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title class="mh-title">Models</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="refreshAll()">
            <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Device Info Banner -->
      <div class="device-banner" *ngIf="deviceCaps">
        <ion-icon [name]="getPlatformIcon()"></ion-icon>
        <span class="device-info">
          {{ deviceCaps.os }} • {{ deviceCaps.ramGB }} GB RAM
          <span *ngIf="deviceCaps.hasWebGPU"> • WebGPU</span>
        </span>
        <ion-badge [color]="getTierColor()" class="tier-badge">{{ deviceCaps.tier | uppercase }}</ion-badge>
      </div>

      <!-- Tabs -->
      <ion-segment [(ngModel)]="activeTab" (ionChange)="onTabChange()" class="mh-segment">
        <ion-segment-button value="local">
          <ion-label>Local</ion-label>
        </ion-segment-button>
        <ion-segment-button value="ollama">
          <ion-label>Ollama</ion-label>
        </ion-segment-button>
        <ion-segment-button value="huggingface">
          <ion-label>HuggingFace</ion-label>
        </ion-segment-button>
        <ion-segment-button value="cloud">
          <ion-label>Cloud</ion-label>
        </ion-segment-button>
      </ion-segment>
    </ion-header>

    <ion-content class="mh-content">
      <ion-refresher slot="fixed" (ionRefresh)="doRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="mh-container ion-padding">

        <!-- Search Bar (for HuggingFace & Ollama) -->
        <div *ngIf="activeTab === 'huggingface'" class="search-wrapper">
          <ion-searchbar
            [(ngModel)]="searchQuery"
            placeholder="Search GGUF models..."
            (ionInput)="onSearchInput($event)"
            class="mh-searchbar"
            debounce="500">
          </ion-searchbar>
        </div>

        <!-- Loading Spinner -->
        <div class="loading-state" *ngIf="isLoading">
          <ion-spinner name="crescent" color="warning"></ion-spinner>
          <span>Loading models...</span>
        </div>

        <!-- ═══ LOCAL TAB ═══ -->
        <ng-container *ngIf="activeTab === 'local' && !isLoading">
          <div class="empty-state" *ngIf="localModels.length === 0">
            <ion-icon name="hardware-chip-outline" class="empty-icon"></ion-icon>
            <h3>No Local Models</h3>
            <p>Download models from the Ollama or HuggingFace tabs to get started.</p>
          </div>

          <div class="model-card" *ngFor="let model of localModels">
            <div class="card-top">
              <div class="card-info">
                <div class="model-name">{{ model.name }}</div>
                <div class="model-meta">
                  {{ model.source }} • {{ formatBytes(model.sizeBytes) }}
                  <span *ngIf="model.quantType"> • {{ model.quantType }}</span>
                </div>
              </div>
              <div class="status-badge" [ngClass]="'status-' + model.status">
                <ion-icon [name]="getStatusIcon(model.status)"></ion-icon>
                {{ model.status }}
              </div>
            </div>

            <!-- Download progress -->
            <div class="progress-bar-wrapper" *ngIf="model.status === 'downloading'">
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="model.downloadProgress"></div>
              </div>
              <span class="progress-text">{{ model.downloadProgress }}%</span>
            </div>

            <div class="card-actions">
              <ion-button fill="clear" size="small" color="danger" (click)="deleteLocalModel(model)">
                <ion-icon slot="start" name="trash-outline"></ion-icon> Delete
              </ion-button>
            </div>
          </div>
        </ng-container>

        <!-- ═══ OLLAMA TAB ═══ -->
        <ng-container *ngIf="activeTab === 'ollama' && !isLoading">
          <!-- Ollama Pull Input -->
          <div class="pull-section">
            <div class="pull-header">Pull a model from Ollama</div>
            <div class="pull-input-row">
              <input
                type="text"
                [(ngModel)]="ollamaPullName"
                placeholder="e.g. llama3.2, mistral, gemma2..."
                class="pull-input" />
              <ion-button (click)="pullOllamaModel()" [disabled]="!ollamaPullName || isPulling" class="pull-btn">
                <ion-icon slot="start" name="cloud-download-outline"></ion-icon>
                Pull
              </ion-button>
            </div>
            <!-- Pull progress -->
            <div class="pull-progress" *ngIf="isPulling">
              <div class="progress-bar">
                <div class="progress-fill animated" [style.width.%]="pullProgress"></div>
              </div>
              <span class="progress-text">{{ pullStatus }}</span>
            </div>
          </div>

          <div class="section-divider">
            <span>Installed Models</span>
          </div>

          <div class="empty-state" *ngIf="ollamaModels.length === 0">
            <ion-icon name="server-outline" class="empty-icon"></ion-icon>
            <h3>No Ollama Models</h3>
            <p>Make sure Ollama is running, then pull a model above.</p>
          </div>

          <div class="model-card" *ngFor="let model of ollamaModels">
            <div class="card-top">
              <div class="card-info">
                <div class="model-name">{{ model.name }}</div>
                <div class="model-meta">
                  {{ model.description }}
                  <span *ngIf="model.parameterCount"> • {{ model.parameterCount }}</span>
                </div>
              </div>
              <ion-icon name="checkmark-circle-outline" color="success" class="installed-icon"></ion-icon>
            </div>
            <div class="card-tags">
              <span class="tag" *ngFor="let t of model.tags">{{ t }}</span>
            </div>
            <div class="card-actions">
              <ion-button fill="clear" size="small" color="danger" (click)="deleteOllamaModel(model)">
                <ion-icon slot="start" name="trash-outline"></ion-icon> Remove
              </ion-button>
            </div>
          </div>
        </ng-container>

        <!-- ═══ HUGGINGFACE TAB ═══ -->
        <ng-container *ngIf="activeTab === 'huggingface' && !isLoading">
          <div class="empty-state" *ngIf="hfModels.length === 0 && !searchQuery">
            <ion-icon name="search-outline" class="empty-icon"></ion-icon>
            <h3>Search HuggingFace</h3>
            <p>Search for GGUF models compatible with your device.</p>
          </div>

          <div class="empty-state" *ngIf="hfModels.length === 0 && searchQuery">
            <h3>No Results</h3>
            <p>No compatible GGUF models found for "{{ searchQuery }}".</p>
          </div>

          <div class="model-card" *ngFor="let model of hfModels">
            <div class="card-top">
              <div class="card-info">
                <div class="model-name">{{ model.name }}</div>
                <div class="model-meta">
                  {{ model.id }}
                  <span *ngIf="model.parameterCount"> • {{ model.parameterCount }}</span>
                </div>
              </div>
              <ion-icon name="information-circle-outline" class="info-icon"></ion-icon>
            </div>
            <div class="card-stats" *ngIf="model.downloads || model.likes">
              <span *ngIf="model.downloads">{{ formatNumber(model.downloads!) }} downloads</span>
              <span *ngIf="model.likes"> • {{ model.likes }} likes</span>
            </div>
            <div class="card-tags">
              <span class="tag" *ngFor="let t of model.tags?.slice(0, 5)">{{ t }}</span>
            </div>
            <div class="card-actions">
              <ion-button fill="solid" size="small" color="warning" (click)="viewHFModelFiles(model)">
                <ion-icon slot="start" name="download-outline"></ion-icon> View Files
              </ion-button>
            </div>
          </div>
        </ng-container>

        <!-- ═══ CLOUD TAB ═══ -->
        <ng-container *ngIf="activeTab === 'cloud' && !isLoading">
          <div class="empty-state" *ngIf="cloudModels.length === 0">
            <ion-icon name="cloud-outline" class="empty-icon"></ion-icon>
            <h3>No Cloud Models</h3>
            <p>Configure cloud providers in Settings → Connections.</p>
          </div>

          <div class="model-card" *ngFor="let model of cloudModels">
            <div class="card-top">
              <div class="card-info">
                <div class="model-name">{{ model.name }}</div>
                <div class="model-meta">{{ model.description }}</div>
              </div>
              <ion-icon name="cloud-outline" class="cloud-icon"></ion-icon>
            </div>
            <div class="card-tags">
              <span class="tag cloud-tag" *ngFor="let t of model.tags">{{ t }}</span>
            </div>
          </div>
        </ng-container>

      </div>
    </ion-content>
  `,
  styles: [`
    .mh-header { background: #1c1c1e; }
    .transparent-toolbar { --background: transparent; color: white; }
    .mh-title { font-size: 18px; font-weight: 700; text-align: center; }

    /* Device Banner */
    .device-banner {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 16px; margin: 0 16px 8px;
      background: rgba(255,255,255,0.05); border-radius: 10px;
      font-size: 13px; color: #a1a1aa;
    }
    .device-banner ion-icon { font-size: 18px; color: white; }
    .device-info { flex: 1; }
    .tier-badge { font-size: 11px; font-weight: 700; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 20px; }

    /* Segment */
    .mh-segment {
      --background: transparent; margin: 4px 16px 8px; border-radius: 10px;
    }
    .mh-segment ion-segment-button {
      --color: #a1a1aa; --color-checked: white;
      --indicator-color: rgba(255,255,255,0.1);
      font-size: 13px; font-weight: 500;
      min-height: 36px; text-transform: none;
    }

    /* Content */
    .mh-content { --background: #1c1c1e; }
    .mh-container { max-width: 700px; margin: 0 auto; padding-bottom: 40px; }

    /* Search */
    .search-wrapper { margin-bottom: 16px; }
    .mh-searchbar {
      --background: #27272a; --color: white; --placeholder-color: #71717a;
      --icon-color: #71717a; --border-radius: 12px; --box-shadow: none;
      padding: 0;
    }

    /* Loading */
    .loading-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 12px; padding: 60px 0; color: #a1a1aa;
    }

    /* Empty State */
    .empty-state {
      text-align: center; padding: 48px 24px; color: #71717a;
    }
    .empty-icon { font-size: 48px; color: #3f3f46; margin-bottom: 16px; display: block; }
    .empty-state h3 { color: white; font-size: 18px; margin: 0 0 8px; }
    .empty-state p { font-size: 14px; margin: 0; }

    /* Model Cards */
    .model-card {
      background: #27272a; border-radius: 14px; padding: 16px;
      margin-bottom: 12px; transition: transform 0.15s ease;
    }
    .model-card:active { transform: scale(0.98); }

    .card-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .card-info { flex: 1; padding-right: 12px; }
    .model-name { font-size: 16px; font-weight: 700; color: white; margin-bottom: 4px; }
    .model-meta { font-size: 13px; color: #a1a1aa; }
    .card-stats { font-size: 12px; color: #71717a; margin-top: 6px; }
    .info-icon { color: #a1a1aa; font-size: 22px; }
    .installed-icon { font-size: 22px; }
    .cloud-icon { font-size: 22px; color: #60a5fa; }

    /* Status Badge */
    .status-badge {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px;
      text-transform: capitalize;
    }
    .status-badge ion-icon { font-size: 14px; }
    .status-ready { background: rgba(34,197,94,0.15); color: #22c55e; }
    .status-loaded { background: rgba(59,130,246,0.15); color: #3b82f6; }
    .status-loading { background: rgba(234,179,8,0.15); color: #eab308; }
    .status-downloading { background: rgba(168,85,247,0.15); color: #a855f7; }
    .status-error { background: rgba(239,68,68,0.15); color: #ef4444; }

    /* Tags */
    .card-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .tag {
      font-size: 11px; color: #a1a1aa; padding: 2px 8px;
      background: rgba(255,255,255,0.06); border-radius: 6px;
    }
    .cloud-tag { background: rgba(96,165,250,0.1); color: #60a5fa; }

    /* Card Actions */
    .card-actions {
      display: flex; justify-content: flex-end; margin-top: 10px; gap: 8px;
    }

    /* Progress Bar */
    .progress-bar-wrapper {
      display: flex; align-items: center; gap: 8px; margin-top: 10px;
    }
    .progress-bar {
      flex: 1; height: 6px; background: #3f3f46; border-radius: 3px; overflow: hidden;
    }
    .progress-fill {
      height: 100%; background: linear-gradient(90deg, #a855f7, #ec4899);
      border-radius: 3px; transition: width 0.3s ease;
    }
    .progress-fill.animated {
      background: linear-gradient(90deg, #eab308, #f59e0b);
    }
    .progress-text { font-size: 12px; color: #a1a1aa; white-space: nowrap; }

    /* Pull Section */
    .pull-section {
      background: #27272a; border-radius: 14px; padding: 16px; margin-bottom: 16px;
    }
    .pull-header { font-size: 15px; font-weight: 600; color: white; margin-bottom: 12px; }
    .pull-input-row { display: flex; gap: 8px; }
    .pull-input {
      flex: 1; background: #1c1c1e; color: white; border: 1px solid #3f3f46;
      border-radius: 10px; padding: 10px 14px; font-size: 14px; outline: none;
    }
    .pull-input:focus { border-color: #eab308; }
    .pull-btn { --border-radius: 10px; font-weight: 600; }
    .pull-progress { margin-top: 12px; }

    /* Section Divider */
    .section-divider {
      display: flex; align-items: center; margin: 20px 0 14px; color: #71717a; font-size: 13px; font-weight: 600;
    }
    .section-divider::after {
      content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.08); margin-left: 12px;
    }
  `]
})
export class ModelHubPage implements OnInit {
  activeTab: string = 'local';
  searchQuery = '';
  isLoading = false;

  // Device
  deviceCaps?: DeviceCapabilities;

  // Data
  localModels: LocalModel[] = [];
  ollamaModels: HubModel[] = [];
  hfModels: HubModel[] = [];
  cloudModels: HubModel[] = [];

  // Ollama pull state
  ollamaPullName = '';
  isPulling = false;
  pullProgress = 0;
  pullStatus = '';

  constructor(
    private router: Router,
    private modelHub: ModelHubService,
    private deviceCapService: DeviceCapabilityService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({
      chevronBackOutline, cloudDownloadOutline, trashOutline, playOutline,
      stopOutline, refreshOutline, searchOutline, hardwareChipOutline,
      downloadOutline, serverOutline, cloudOutline, phonePortraitOutline,
      desktopOutline, tabletPortraitOutline, informationCircleOutline,
      checkmarkCircleOutline, alertCircleOutline, hourglassOutline
    });
  }

  async ngOnInit() {
    this.deviceCaps = await this.deviceCapService.detect();
    await this.loadTab();
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  async refreshAll() {
    await this.loadTab();
  }

  async doRefresh(event: any) {
    await this.loadTab();
    event.target.complete();
  }

  async onTabChange() {
    await this.loadTab();
  }

  async loadTab() {
    this.isLoading = true;
    try {
      switch (this.activeTab) {
        case 'local':
          this.localModels = await this.modelHub.getLocalModels();
          break;
        case 'ollama':
          this.ollamaModels = await this.modelHub.getOllamaModels();
          break;
        case 'huggingface':
          if (this.searchQuery) {
            await this.searchHF();
          } else {
            // Load trending models
            const all = await this.modelHub.searchHuggingFaceModels('', 30);
            const maxSize = this.deviceCapService.getMaxModelSizeGB(this.deviceCaps?.tier || 'medium');
            this.hfModels = this.modelHub.filterByCompatibility(all, maxSize);
          }
          break;
        case 'cloud':
          this.cloudModels = await this.modelHub.getCloudModels();
          break;
      }
    } catch (err) {
      console.error('Failed to load tab:', err);
    }
    this.isLoading = false;
  }

  async onSearchInput(event: any) {
    this.searchQuery = event.detail.value || '';
    if (this.activeTab === 'huggingface') {
      await this.searchHF();
    }
  }

  private async searchHF() {
    this.isLoading = true;
    const all = await this.modelHub.searchHuggingFaceModels(this.searchQuery, 30);
    const maxSize = this.deviceCapService.getMaxModelSizeGB(this.deviceCaps?.tier || 'medium');
    this.hfModels = this.modelHub.filterByCompatibility(all, maxSize);
    this.isLoading = false;
  }

  // ─── Ollama Pull ──────────────────────────────────────────────────────

  async pullOllamaModel() {
    if (!this.ollamaPullName || this.isPulling) return;
    this.isPulling = true;
    this.pullProgress = 0;
    this.pullStatus = 'Starting pull...';

    try {
      for await (const update of this.modelHub.pullOllamaModel(this.ollamaPullName)) {
        this.pullStatus = update.status;
        if (update.total && update.completed) {
          this.pullProgress = Math.round((update.completed / update.total) * 100);
        }
      }
      this.pullStatus = 'Complete!';
      this.pullProgress = 100;

      // Track locally and refresh
      await this.modelHub.addLocalModel({
        name: this.ollamaPullName,
        source: 'ollama',
        modelId: this.ollamaPullName,
        status: 'ready',
        provider: 'ollama',
      });

      const toast = await this.toastCtrl.create({
        message: `Model "${this.ollamaPullName}" pulled successfully!`,
        duration: 3000, color: 'success',
      });
      await toast.present();

      this.ollamaPullName = '';
      this.ollamaModels = await this.modelHub.getOllamaModels();
    } catch (err: any) {
      this.pullStatus = `Error: ${err.message}`;
      const toast = await this.toastCtrl.create({
        message: `Failed to pull model: ${err.message}`,
        duration: 4000, color: 'danger',
      });
      await toast.present();
    }
    this.isPulling = false;
  }

  // ─── Delete ───────────────────────────────────────────────────────────

  async deleteOllamaModel(model: HubModel) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Model',
      message: `Remove "${model.name}" from Ollama? This will free up disk space.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: async () => {
            try {
              await this.modelHub.deleteOllamaModel(model.id);
              this.ollamaModels = await this.modelHub.getOllamaModels();
              const toast = await this.toastCtrl.create({
                message: 'Model deleted.', duration: 2000, color: 'warning',
              });
              await toast.present();
            } catch (err: any) {
              const toast = await this.toastCtrl.create({
                message: `Failed: ${err.message}`, duration: 3000, color: 'danger',
              });
              await toast.present();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteLocalModel(model: LocalModel) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Model',
      message: `Remove "${model.name}" from local tracking?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: async () => {
            await this.modelHub.deleteLocalModel(model.id);
            this.localModels = await this.modelHub.getLocalModels();
          }
        }
      ]
    });
    await alert.present();
  }

  // ─── HuggingFace File View ────────────────────────────────────────────

  async viewHFModelFiles(model: HubModel) {
    const toast = await this.toastCtrl.create({
      message: `Loading files for ${model.id}...`, duration: 1500,
    });
    await toast.present();

    const files = await this.modelHub.getHuggingFaceModelFiles(model.id);
    if (files.length === 0) {
      const t = await this.toastCtrl.create({
        message: 'No GGUF files found in this repository.', duration: 3000, color: 'warning',
      });
      await t.present();
      return;
    }

    const maxSize = this.deviceCapService.getMaxModelSizeGB(this.deviceCaps?.tier || 'medium');
    const buttons = files.map(f => {
      const sizeStr = this.modelHub.formatBytes(f.sizeBytes);
      const compatible = f.requiredRamGB <= maxSize;
      return {
        text: `${f.filename} (${sizeStr})${compatible ? '' : ' ⚠️ Too large'}`,
        cssClass: compatible ? '' : 'incompatible-option',
        handler: () => {
          if (compatible) {
            this.downloadHFFile(model, f);
          } else {
            this.showIncompatibleWarning(f);
          }
        }
      };
    });
    buttons.push({ text: 'Cancel', cssClass: 'cancel-btn', handler: () => {} });

    const alert = await this.alertCtrl.create({
      header: `${model.name} — Files`,
      subHeader: `${files.length} GGUF files available`,
      buttons: buttons as any,
    });
    await alert.present();
  }

  private async downloadHFFile(model: HubModel, file: ModelFile) {
    const toast = await this.toastCtrl.create({
      message: `To download, use Ollama: ollama pull ${model.id}\nOr download the GGUF file directly from huggingface.co`,
      duration: 5000,
    });
    await toast.present();

    // Track it locally
    await this.modelHub.addLocalModel({
      name: model.name,
      source: 'huggingface',
      modelId: model.id,
      filename: file.filename,
      sizeBytes: file.sizeBytes,
      quantType: file.quantType,
      status: 'ready',
      provider: 'ollama',
    });
  }

  private async showIncompatibleWarning(file: ModelFile) {
    const alert = await this.alertCtrl.create({
      header: 'Incompatible Model',
      message: `This model requires ~${file.requiredRamGB} GB RAM. Your device may not have enough memory to run it.`,
      buttons: ['OK'],
    });
    await alert.present();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  getPlatformIcon(): string {
    if (!this.deviceCaps) return 'desktop-outline';
    switch (this.deviceCaps.platform) {
      case 'mobile': return 'phone-portrait-outline';
      case 'tablet': return 'tablet-portrait-outline';
      default: return 'desktop-outline';
    }
  }

  getTierColor(): string {
    if (!this.deviceCaps) return 'medium';
    switch (this.deviceCaps.tier) {
      case 'ultra': return 'success';
      case 'high': return 'primary';
      case 'medium': return 'warning';
      case 'low': return 'danger';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'ready': return 'checkmark-circle-outline';
      case 'loaded': return 'play-outline';
      case 'loading': return 'hourglass-outline';
      case 'downloading': return 'cloud-download-outline';
      case 'error': return 'alert-circle-outline';
      default: return 'information-circle-outline';
    }
  }

  formatBytes(bytes: number): string {
    return this.modelHub.formatBytes(bytes);
  }

  formatNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  }
}
