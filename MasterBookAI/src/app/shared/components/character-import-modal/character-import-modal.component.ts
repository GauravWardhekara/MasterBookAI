import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonItem, IonLabel, IonSelect, IonSelectOption, IonInput, IonSpinner,
  ModalController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, cloudDownloadOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { CharacterImportService, ImportSource } from '../../../core/services/character-import.service';
import { Character } from '../../../core/models/character.model';

interface SourceOption {
  value: ImportSource;
  label: string;
  inputLabel: string;
  placeholder: string;
  hint: string;
}

@Component({
  selector: 'app-character-import-modal',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonItem, IonLabel, IonSelect, IonSelectOption, IonInput, IonSpinner
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="cancel()">
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Import Character Card</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="import-content ion-padding">

      <div class="import-hero">
        <div class="hero-icon">🌐</div>
        <p class="hero-desc">Enter the full URL of the character card to import, or pick a specific website.</p>
      </div>

      <!-- Source Selector -->
      <ion-item class="mb-item source-item">
        <ion-label position="stacked">Source</ion-label>
        <ion-select
          id="import-source-select"
          [(ngModel)]="selectedSource"
          (ionChange)="onSourceChange()"
          interface="action-sheet"
          [interfaceOptions]="{ header: 'Select Source' }">
          <ion-select-option *ngFor="let s of sources" [value]="s.value">
            {{ s.label }}
          </ion-select-option>
        </ion-select>
      </ion-item>

      <!-- URL / ID Input -->
      <ion-item class="mb-item input-item" *ngIf="currentSource">
        <ion-label position="stacked">{{ currentSource.inputLabel }}</ion-label>
        <ion-input
          id="import-url-input"
          [(ngModel)]="inputValue"
          [placeholder]="currentSource.placeholder"
          clearInput="true"
          (keyup.enter)="importCharacter()"
        ></ion-input>
      </ion-item>

      <div class="hint-text" *ngIf="currentSource?.hint">
        {{ currentSource?.hint }}
      </div>

      <!-- Preview (shows after successful import) -->
      <div class="preview-card" *ngIf="previewCharacter && !isLoading">
        <div class="preview-avatar" *ngIf="previewCharacter.avatar">
          <img [src]="previewCharacter.avatar" [alt]="previewCharacter.name">
        </div>
        <div class="preview-avatar placeholder" *ngIf="!previewCharacter.avatar">
          {{ previewCharacter.name?.charAt(0)?.toUpperCase() }}
        </div>
        <div class="preview-info">
          <div class="preview-name">{{ previewCharacter.name }}</div>
          <div class="preview-desc">{{ previewCharacter.description | slice:0:120 }}{{ (previewCharacter.description?.length || 0) > 120 ? '...' : '' }}</div>
          <div class="preview-tags">
            <span class="mb-chip" *ngFor="let tag of (previewCharacter.tags || []) | slice:0:3">{{ tag }}</span>
          </div>
        </div>
        <div class="preview-check">
          <ion-icon name="checkmark-circle-outline"></ion-icon>
        </div>
      </div>

      <!-- Error -->
      <div class="error-card" *ngIf="errorMessage">
        <p>❌ {{ errorMessage }}</p>
      </div>

      <!-- Footer -->
      <div class="import-footer">
        <ion-button
          id="import-btn"
          expand="block"
          class="mb-btn-primary"
          (click)="importCharacter()"
          [disabled]="isLoading || !inputValue.trim()">
          <ion-spinner *ngIf="isLoading" name="crescent" class="import-spinner"></ion-spinner>
          <ion-icon *ngIf="!isLoading" slot="start" name="cloud-download-outline"></ion-icon>
          {{ isLoading ? 'Importing...' : 'Import' }}
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .import-content { --background: var(--mb-bg-deep); }

    .import-hero {
      text-align: center;
      padding: 24px 16px 16px;
    }
    .hero-icon { font-size: 48px; margin-bottom: 8px; }
    .hero-desc {
      color: var(--mb-text-muted);
      font-size: 14px;
      line-height: 1.5;
    }

    .mb-item {
      --background: var(--mb-bg-secondary);
      --border-color: rgba(255,255,255,0.08);
      border-radius: 14px;
      margin-bottom: 12px;
      --highlight-color-focused: var(--mb-primary);
    }
    .source-item { margin-bottom: 16px; }
    .input-item { margin-bottom: 8px; }

    .hint-text {
      font-size: 12px;
      color: var(--mb-text-muted);
      padding: 0 8px 16px;
      font-style: italic;
    }

    /* Preview Card */
    .preview-card {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(59, 130, 246, 0.08));
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 16px;
      padding: 16px;
      margin: 16px 0;
      animation: mb-fade-in 0.3s ease;
    }
    .preview-avatar {
      width: 64px; height: 64px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid var(--mb-primary);
      flex-shrink: 0;
    }
    .preview-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .preview-avatar.placeholder {
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, var(--mb-primary-dark), var(--mb-primary));
      color: white; font-weight: 700; font-size: 24px;
    }
    .preview-info { flex: 1; min-width: 0; }
    .preview-name {
      font-weight: 700; font-size: 16px;
      color: var(--mb-text-primary); margin-bottom: 4px;
    }
    .preview-desc {
      font-size: 12px; color: var(--mb-text-muted);
      line-height: 1.4; margin-bottom: 8px;
    }
    .preview-tags { display: flex; flex-wrap: wrap; gap: 4px; }
    .preview-check {
      color: var(--mb-success);
      font-size: 28px;
      flex-shrink: 0;
    }

    /* Error */
    .error-card {
      background: rgba(248, 113, 113, 0.1);
      border: 1px solid rgba(248, 113, 113, 0.2);
      border-radius: 12px;
      padding: 12px 16px;
      margin: 12px 0;
      color: var(--mb-danger);
      font-size: 13px;
    }

    /* Footer */
    .import-footer { margin-top: 24px; padding-bottom: 32px; }
    .import-spinner { width: 20px; height: 20px; margin-right: 8px; }
  `]
})
export class CharacterImportModalComponent implements OnInit {
  sources: SourceOption[] = [
    {
      value: 'auto',
      label: 'Automatic',
      inputLabel: 'Character Card URL',
      placeholder: 'https://chub.ai/characters/Author/char-name',
      hint: 'Paste any character card URL. The source will be detected automatically.'
    },
    {
      value: 'chub',
      label: 'chub.ai / characterhub.org',
      inputLabel: 'Character Path or URL',
      placeholder: 'AuthorName/character-name',
      hint: 'Enter the Author/char-name path from the chub.ai URL.'
    },
    {
      value: 'pygmalion',
      label: 'pygmalion.chat',
      inputLabel: 'Character UUID',
      placeholder: 'd7950ca8-c241-4725-8de1-42866e389ebf',
      hint: 'Enter the character UUID from the pygmalion.chat URL.'
    },
    {
      value: 'character-tavern',
      label: 'character-tavern.com',
      inputLabel: 'Character ID or URL',
      placeholder: 'character-id-or-slug',
      hint: 'Enter the character ID or full URL from character-tavern.com.'
    },
    {
      value: 'raw',
      label: 'Raw URL',
      inputLabel: 'Direct URL to character file',
      placeholder: 'https://example.com/file.png',
      hint: 'Direct link to a .json or .png character card file. PNG files with embedded character data are supported.'
    }
  ];

  selectedSource: ImportSource = 'auto';
  inputValue = '';
  isLoading = false;
  errorMessage = '';
  previewCharacter?: Partial<Character>;

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private importService: CharacterImportService
  ) {
    addIcons({ closeOutline, cloudDownloadOutline, checkmarkCircleOutline });
  }

  ngOnInit() {}

  get currentSource(): SourceOption | undefined {
    return this.sources.find(s => s.value === this.selectedSource);
  }

  onSourceChange() {
    this.inputValue = '';
    this.errorMessage = '';
    this.previewCharacter = undefined;
  }

  async importCharacter() {
    if (!this.inputValue.trim()) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.previewCharacter = undefined;

    try {
      const character = await this.importService.importAndSave(this.selectedSource, this.inputValue.trim());
      this.previewCharacter = character;

      const toast = await this.toastCtrl.create({
        message: `✅ "${character.name}" imported successfully!`,
        duration: 3000,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();

      // Close with the new character so the list can refresh
      setTimeout(() => {
        this.modalCtrl.dismiss({ imported: true, character });
      }, 1000);
    } catch (err: any) {
      this.errorMessage = err.message || 'Import failed. Please check the URL and try again.';
    } finally {
      this.isLoading = false;
    }
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
