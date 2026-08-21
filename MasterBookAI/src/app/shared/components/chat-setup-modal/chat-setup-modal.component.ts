import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonToggle, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  closeOutline, chevronForwardOutline, addCircleOutline, refreshOutline, 
  optionsOutline, ellipsisHorizontalOutline, helpCircleOutline, cloudOutline 
} from 'ionicons/icons';
import { PresetService } from '../../../core/services/preset.service';
import { ConnectionService } from '../../../core/services/connection.service';
import { PresetManagerComponent } from '../preset-manager/preset-manager.component';
import { ModelSelectionModalComponent } from '../model-selection-modal/model-selection-modal.component';
import { SystemPromptModalComponent, SystemPromptItem } from '../system-prompt-modal/system-prompt-modal.component';
import { Preset } from '../../../core/models/preset.model';
import { ConnectionProfile } from '../../../core/models/connection-profile.model';
import { SamplingOverrides } from '../../../core/models/character.model';

@Component({
  selector: 'app-chat-setup-modal',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonToggle
  ],
  template: `
    <ion-header class="ion-no-border cs-header">
      <ion-toolbar class="transparent-toolbar">
        <ion-buttons slot="start">
          <ion-button (click)="cancel()">
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title class="cs-title">Chat Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="cs-content ion-padding">
      <div class="cs-container">
        
        <!-- Settings List -->
        <div class="settings-group">
          
          <div class="setting-row" (click)="openModelSelection()">
            <div class="setting-label">Model</div>
            <div class="setting-value">
              <span *ngIf="!selectedModel">Select</span>
              <span *ngIf="selectedModel" class="value-text">{{ selectedModel }}</span>
              <ion-icon name="chevron-forward-outline"></ion-icon>
            </div>
          </div>

          <div class="setting-row" (click)="openPresetManager()">
            <div class="setting-label">Parameters</div>
            <div class="setting-value">
              <span class="value-text">Moedark Repetition (Custom)</span>
              <ion-icon name="chevron-forward-outline"></ion-icon>
            </div>
          </div>

          <div class="setting-row" (click)="openSystemPrompt()">
            <div class="setting-label">System Prompt</div>
            <div class="setting-value">
              <span class="value-text">{{ getSystemPromptName() }} (Custom)</span>
              <ion-icon name="chevron-forward-outline"></ion-icon>
            </div>
          </div>

        </div>

        <div class="settings-group mt-4">
          <div class="setting-row" (click)="openPresetManager()">
            <div class="setting-label">Preset</div>
            <div class="setting-value">
              <span class="value-text">{{ getPresetName() }}</span>
              <ion-icon name="chevron-forward-outline"></ion-icon>
            </div>
          </div>
        </div>

        <div class="settings-group mt-4">
          <div class="setting-row">
            <div class="setting-label">Memory</div>
            <div class="setting-value">
              <span class="value-text">Summarize Your Chat</span>
              <ion-icon name="chevron-forward-outline"></ion-icon>
            </div>
          </div>

          <div class="setting-row no-active-click">
            <div class="setting-label">
              Advanced Memory 
              <ion-icon name="help-circle-outline" class="help-icon"></ion-icon>
            </div>
            <div class="setting-value">
              <ion-toggle [(ngModel)]="advancedMemory" class="success-toggle"></ion-toggle>
            </div>
          </div>
        </div>

        <div class="settings-group mt-4">
          <div class="setting-row">
            <div class="setting-label">Persona</div>
            <div class="setting-value">
              <ion-icon name="cloud-outline" class="cloud-icon"></ion-icon>
              <span class="value-text">Damian Dark</span>
              <ion-icon name="chevron-forward-outline"></ion-icon>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-label">Scenario</div>
            <div class="setting-value">
              <span class="value-text">Not customizable</span>
              <ion-icon name="chevron-forward-outline"></ion-icon>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-label">
              Lorebooks
              <ion-icon name="help-circle-outline" class="help-icon"></ion-icon>
            </div>
            <div class="setting-value">
              <span class="value-text">School of Lust</span>
              <ion-icon name="chevron-forward-outline"></ion-icon>
            </div>
          </div>
        </div>

      </div>
    </ion-content>

    <!-- Bottom Action Bar -->
    <div class="bottom-tab-bar">
      <div class="tab-item">
        <ion-icon name="add-circle-outline"></ion-icon>
        <span>New Chat</span>
      </div>
      <div class="tab-item">
        <ion-icon name="refresh-outline"></ion-icon>
        <span>Restart Chat</span>
      </div>
      <div class="tab-item">
        <ion-icon name="options-outline"></ion-icon>
        <span>Appearance</span>
      </div>
      <div class="tab-item">
        <ion-icon name="ellipsis-horizontal-outline"></ion-icon>
        <span>More</span>
      </div>
    </div>
  `,
  styles: [`
    .cs-header { background: #1c1c1e; }
    .transparent-toolbar { --background: transparent; color: white; }
    .cs-title { font-size: 17px; font-weight: 600; text-align: center; }

    .cs-content { --background: #1c1c1e; }
    .cs-container { max-width: 600px; margin: 0 auto; padding-bottom: 80px; }

    .mt-4 { margin-top: 24px; }

    .settings-group {
      display: flex; flex-direction: column;
    }

    .setting-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.08);
      cursor: pointer;
    }
    .setting-row:last-child { border-bottom: none; }
    
    .setting-label { 
      font-size: 15px; font-weight: 500; color: white; 
      display: flex; align-items: center; gap: 6px;
    }
    .help-icon { color: #71717a; font-size: 18px; }

    .setting-value { 
      display: flex; align-items: center; gap: 8px; color: #a1a1aa; font-size: 14px;
    }
    .value-text {
      max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      text-align: right;
    }
    .setting-value ion-icon { font-size: 16px; color: #71717a; }
    
    .cloud-icon { color: white !important; background: rgba(255,255,255,0.1); padding: 4px; border-radius: 50%; }

    .no-active-click { cursor: default; }

    /* Toggle overrides */
    .success-toggle { 
      --track-background-checked: #22c55e;
      --handle-background: white;
      margin: 0; padding: 0;
    }

    /* Bottom Tab Bar */
    .bottom-tab-bar {
      position: absolute; bottom: 0; left: 0; right: 0;
      background: #1c1c1e; border-top: 1px solid rgba(255,255,255,0.08);
      display: flex; justify-content: space-around; padding: 12px 0 24px;
    }
    .tab-item {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      color: #a1a1aa; font-size: 11px; cursor: pointer;
    }
    .tab-item ion-icon { font-size: 24px; }
    .tab-item:hover { color: white; }
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
  systemPrompts: SystemPromptItem[] = [];

  selectedModel = '';
  selectedPresetId = '';
  systemPrompt = '';
  params: SamplingOverrides = {
    temperature: 0.7, topP: 1.0, topK: 40, repetitionPenalty: 1.0, maxTokens: 300, minP: 0.05
  };
  
  advancedMemory = true;
  selectedSystemPromptId = 'roleplay';

  constructor(
    private modalCtrl: ModalController,
    private presetService: PresetService,
    private connectionService: ConnectionService
  ) {
    addIcons({ 
      closeOutline, chevronForwardOutline, addCircleOutline, refreshOutline, 
      optionsOutline, ellipsisHorizontalOutline, helpCircleOutline, cloudOutline 
    });
  }

  async ngOnInit() {
    this.presets = await this.presetService.getAllPresets();
    
    // Convert default system prompts to the SystemPromptItem format
    const defaultPrompts = this.presetService.getDefaultSystemPrompts();
    this.systemPrompts = defaultPrompts.map((p, i) => ({
      id: p.name.toLowerCase().replace(/\\s+/g, '-'),
      name: p.name,
      content: p.content
    }));

    const profile = await this.connectionService.getDefaultProfile();
    if (profile && profile.modelList) {
      this.availableModels = profile.modelList;
    }

    this.selectedModel = this.initialModel || (this.availableModels[0] || '');
    this.selectedPresetId = this.initialPresetId || '';
    this.systemPrompt = this.initialSystemPrompt || this.systemPrompts[0]?.content;
    
    if (this.initialParams) {
      this.params = { ...this.params, ...this.initialParams };
    } else if (profile?.defaultSampling) {
      this.params = { ...this.params, ...profile.defaultSampling };
    }
  }

  getPresetName(): string {
    if (!this.selectedPresetId) return 'Inactive';
    const preset = this.presets.find(p => p.id === this.selectedPresetId);
    return preset ? preset.name : 'Inactive';
  }

  getSystemPromptName(): string {
    const p = this.systemPrompts.find(sp => sp.id === this.selectedSystemPromptId || sp.content === this.systemPrompt);
    return p ? p.name : 'Custom';
  }

  async openModelSelection() {
    const modal = await this.modalCtrl.create({
      component: ModelSelectionModalComponent,
      componentProps: { currentModel: this.selectedModel }
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data?.model) {
      this.selectedModel = data.model;
    }
  }

  async openSystemPrompt() {
    const modal = await this.modalCtrl.create({
      component: SystemPromptModalComponent,
      componentProps: { 
        selectedPromptId: this.selectedSystemPromptId,
        prompts: this.systemPrompts
      }
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data?.prompt) {
      this.selectedSystemPromptId = data.prompt.id;
      this.systemPrompt = data.prompt.content;
    }
  }

  async openPresetManager() {
    // Open existing PresetManagerComponent to handle Parameters and Preset selection
    const modal = await this.modalCtrl.create({
      component: PresetManagerComponent
    });
    await modal.present();
    await modal.onWillDismiss();
    
    this.presets = await this.presetService.getAllPresets();
  }

  cancel() {
    this.modalCtrl.dismiss({
      model: this.selectedModel,
      presetId: this.selectedPresetId,
      systemPrompt: this.systemPrompt,
      params: this.params
    });
  }
}
