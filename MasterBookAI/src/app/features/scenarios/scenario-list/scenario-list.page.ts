import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonSearchbar, IonFab, IonFabButton,
  AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline, createOutline, trashOutline, bookOutline, playOutline,
  searchOutline, peopleOutline, libraryOutline
} from 'ionicons/icons';
import { ScenarioService } from '../../../core/services/scenario.service';
import { CharacterService } from '../../../core/services/character.service';
import { LorebookService } from '../../../core/services/lorebook.service';
import { ChatSessionService } from '../../../core/services/chat-session.service';
import { Scenario } from '../../../core/models/scenario.model';
import { Character } from '../../../core/models/character.model';
import { Lorebook } from '../../../core/models/lorebook.model';

@Component({
  selector: 'app-scenario-list',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Scenarios</ion-title>
        <ion-button slot="end" fill="clear" (click)="navigateTo('/scenarios/new')">
          <ion-icon slot="icon-only" name="add-outline"></ion-icon>
        </ion-button>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          [(ngModel)]="searchQuery"
          (ionInput)="onSearch()"
          placeholder="Search scenarios..."
          class="mb-input"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div *ngIf="scenarios.length === 0" class="mb-empty-state">
        <ion-icon name="book-outline"></ion-icon>
        <h3>No Scenarios Yet</h3>
        <p>Create a scenario with characters and lorebooks to start your adventure</p>
        <ion-button class="mb-btn-primary" (click)="navigateTo('/scenarios/new')">
          <ion-icon slot="start" name="add-outline"></ion-icon>
          Create Scenario
        </ion-button>
      </div>

      <div class="scenario-list" *ngIf="scenarios.length > 0">
        <div *ngFor="let s of scenarios; let i = index"
             class="scenario-card mb-glass-card mb-fade-in"
             [style.animation-delay]="(i * 0.05) + 's'"
             (click)="navigateTo('/scenarios/' + s.id + '/edit')">
          <div class="sc-cover" *ngIf="s.coverImage">
            <img [src]="s.coverImage" alt="" />
          </div>
          <div class="sc-cover sc-placeholder" *ngIf="!s.coverImage">
            <div class="sc-gradient"></div>
            <span>📖</span>
          </div>
          <div class="sc-body">
            <div class="sc-title">{{ s.title }}</div>
            <div class="sc-desc" *ngIf="s.description">{{ s.description | slice:0:80 }}...</div>
            <div class="sc-meta">
              <span class="sc-meta-item">
                <ion-icon name="people-outline"></ion-icon>
                {{ s.characterIds.length }} chars
              </span>
              <span class="sc-meta-item">
                <ion-icon name="library-outline"></ion-icon>
                {{ s.lorebookIds.length }} lorebooks
              </span>
              <span class="sc-meta-item mb-badge" [class]="'mb-badge-' + (s.defaultMode === 'chat' ? 'memory' : 'premise')">
                {{ s.defaultMode | titlecase }}
              </span>
            </div>
          </div>
          <div class="sc-actions">
            <ion-button fill="clear" size="small" color="success" (click)="startChat(s, $event)">
              <ion-icon slot="icon-only" name="play-outline"></ion-icon>
            </ion-button>
            <ion-button fill="clear" size="small" (click)="editScenario(s, $event)">
              <ion-icon slot="icon-only" name="create-outline"></ion-icon>
            </ion-button>
            <ion-button fill="clear" size="small" color="danger" (click)="confirmDelete(s, $event)">
              <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
            </ion-button>
          </div>
        </div>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="navigateTo('/scenarios/new')">
          <ion-icon name="add-outline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [`
    .scenario-list { display: flex; flex-direction: column; gap: 14px; }

    .scenario-card {
      display: flex; overflow: hidden; cursor: pointer; padding: 0;
    }

    .sc-cover {
      width: 80px; min-height: 90px; flex-shrink: 0;
      position: relative; overflow: hidden;
    }

    .sc-cover img { width: 100%; height: 100%; object-fit: cover; }

    .sc-placeholder {
      display: flex; align-items: center; justify-content: center;
      background: var(--mb-bg-elevated); font-size: 28px;
    }

    .sc-gradient {
      position: absolute; inset: 0;
      background: linear-gradient(135deg, rgba(167, 139, 250, 0.15), rgba(96, 165, 250, 0.1));
    }

    .sc-body { flex: 1; padding: 14px; min-width: 0; }

    .sc-title {
      font-size: 17px; font-weight: 700;
      color: var(--mb-text-primary); margin-bottom: 4px;
    }

    .sc-desc {
      font-size: 13px; color: var(--mb-text-muted);
      margin-bottom: 8px; line-height: 1.3;
    }

    .sc-meta {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }

    .sc-meta-item {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; color: var(--mb-text-muted);
    }

    .sc-meta-item ion-icon { font-size: 14px; }

    .sc-actions {
      display: flex; flex-direction: column; justify-content: center;
      padding: 8px; gap: 0;
    }
  `],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonSearchbar, IonFab, IonFabButton
  ],
})
export class ScenarioListPage implements OnInit {
  scenarios: Scenario[] = [];
  searchQuery = '';

  constructor(
    private router: Router,
    private scenarioService: ScenarioService,
    private chatSessionService: ChatSessionService,
    private alertCtrl: AlertController,
  ) {
    addIcons({
      addOutline, createOutline, trashOutline, bookOutline, playOutline,
      searchOutline, peopleOutline, libraryOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadScenarios();
  }

  async loadScenarios(): Promise<void> {
    this.scenarios = await this.scenarioService.getAllScenarios();
  }

  async onSearch(): Promise<void> {
    if (this.searchQuery.trim()) {
      this.scenarios = await this.scenarioService.searchScenarios(this.searchQuery);
    } else {
      await this.loadScenarios();
    }
  }

  editScenario(s: Scenario, event: Event): void {
    event.stopPropagation();
    this.navigateTo(`/scenarios/${s.id}/edit`);
  }

  async confirmDelete(s: Scenario, event: Event): Promise<void> {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Delete Scenario',
      message: `Delete "${s.title}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: async () => {
            await this.scenarioService.deleteScenario(s.id);
            await this.loadScenarios();
          },
        },
      ],
    });
    await alert.present();
  }

  navigateTo(path: string): void {
    this.router.navigateByUrl(path);
  }

  async startChat(s: Scenario, event: Event): Promise<void> {
    event.stopPropagation();
    const session = await this.chatSessionService.createSession({
      scenarioId: s.id,
      activeCharacterIds: s.characterIds || [],
      mode: s.defaultMode || 'chat',
      title: s.title || 'New Chat',
    });
    const routePrefix = s.defaultMode === 'story' ? '/story/' : '/chat/';
    this.router.navigateByUrl(routePrefix + session.id);
  }
}
