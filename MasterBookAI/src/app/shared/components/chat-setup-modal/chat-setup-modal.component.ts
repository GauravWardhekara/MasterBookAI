import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonItem, IonLabel, IonSelect, IonSelectOption, IonTextarea, IonRange,
  ModalController, IonList, IonListHeader
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, saveOutline, playOutline } from 'ionicons/icons';
import { PresetService } from '../../../core/services/preset.service';
import { ConnectionService } from '../../../core/services/connection.service';
import { PresetManagerComponent } from '../preset-manager/preset-manager.component';
import { Preset } from '../../../core/models/preset.model';
import { ConnectionProfile } from '../../../core/models/connection-profile.model';
import { SamplingOverrides } from '../../../core/models/character.model';

@Component({
  selector: 'app-chat-setup-modal',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonItem, IonLabel, IonSelect, IonSelectOption, IonTextarea, IonRange,
    IonList, IonListHeader
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="cancel()">
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ isEditMode ? 'Chat Settings' : 'Start Chat' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding preset-content">
      <div class="mb-form">
        <!-- Model Selection -->
        <ion-item class="mb-item">
          <ion-label position="stacked">Model</ion-label>
          <ion-select [(ngModel)]="selectedModel" interface="action-sheet">
            <ion-select-option *ngFor="let m of availableModels" [value]="m">{{ m }}</ion-select-option>
          </ion-select>
        </ion-item>

        <!-- Preset Selection -->
        <ion-item class="mb-item">
          <ion-label position="stacked">Preset</ion-label>
          <div style="display: flex; width: 100%; align-items: center; gap: 8px;">
            <ion-select [(ngModel)]="selectedPresetId" (ionChange)="onPresetChange()" interface="action-sheet" style="flex: 1;">
              <ion-select-option value="">Custom</ion-select-option>
              <ion-select-option *ngFor="let p of presets" [value]="p.id">{{ p.name }}</ion-select-option>
            </ion-select>
            <ion-button fill="clear" size="small" (click)="openPresetManager()">
              Manage
            </ion-button>
          </div>
        </ion-item>

        <!-- System Prompt -->
        <ion-item class="mb-item system-prompt-item">
          <ion-label position="stacked">System Prompt</ion-label>
          <ion-select [(ngModel)]="systemPrompt" interface="action-sheet">
            <ion-select-option *ngFor="let sp of systemPrompts" [value]="sp.content">{{ sp.name }}</ion-select-option>
          </ion-select>
          <ion-textarea
            [(ngModel)]="systemPrompt"
            rows="4"
            placeholder="You are a helpful assistant..."
            class="system-prompt-textarea">
          </ion-textarea>
        </ion-item>

        <!-- Advanced Parameters -->
        <ion-list class="mb-list">
          <ion-list-header>Parameters</ion-list-header>
          
          <div class="param-slider">
            <div class="param-header">
              <span>Max New Tokens</span>
              <span>{{ params.maxTokens }}</span>
            </div>
            <ion-range [min]="1" [max]="4000" [step]="1" [(ngModel)]="params.maxTokens" color="warning"></ion-range>
          </div>

          <div class="param-slider">
            <div class="param-header">
              <span>Temperature</span>
              <span>{{ params.temperature | number:'1.2-2' }}</span>
            </div>
            <ion-range [min]="0" [max]="2" [step]="0.01" [(ngModel)]="params.temperature" color="warning"></ion-range>
          </div>

          <div class="param-slider">
            <div class="param-header">
              <span>Top P</span>
              <span>{{ params.topP | number:'1.2-2' }}</span>
            </div>
            <ion-range [min]="0" [max]="1" [step]="0.01" [(ngModel)]="params.topP" color="warning"></ion-range>
          </div>

          <div class="param-slider">
            <div class="param-header">
              <span>Top K</span>
              <span>{{ params.topK }}</span>
            </div>
            <ion-range [min]="0" [max]="100" [step]="1" [(ngModel)]="params.topK" color="warning"></ion-range>
          </div>

          <div class="param-slider">
            <div class="param-header">
              <span>Repetition Penalty</span>
              <span>{{ params.repetitionPenalty | number:'1.2-2' }}</span>
            </div>
            <ion-range [min]="1" [max]="2" [step]="0.01" [(ngModel)]="params.repetitionPenalty" color="warning"></ion-range>
          </div>

          <div class="param-slider">
            <div class="param-header">
              <span>Min P</span>
              <span>{{ params.minP | number:'1.2-2' }}</span>
            </div>
            <ion-range [min]="0" [max]="1" [step]="0.01" [(ngModel)]="params.minP" color="warning"></ion-range>
          </div>
        </ion-list>
      </div>
      
      <div class="action-footer">
        <ion-button expand="block" class="mb-btn-primary" (click)="confirm()">
          <ion-icon slot="start" [name]="isEditMode ? 'save-outline' : 'play-outline'"></ion-icon>
          {{ isEditMode ? 'Apply Changes' : 'Start Chat' }}
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .preset-content { --background: var(--mb-bg-deep); }
    .mb-item {
      --background: var(--mb-bg-secondary);
      --border-color: rgba(255, 255, 255, 0.1);
      margin-bottom: 12px;
      border-radius: 12px;
    }
    .system-prompt-textarea {
      margin-top: 8px;
      background: rgba(0, 0, 0, 0.2);
      padding: 8px;
      border-radius: 8px;
    }
    .param-slider {
      padding: 8px 16px;
      background: var(--mb-bg-secondary);
      margin-bottom: 8px;
      border-radius: 12px;
    }
    .param-header {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      color: var(--mb-text-primary);
      margin-bottom: -10px;
    }
    .action-footer {
      margin-top: 24px;
      padding-bottom: 24px;
    }
  `]
})
export class ChatSetupModalComponent implements OnInit {
  @Input() isEditMode = false;
  @Input() initialModel?: string;
  @Input() initialPresetId?: string;
  @Input() initialSystemPrompt?: string;
  @Input() initialParams?: SamplingOverrides;

  availableModels: string[] = [];
  presets: Preset[] = [];
  systemPrompts: {name: string, content: string}[] = [];

  selectedModel = '';
  selectedPresetId = '';
  systemPrompt = '';
  params: SamplingOverrides = {
    temperature: 0.7,
    topP: 1.0,
    topK: 40,
    repetitionPenalty: 1.0,
    maxTokens: 300,
    minP: 0.05
  };

  constructor(
    private modalCtrl: ModalController,
    private presetService: PresetService,
    private connectionService: ConnectionService
  ) {
    addIcons({ closeOutline, saveOutline, playOutline });
  }

  async ngOnInit() {
    // Load presets and prompts
    this.presets = await this.presetService.getAllPresets();
    this.systemPrompts = this.presetService.getDefaultSystemPrompts();

    // Load connection profile models
    const profile = await this.connectionService.getDefaultProfile();
    if (profile && profile.modelList) {
      this.availableModels = profile.modelList;
    }

    // Set defaults
    this.selectedModel = this.initialModel || (this.availableModels[0] || '');
    this.selectedPresetId = this.initialPresetId || '';
    this.systemPrompt = this.initialSystemPrompt || this.systemPrompts[0].content;
    
    if (this.initialParams) {
      this.params = { ...this.params, ...this.initialParams };
    } else if (profile?.defaultSampling) {
      this.params = { ...this.params, ...profile.defaultSampling };
    }
  }

  onPresetChange() {
    if (!this.selectedPresetId) return;
    const preset = this.presets.find(p => p.id === this.selectedPresetId);
    if (preset) {
      if (preset.model && this.availableModels.includes(preset.model)) {
        this.selectedModel = preset.model;
      }
      if (preset.systemPrompt) {
        this.systemPrompt = preset.systemPrompt;
      }
      if (preset.parameters) {
        this.params = { ...preset.parameters };
      }
    }
  }

  async openPresetManager() {
    const modal = await this.modalCtrl.create({
      component: PresetManagerComponent
    });
    await modal.present();
    await modal.onWillDismiss();
    
    // Reload presets in case they changed
    this.presets = await this.presetService.getAllPresets();
    this.systemPrompts = this.presetService.getDefaultSystemPrompts();
  }

  cancel() {
    this.modalCtrl.dismiss();
  }

  confirm() {
    this.modalCtrl.dismiss({
      model: this.selectedModel,
      presetId: this.selectedPresetId,
      systemPrompt: this.systemPrompt,
      params: this.params
    });
  }
}
