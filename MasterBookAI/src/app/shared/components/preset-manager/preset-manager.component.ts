import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonItem, IonLabel, IonList, IonSegment, IonSegmentButton, IonToggle,
  IonInput, IonTextarea, IonSelect, IonSelectOption, IonRange, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, addOutline, arrowBackOutline } from 'ionicons/icons';
import { PresetService } from '../../../core/services/preset.service';
import { ConnectionService } from '../../../core/services/connection.service';
import { Preset, createDefaultPreset } from '../../../core/models/preset.model';
import { SamplingOverrides } from '../../../core/models/character.model';

@Component({
  selector: 'app-preset-manager',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonItem, IonLabel, IonList, IonSegment, IonSegmentButton, IonToggle,
    IonInput, IonTextarea, IonSelect, IonSelectOption, IonRange
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="goBack()">
            <ion-icon slot="icon-only" [name]="view === 'list' ? 'close-outline' : 'arrow-back-outline'"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ view === 'list' ? 'Presets' : 'Preset' }}</ion-title>
        @if (view === 'list') {
          <ion-buttons slot="end">
            <ion-button (click)="createPreset()">
              <ion-icon slot="icon-only" name="add-outline"></ion-icon>
            </ion-button>
          </ion-buttons>
        }
      </ion-toolbar>
      @if (view === 'list') {
        <ion-toolbar>
          <ion-segment [(ngModel)]="activeTab">
            <ion-segment-button value="authors">
              <ion-label>Author's</ion-label>
            </ion-segment-button>
            <ion-segment-button value="mine">
              <ion-label>Mine</ion-label>
            </ion-segment-button>
          </ion-segment>
        </ion-toolbar>
      }
    </ion-header>
    
    <ion-content class="ion-padding preset-content">
    
      <!-- List View -->
      @if (view === 'list') {
        <div>
          <ion-item class="mb-item" lines="none">
            <ion-label>Use in Chat</ion-label>
            <ion-toggle slot="end" [(ngModel)]="useInChat"></ion-toggle>
          </ion-item>
          @if (displayedPresets.length === 0) {
            <div class="empty-state">
              No presets found
            </div>
          }
          @if (displayedPresets.length > 0) {
            <ion-list class="mb-list">
              @for (p of displayedPresets; track p) {
                <ion-item (click)="editPreset(p)" button class="mb-item">
                  <ion-label>
                    <h2>{{ p.name }}</h2>
                    <p>{{ p.description || 'No description' }}</p>
                  </ion-label>
                </ion-item>
              }
            </ion-list>
          }
        </div>
      }
    
      <!-- Detail View -->
      @if (view === 'detail' && activePreset) {
        <div>
          <ion-item class="mb-item">
            <ion-label position="stacked">Name</ion-label>
            <ion-input [(ngModel)]="activePreset.name" placeholder="Name"></ion-input>
          </ion-item>
          <ion-item class="mb-item">
            <ion-label position="stacked">Description</ion-label>
            <ion-textarea [(ngModel)]="activePreset.description" rows="3"></ion-textarea>
          </ion-item>
          <ion-item class="mb-item">
            <ion-label position="stacked">Model</ion-label>
            <ion-select [(ngModel)]="activePreset.model" interface="action-sheet">
              @for (m of availableModels; track m) {
                <ion-select-option [value]="m">{{ m }}</ion-select-option>
              }
            </ion-select>
          </ion-item>
          <ion-item class="mb-item system-prompt-item">
            <ion-label position="stacked">System Prompt</ion-label>
            <ion-select [(ngModel)]="activePreset.systemPrompt" interface="action-sheet">
              @for (sp of systemPrompts; track sp) {
                <ion-select-option [value]="sp.content">{{ sp.name }}</ion-select-option>
              }
            </ion-select>
            <ion-textarea
              [(ngModel)]="activePreset.systemPrompt"
              rows="6"
              class="system-prompt-textarea">
            </ion-textarea>
          </ion-item>
          <!-- Parameters -->
          <div class="param-slider">
            <div class="param-header">
              <span>Max New Tokens (1 - 4000)</span>
              <span>{{ activePreset.parameters.maxTokens }}</span>
            </div>
            <ion-range [min]="1" [max]="4000" [step]="1" [(ngModel)]="activePreset.parameters.maxTokens" color="warning"></ion-range>
          </div>
          <div class="param-slider">
            <div class="param-header">
              <span>Temperature (0 - 2)</span>
              <span>{{ activePreset.parameters.temperature | number:'1.2-2' }}</span>
            </div>
            <ion-range [min]="0" [max]="2" [step]="0.01" [(ngModel)]="activePreset.parameters.temperature" color="warning"></ion-range>
          </div>
          <div class="param-slider">
            <div class="param-header">
              <span>Top P (0 - 1)</span>
              <span>{{ activePreset.parameters.topP | number:'1.2-2' }}</span>
            </div>
            <ion-range [min]="0" [max]="1" [step]="0.01" [(ngModel)]="activePreset.parameters.topP" color="warning"></ion-range>
          </div>
          <div class="param-slider">
            <div class="param-header">
              <span>Top K (0 - 100)</span>
              <span>{{ activePreset.parameters.topK }}</span>
            </div>
            <ion-range [min]="0" [max]="100" [step]="1" [(ngModel)]="activePreset.parameters.topK" color="warning"></ion-range>
          </div>
          <div class="param-slider">
            <div class="param-header">
              <span>Repetition Penalty (1 - 2)</span>
              <span>{{ activePreset.parameters.repetitionPenalty | number:'1.2-2' }}</span>
            </div>
            <ion-range [min]="1" [max]="2" [step]="0.01" [(ngModel)]="activePreset.parameters.repetitionPenalty" color="warning"></ion-range>
          </div>
          <div class="param-slider">
            <div class="param-header">
              <span>Min P (0 - 1)</span>
              <span>{{ activePreset.parameters.minP | number:'1.2-2' }}</span>
            </div>
            <ion-range [min]="0" [max]="1" [step]="0.01" [(ngModel)]="activePreset.parameters.minP" color="warning"></ion-range>
          </div>
          <div class="action-footer">
            <ion-button expand="block" class="mb-btn-primary" (click)="savePreset()">
              Save
            </ion-button>
            @if (activePreset.id) {
              <ion-button expand="block" color="danger" fill="clear" (click)="deletePreset()">
                Delete
              </ion-button>
            }
          </div>
        </div>
      }
    
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
    .empty-state {
      text-align: center;
      margin-top: 40px;
      color: var(--mb-text-muted);
      font-size: 14px;
    }
    .system-prompt-textarea {
      margin-top: 8px;
      background: rgba(0, 0, 0, 0.2);
      padding: 8px;
      border-radius: 8px;
    }
    .param-slider {
      padding: 12px 16px;
      background: var(--mb-bg-secondary);
      margin-bottom: 8px;
      border-radius: 12px;
    }
    .param-header {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--mb-text-primary);
      margin-bottom: -10px;
    }
    .action-footer {
      margin-top: 24px;
      padding-bottom: 24px;
    }
  `]
})
export class PresetManagerComponent implements OnInit {
  view: 'list' | 'detail' = 'list';
  activeTab: 'authors' | 'mine' = 'mine';
  useInChat = false;

  presets: Preset[] = [];
  availableModels: string[] = [];
  systemPrompts: {name: string, content: string}[] = [];

  activePreset?: Preset & { parameters: NonNullable<Preset['parameters']> };

  constructor(
    private modalCtrl: ModalController,
    private presetService: PresetService,
    private connectionService: ConnectionService
  ) {
    addIcons({ closeOutline, addOutline, arrowBackOutline });
  }

  get displayedPresets() {
    const isAuthor = this.activeTab === 'authors';
    return this.presets.filter(p => !!p.isAuthorPreset === isAuthor);
  }

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.presets = await this.presetService.getAllPresets();
    this.systemPrompts = this.presetService.getDefaultSystemPrompts();

    const profile = await this.connectionService.getDefaultProfile();
    if (profile && profile.modelList) {
      this.availableModels = profile.modelList;
    }
  }

  goBack() {
    if (this.view === 'detail') {
      this.view = 'list';
      this.activePreset = undefined;
    } else {
      this.modalCtrl.dismiss();
    }
  }

  createPreset() {
    const defaults = createDefaultPreset();
    this.activePreset = {
      ...defaults,
      parameters: defaults.parameters || {}
    } as Preset & { parameters: NonNullable<Preset['parameters']> };
    this.activePreset.isAuthorPreset = this.activeTab === 'authors';
    this.view = 'detail';
  }

  editPreset(preset: Preset) {
    // Clone to avoid mutating list directly before save
    const clone = JSON.parse(JSON.stringify(preset));
    clone.parameters = clone.parameters || {};
    this.activePreset = clone;
    this.view = 'detail';
  }

  async savePreset() {
    if (!this.activePreset) return;
    
    if (this.activePreset.id) {
      await this.presetService.updatePreset(this.activePreset.id, this.activePreset);
    } else {
      await this.presetService.createPreset(this.activePreset);
    }
    
    await this.loadData();
    this.view = 'list';
    this.activePreset = undefined;
  }

  async deletePreset() {
    if (!this.activePreset || !this.activePreset.id) return;
    
    await this.presetService.deletePreset(this.activePreset.id);
    await this.loadData();
    this.view = 'list';
    this.activePreset = undefined;
  }
}
