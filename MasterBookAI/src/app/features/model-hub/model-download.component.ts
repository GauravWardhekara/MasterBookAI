import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonSpinner, IonBadge, ModalController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline, cloudDownloadOutline, checkmarkCircleOutline,
  warningOutline, alertCircleOutline
} from 'ionicons/icons';
import { ModelHubService } from '../../core/services/model-hub.service';
import { DeviceCapabilityService } from '../../core/services/device-capability.service';
import { HubModel, ModelFile, DeviceCapabilities } from '../../core/models/model-hub.model';

@Component({
  selector: 'app-model-download',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonSpinner, IonBadge
  ],
  template: `
    <ion-header class="ion-no-border md-header">
      <ion-toolbar class="transparent-toolbar">
        <ion-buttons slot="start">
          <ion-button (click)="dismiss()">
            <ion-icon slot="icon-only" name="chevron-back-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title class="md-title">Download Model</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="md-content ion-padding">
      <div class="md-container">

        <!-- Model Info -->
        <div class="model-info-card">
          <div class="model-name-lg">{{ model?.name }}</div>
          <div class="model-repo">{{ model?.id }}</div>
          <div class="model-desc" *ngIf="model?.description">{{ model?.description }}</div>
          <div class="model-badges">
            <ion-badge color="medium" *ngIf="model?.parameterCount">{{ model?.parameterCount }}</ion-badge>
            <ion-badge color="tertiary" *ngIf="model?.source">{{ model?.source }}</ion-badge>
            <ion-badge color="warning" *ngIf="model?.downloads">{{ formatNumber(model!.downloads!) }} downloads</ion-badge>
          </div>
        </div>

        <!-- Loading Files -->
        <div class="loading-state" *ngIf="isLoadingFiles">
          <ion-spinner name="crescent" color="warning"></ion-spinner>
          <span>Loading available files...</span>
        </div>

        <!-- File List -->
        <div class="section-header" *ngIf="!isLoadingFiles && files.length > 0">
          Available Quantizations
        </div>

        <div class="file-list" *ngIf="!isLoadingFiles">
          <div *ngFor="let file of files"
               class="file-card"
               [class.incompatible]="!isCompatible(file)"
               [class.downloading]="downloadingFile === file.filename">

            <div class="file-top">
              <div class="file-info">
                <div class="file-name">{{ file.quantType || file.filename }}</div>
                <div class="file-meta">
                  {{ formatBytes(file.sizeBytes) }} •
                  ~{{ file.requiredRamGB }} GB RAM needed
                </div>
              </div>
              <div class="compat-indicator">
                <ion-icon *ngIf="isCompatible(file)" name="checkmark-circle-outline" color="success"></ion-icon>
                <ion-icon *ngIf="!isCompatible(file)" name="warning-outline" color="danger"></ion-icon>
              </div>
            </div>

            <!-- Compatibility warning -->
            <div class="compat-warning" *ngIf="!isCompatible(file)">
              Exceeds your device's {{ deviceCaps?.ramGB }} GB RAM
            </div>

            <!-- Download progress -->
            <div class="progress-section" *ngIf="downloadingFile === file.filename">
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="downloadProgress"></div>
              </div>
              <span class="progress-text">{{ downloadStatus }}</span>
            </div>

            <!-- Actions -->
            <div class="file-actions" *ngIf="downloadingFile !== file.filename">
              <ion-button
                fill="solid" size="small"
                [color]="isCompatible(file) ? 'warning' : 'medium'"
                (click)="downloadFile(file)"
                [disabled]="!!downloadingFile">
                <ion-icon slot="start" name="cloud-download-outline"></ion-icon>
                {{ model?.source === 'ollama' ? 'Pull' : 'Download' }}
              </ion-button>
            </div>
          </div>
        </div>

        <!-- No files -->
        <div class="empty-state" *ngIf="!isLoadingFiles && files.length === 0">
          <ion-icon name="alert-circle-outline" class="empty-icon"></ion-icon>
          <h3>No GGUF Files Found</h3>
          <p>This repository doesn't contain any compatible GGUF model files.</p>
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    .md-header { background: #1c1c1e; }
    .transparent-toolbar { --background: transparent; color: white; }
    .md-title { font-size: 17px; font-weight: 600; text-align: center; }

    .md-content { --background: #1c1c1e; }
    .md-container { max-width: 600px; margin: 0 auto; padding-bottom: 40px; }

    .model-info-card {
      background: #27272a; border-radius: 14px; padding: 20px; margin-bottom: 20px;
    }
    .model-name-lg { font-size: 20px; font-weight: 700; color: white; margin-bottom: 4px; }
    .model-repo { font-size: 13px; color: #71717a; margin-bottom: 8px; }
    .model-desc { font-size: 14px; color: #a1a1aa; line-height: 1.5; margin-bottom: 12px; }
    .model-badges { display: flex; flex-wrap: wrap; gap: 6px; }
    .model-badges ion-badge { font-size: 11px; padding: 4px 8px; border-radius: 6px; }

    .loading-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 12px; padding: 48px 0; color: #a1a1aa;
    }

    .section-header {
      font-size: 14px; font-weight: 600; color: #a1a1aa; margin-bottom: 12px;
      text-transform: uppercase; letter-spacing: 0.5px;
    }

    .file-list { display: flex; flex-direction: column; gap: 10px; }

    .file-card {
      background: #27272a; border-radius: 12px; padding: 14px;
      border: 1px solid transparent; transition: all 0.2s ease;
    }
    .file-card.incompatible { opacity: 0.6; }
    .file-card.downloading { border-color: #a855f7; }

    .file-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .file-info { flex: 1; }
    .file-name { font-size: 15px; font-weight: 600; color: white; }
    .file-meta { font-size: 13px; color: #a1a1aa; margin-top: 2px; }
    .compat-indicator ion-icon { font-size: 22px; }

    .compat-warning {
      font-size: 12px; color: #ef4444; margin-top: 6px;
      padding: 4px 8px; background: rgba(239,68,68,0.1); border-radius: 6px;
      display: inline-block;
    }

    .progress-section { margin-top: 10px; }
    .progress-bar {
      height: 6px; background: #3f3f46; border-radius: 3px; overflow: hidden; margin-bottom: 4px;
    }
    .progress-fill {
      height: 100%; background: linear-gradient(90deg, #a855f7, #ec4899);
      border-radius: 3px; transition: width 0.3s ease;
    }
    .progress-text { font-size: 12px; color: #a1a1aa; }

    .file-actions { display: flex; justify-content: flex-end; margin-top: 8px; }

    .empty-state { text-align: center; padding: 48px 24px; color: #71717a; }
    .empty-icon { font-size: 48px; color: #3f3f46; margin-bottom: 12px; display: block; }
    .empty-state h3 { color: white; font-size: 18px; margin: 0 0 8px; }
    .empty-state p { font-size: 14px; margin: 0; }
  `]
})
export class ModelDownloadComponent implements OnInit {
  @Input() model!: HubModel;

  files: ModelFile[] = [];
  isLoadingFiles = false;
  deviceCaps?: DeviceCapabilities;
  maxSizeGB = 8;

  downloadingFile: string | null = null;
  downloadProgress = 0;
  downloadStatus = '';

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private modelHub: ModelHubService,
    private deviceCapService: DeviceCapabilityService
  ) {
    addIcons({
      chevronBackOutline, cloudDownloadOutline, checkmarkCircleOutline,
      warningOutline, alertCircleOutline
    });
  }

  async ngOnInit() {
    this.deviceCaps = await this.deviceCapService.detect();
    this.maxSizeGB = this.deviceCapService.getMaxModelSizeGB(this.deviceCaps.tier);

    if (this.model?.source === 'huggingface') {
      await this.loadHFFiles();
    } else if (this.model?.source === 'ollama') {
      // Ollama models are single files, present them as-is
      this.files = this.model.quantizations || [];
    }
  }

  private async loadHFFiles() {
    this.isLoadingFiles = true;
    this.files = await this.modelHub.getHuggingFaceModelFiles(this.model.id);
    // Sort compatible first, then by size ascending
    this.files.sort((a, b) => {
      const aCompat = a.requiredRamGB <= this.maxSizeGB ? 0 : 1;
      const bCompat = b.requiredRamGB <= this.maxSizeGB ? 0 : 1;
      if (aCompat !== bCompat) return aCompat - bCompat;
      return a.sizeBytes - b.sizeBytes;
    });
    this.isLoadingFiles = false;
  }

  isCompatible(file: ModelFile): boolean {
    return file.requiredRamGB <= this.maxSizeGB;
  }

  async downloadFile(file: ModelFile) {
    if (this.model.source === 'ollama') {
      await this.pullViaOllama(file);
    } else {
      await this.downloadFromHF(file);
    }
  }

  private async pullViaOllama(file: ModelFile) {
    this.downloadingFile = file.filename;
    this.downloadProgress = 0;
    this.downloadStatus = 'Starting pull...';

    try {
      for await (const update of this.modelHub.pullOllamaModel(file.filename)) {
        this.downloadStatus = update.status;
        if (update.total && update.completed) {
          this.downloadProgress = Math.round((update.completed / update.total) * 100);
        }
      }

      await this.modelHub.addLocalModel({
        name: this.model.name,
        source: 'ollama',
        modelId: this.model.id,
        filename: file.filename,
        sizeBytes: file.sizeBytes,
        quantType: file.quantType,
        status: 'ready',
        provider: 'ollama',
      });

      const toast = await this.toastCtrl.create({
        message: `Model "${this.model.name}" pulled successfully!`,
        duration: 3000, color: 'success',
      });
      await toast.present();
    } catch (err: any) {
      this.downloadStatus = `Error: ${err.message}`;
      const toast = await this.toastCtrl.create({
        message: `Pull failed: ${err.message}`, duration: 4000, color: 'danger',
      });
      await toast.present();
    }
    this.downloadingFile = null;
  }

  private async downloadFromHF(file: ModelFile) {
    this.downloadingFile = file.filename;
    this.downloadProgress = 0;
    this.downloadStatus = 'Starting download...';

    try {
      // For HuggingFace files, we track progress via fetch ReadableStream
      const response = await fetch(file.downloadUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentLength = Number(response.headers.get('Content-Length') || file.sizeBytes);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let receivedBytes = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedBytes += value.length;
        this.downloadProgress = Math.round((receivedBytes / contentLength) * 100);
        this.downloadStatus = `${this.formatBytes(receivedBytes)} / ${this.formatBytes(contentLength)}`;
      }

      // Track locally
      await this.modelHub.addLocalModel({
        name: this.model.name,
        source: 'huggingface',
        modelId: this.model.id,
        filename: file.filename,
        sizeBytes: file.sizeBytes,
        quantType: file.quantType,
        status: 'ready',
        provider: 'ollama', // Will use Ollama for inference
      });

      const toast = await this.toastCtrl.create({
        message: `Downloaded "${file.filename}" successfully!`,
        duration: 3000, color: 'success',
      });
      await toast.present();
    } catch (err: any) {
      this.downloadStatus = `Error: ${err.message}`;
      const toast = await this.toastCtrl.create({
        message: `Download failed: ${err.message}`, duration: 4000, color: 'danger',
      });
      await toast.present();
    }
    this.downloadingFile = null;
  }

  dismiss() {
    this.modalCtrl.dismiss();
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
