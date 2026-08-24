import { Component, Input, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonSearchbar, IonSpinner, IonBadge, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, swapVerticalOutline, informationCircleOutline,
  hardwareChipOutline, cloudOutline, serverOutline, arrowForwardOutline
} from 'ionicons/icons';
import { Router } from '@angular/router';
import { ModelHubService } from '../../../core/services/model-hub.service';
import { HubModel, LocalModel } from '../../../core/models/model-hub.model';

interface DisplayModel {
  id: string;
  name: string;
  description: string;
  source: string;        // 'local' | 'ollama' | 'cloud'
  provider?: string;     // e.g. 'openai', 'anthropic', 'ollama'
  contextSize?: string;
  tags?: string[];
}

@Component({
  selector: 'app-model-selection-modal',
  standalone: true,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonSearchbar,
    IonSpinner,
    IonBadge
],
  template: `
    <ion-header class="ion-no-border ms-header">
      <ion-toolbar class="transparent-toolbar">
        <ion-buttons slot="start">
          <ion-button (click)="cancel()">
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title class="ms-title">Models</ion-title>
        <ion-buttons slot="end">
          <ion-button>
            <ion-icon slot="icon-only" name="swap-vertical-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <div class="search-container">
        <ion-searchbar
          class="ms-searchbar"
          placeholder="Search models"
          [(ngModel)]="searchFilter"
          (ionInput)="applyFilter()">
        </ion-searchbar>
      </div>
    </ion-header>
    
    <ion-content class="ms-content ion-padding">
      <div class="ms-container">
    
        <!-- Loading -->
        @if (isLoading) {
          <div class="loading-state">
            <ion-spinner name="crescent" color="warning"></ion-spinner>
            <span>Loading models...</span>
          </div>
        }
    
        <!-- Local Models Section -->
        @if (!isLoading && filteredLocalModels.length > 0) {
          <div class="section-header">
            <ion-icon name="hardware-chip-outline"></ion-icon>
            <span>Local Models</span>
          </div>
          <div class="model-list">
            @for (model of filteredLocalModels; track model) {
              <div class="model-card"
                (click)="selectModel(model)"
                [class.selected]="currentModel === model.name">
                <div class="card-header">
                  <div class="name-badge-wrapper">
                    <span class="model-name">{{ model.name }}</span>
                    <ion-badge color="success" class="source-badge">local</ion-badge>
                  </div>
                  <ion-icon name="information-circle-outline"></ion-icon>
                </div>
                <div class="card-desc">{{ model.description }}</div>
                @if (model.tags?.length) {
                  <div class="card-tags">
                    @for (t of model.tags?.slice(0, 3); track t) {
                      <span class="tag">{{ t }}</span>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
    
        <!-- Cloud Models Section -->
        @if (!isLoading && filteredCloudModels.length > 0) {
          <div class="section-header">
            <ion-icon name="cloud-outline"></ion-icon>
            <span>Cloud Models</span>
          </div>
          <div class="model-list">
            @for (model of filteredCloudModels; track model) {
              <div class="model-card"
                (click)="selectModel(model)"
                [class.selected]="currentModel === model.name">
                <div class="card-header">
                  <div class="name-badge-wrapper">
                    <span class="model-name">{{ model.name }}</span>
                    <ion-badge color="tertiary" class="source-badge">{{ model.provider }}</ion-badge>
                  </div>
                  <ion-icon name="information-circle-outline"></ion-icon>
                </div>
                <div class="card-desc">{{ model.description }}</div>
              </div>
            }
          </div>
        }
    
        <!-- Empty state -->
        @if (!isLoading && filteredLocalModels.length === 0 && filteredCloudModels.length === 0) {
          <div class="empty-state">
            <ion-icon name="hardware-chip-outline" class="empty-icon"></ion-icon>
            <h3>No Models Available</h3>
            <p>Download models from the Model Hub or configure cloud providers in Settings.</p>
          </div>
        }
    
        <!-- Browse More -->
        @if (!isLoading) {
          <div class="browse-more">
            <ion-button expand="block" fill="outline" color="warning" (click)="browseModels()">
              <ion-icon slot="start" name="arrow-forward-outline"></ion-icon>
              Browse More Models
            </ion-button>
          </div>
        }
    
      </div>
    </ion-content>
    `,
  styles: [`
    .ms-header { background: #1c1c1e; }
    .transparent-toolbar { --background: transparent; color: white; }
    .ms-title { font-size: 17px; font-weight: 600; text-align: center; }

    .search-container { padding: 0 16px 12px; background: #1c1c1e; }
    .ms-searchbar {
      --background: transparent; --color: white; --placeholder-color: #a1a1aa;
      --icon-color: #a1a1aa; --border-radius: 8px; padding-left: 0; padding-right: 0;
      --box-shadow: none;
    }

    .ms-content { --background: #1c1c1e; }
    .ms-container { max-width: 600px; margin: 0 auto; padding-bottom: 30px; }

    /* Loading */
    .loading-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 12px; padding: 48px 0; color: #a1a1aa;
    }

    /* Section Header */
    .section-header {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 600; color: #71717a;
      text-transform: uppercase; letter-spacing: 0.5px;
      margin-bottom: 10px; margin-top: 16px;
    }
    .section-header ion-icon { font-size: 16px; }

    /* Model Cards */
    .model-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 8px; }

    .model-card {
      background: #27272a; border-radius: 12px; padding: 16px; cursor: pointer;
      border: 2px solid transparent; transition: all 0.2s ease;
    }
    .model-card:active { transform: scale(0.98); }
    .model-card.selected { border-color: #a855f7; background: rgba(168,85,247,0.08); }

    .card-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
    }
    .name-badge-wrapper { display: flex; align-items: center; gap: 8px; }
    .model-name { font-size: 15px; font-weight: 700; color: white; }
    .source-badge { font-size: 10px; padding: 2px 8px; border-radius: 10px; }
    .card-header ion-icon { color: #a1a1aa; font-size: 20px; }
    .card-desc { font-size: 13px; color: #71717a; }
    .card-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .tag {
      font-size: 11px; color: #a1a1aa; padding: 2px 8px;
      background: rgba(255,255,255,0.06); border-radius: 6px;
    }

    /* Empty State */
    .empty-state { text-align: center; padding: 48px 24px; color: #71717a; }
    .empty-icon { font-size: 48px; color: #3f3f46; margin-bottom: 16px; display: block; }
    .empty-state h3 { color: white; font-size: 18px; margin: 0 0 8px; }
    .empty-state p { font-size: 14px; margin: 0; }

    /* Browse More */
    .browse-more { margin-top: 24px; }
    .browse-more ion-button { --border-radius: 12px; font-weight: 600; }
  `]
})
export class ModelSelectionModalComponent implements OnInit {
  @Input() currentModel: string = '';

  searchFilter = '';
  isLoading = false;

  allLocalModels: DisplayModel[] = [];
  allCloudModels: DisplayModel[] = [];
  filteredLocalModels: DisplayModel[] = [];
  filteredCloudModels: DisplayModel[] = [];

  constructor(
    private modalCtrl: ModalController,
    private modelHub: ModelHubService,
    private router: Router
  ) {
    addIcons({
      closeOutline, swapVerticalOutline, informationCircleOutline,
      hardwareChipOutline, cloudOutline, serverOutline, arrowForwardOutline
    });
  }

  async ngOnInit() {
    this.isLoading = true;
    await this.loadModels();
    this.isLoading = false;
  }

  private async loadModels() {
    // Local models (from Ollama + tracked local downloads)
    try {
      const ollamaModels = await this.modelHub.getOllamaModels();
      this.allLocalModels = ollamaModels.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description || 'Ollama model',
        source: 'ollama',
        provider: 'ollama',
        tags: m.tags,
      }));
    } catch {
      this.allLocalModels = [];
    }

    // Also add locally tracked models that aren't from Ollama
    try {
      const localTracked = await this.modelHub.getLocalModels();
      for (const lm of localTracked) {
        if (!this.allLocalModels.some(m => m.name === lm.name)) {
          this.allLocalModels.push({
            id: lm.id,
            name: lm.name,
            description: `${lm.source} • ${this.modelHub.formatBytes(lm.sizeBytes)}${lm.quantType ? ' • ' + lm.quantType : ''}`,
            source: lm.source,
            provider: lm.provider,
            tags: [],
          });
        }
      }
    } catch { /* ok */ }

    // Cloud models (from connection profiles)
    try {
      const cloudModels = await this.modelHub.getCloudModels();
      this.allCloudModels = cloudModels.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description || 'Cloud model',
        source: 'cloud',
        provider: m.tags?.[0] || 'cloud',
        tags: m.tags,
      }));
    } catch {
      this.allCloudModels = [];
    }

    this.applyFilter();
  }

  applyFilter() {
    const q = this.searchFilter.toLowerCase().trim();
    if (!q) {
      this.filteredLocalModels = [...this.allLocalModels];
      this.filteredCloudModels = [...this.allCloudModels];
    } else {
      this.filteredLocalModels = this.allLocalModels.filter(m =>
        m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
      );
      this.filteredCloudModels = this.allCloudModels.filter(m =>
        m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
      );
    }
  }

  selectModel(model: DisplayModel) {
    this.modalCtrl.dismiss({ model: model.name, provider: model.provider, modelId: model.id });
  }

  async browseModels() {
    await this.modalCtrl.dismiss();
    this.router.navigate(['/models']);
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
