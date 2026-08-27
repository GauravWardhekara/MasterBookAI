import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonContent, IonButton, IonIcon,
  IonButtons, IonBackButton, AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, playOutline, chatbubblesOutline, peopleOutline, 
  libraryOutline, starOutline, ellipsisHorizontalOutline, warningOutline
} from 'ionicons/icons';

import { ScenarioService } from '../../../core/services/scenario.service';
import { CharacterService } from '../../../core/services/character.service';
import { ChatSessionService } from '../../../core/services/chat-session.service';
import { ConnectionService } from '../../../core/services/connection.service';

import { Scenario } from '../../../core/models/scenario.model';
import { Character } from '../../../core/models/character.model';
import { ChatSession } from '../../../core/models/chat-session.model';

@Component({
  selector: 'app-scenario-detail',
  template: `
    <ion-content [fullscreen]="true" class="hero-content">
      <!-- Background Image -->
      <div class="hero-bg" [style.backgroundImage]="getBackgroundImage()"></div>
      <div class="hero-overlay"></div>

      <!-- Header (Transparent) -->
      <ion-header class="ion-no-border transparent-header">
        <ion-toolbar class="transparent-toolbar">
          <ion-buttons slot="start">
            <ion-back-button [defaultHref]="getDefaultHref()" text="" icon="arrow-back-outline" class="circle-btn"></ion-back-button>
          </ion-buttons>
          <ion-buttons slot="end">
            <ion-button class="circle-btn">
              <ion-icon slot="icon-only" name="ellipsis-horizontal-outline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      @if (scenario) {
        <div class="content-container">
          <!-- Cast Section (Above Info Card) -->
          @if (characters.length > 0) {
            <div class="cast-section">
              <div class="cast-header">CAST</div>
              <div class="cast-scroll">
                @for (char of characters; track char.id) {
                  <div class="cast-card">
                    <img [src]="char.avatar || ''" class="cast-img" [alt]="char.name" />
                    <div class="cast-overlay"></div>
                    <span class="cast-role">{{ scenario.characterRoles![char.id] === 'playable' ? 'PLAYABLE' : 'NPC' }}</span>
                    <span class="cast-name">{{ char.name }}</span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Info Card -->
          <div class="info-card mb-glass-card">
            
            <div *ngIf="scenario.contentWarning" class="content-warning">
              <ion-icon name="warning-outline"></ion-icon>
              <span>{{ scenario.contentWarning }}</span>
            </div>

            <div class="info-header">
              <h1 class="info-title">{{ scenario.title }}</h1>
            </div>
            
            <div class="info-stats">
              <span class="stat-item"><ion-icon name="chatbubblesOutline"></ion-icon> {{ sessions.length }} Chats</span>
              <span class="stat-item"><ion-icon name="peopleOutline"></ion-icon> {{ characters.length }} Characters</span>
              <span class="stat-item"><ion-icon name="libraryOutline"></ion-icon> {{ scenario.lorebookIds.length || 0 }} Lorebooks</span>
            </div>

            <div class="info-tags">
              <span *ngIf="scenario.genre" class="mb-badge mb-badge-premise">{{ scenario.genre | uppercase }}</span>
              <span *ngIf="scenario.isNsfw" class="mb-badge" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border-color: #ef4444;">NSFW</span>
              @for (tag of (scenario.tags || []).slice(0, 4); track tag) {
                <span class="mb-chip">{{ tag | uppercase }}</span>
              }
            </div>

            <div class="info-desc">
              <p *ngIf="scenario.summary" style="font-weight: 600; margin-bottom: 8px;">{{ scenario.summary }}</p>
              {{ scenario.description }}
            </div>

            <div class="action-bar">
              <!-- Model Selector Dropdown Button -->
              <ion-button fill="clear" class="model-select-btn" (click)="selectModel()">
                {{ selectedModel || 'Select Model' }}
                <span style="font-size: 10px; margin-left: 4px;">▼</span>
              </ion-button>
              
              <!-- Start / Continue Chat Buttons -->
              @if (sessions.length === 0) {
                <ion-button class="start-btn mb-btn-primary" (click)="startNewChat()">
                  Play World
                </ion-button>
              } @else {
                <div class="split-actions">
                  <ion-button fill="clear" class="new-chat-btn" (click)="startNewChat()">
                    New Run
                  </ion-button>
                  <ion-button class="start-btn mb-btn-primary" (click)="continueChat()">
                    Continue
                  </ion-button>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .hero-content {
      --background: #000;
    }

    .hero-bg {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      z-index: 1;
    }

    .hero-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 40%, rgba(15, 17, 23, 0.95) 100%);
      z-index: 2;
    }

    .transparent-header {
      position: absolute;
      top: 0; left: 0; right: 0;
      z-index: 10;
      background: transparent;
    }

    .transparent-toolbar {
      --background: transparent;
      --border-width: 0;
    }

    .circle-btn {
      --background: rgba(0,0,0,0.5);
      --border-radius: 50%;
      width: 40px; height: 40px;
      margin: 8px;
      --color: white;
      backdrop-filter: blur(8px);
    }

    .content-container {
      position: relative;
      z-index: 5;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding-bottom: 24px;
    }

    /* ── Cast Section ── */
    .cast-section {
      padding: 0 16px;
      margin-bottom: 16px;
    }

    .cast-header {
      font-size: 12px;
      font-weight: 700;
      color: rgba(255,255,255,0.7);
      letter-spacing: 1px;
      margin-bottom: 12px;
    }

    .cast-scroll {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding-bottom: 8px;
      scrollbar-width: none; /* Firefox */
    }
    .cast-scroll::-webkit-scrollbar { display: none; }

    .cast-card {
      width: 100px;
      height: 140px;
      border-radius: 12px;
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .cast-img {
      width: 100%; height: 100%; object-fit: cover;
    }

    .cast-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 60%);
    }

    .cast-role {
      position: absolute;
      top: 6px; left: 6px;
      font-size: 9px;
      font-weight: 700;
      background: rgba(255,255,255,0.2);
      backdrop-filter: blur(4px);
      padding: 2px 6px;
      border-radius: 4px;
      color: white;
    }

    .cast-name {
      position: absolute;
      bottom: 8px; left: 8px; right: 8px;
      font-size: 13px;
      font-weight: 700;
      color: white;
      text-shadow: 0 1px 3px rgba(0,0,0,0.8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Info Card ── */
    .info-card {
      margin: 0 16px;
      padding: 20px;
      border-radius: 24px;
      background: rgba(20, 23, 33, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .info-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .info-title {
      font-size: 22px;
      font-weight: 700;
      color: white;
      margin: 0;
      line-height: 1.2;
    }

    .info-stats {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
    }

    .stat-item {
      font-size: 12px;
      color: rgba(255,255,255,0.6);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .info-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 16px;
    }

    .info-desc {
      font-size: 14px;
      color: rgba(255,255,255,0.8);
      line-height: 1.5;
      margin-bottom: 24px;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .action-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .model-select-btn {
      --color: white;
      --background: rgba(255,255,255,0.1);
      --border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      height: 44px;
      flex-shrink: 0;
    }

    .start-btn {
      --border-radius: 12px;
      font-weight: 700;
      height: 44px;
      flex: 1;
    }

    .split-actions {
      display: flex;
      gap: 8px;
      flex: 1;
    }

    .new-chat-btn {
      --color: white;
      --background: rgba(255,255,255,0.1);
      --border-radius: 12px;
      font-weight: 600;
      height: 44px;
      flex: 1;
    }
  `],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonContent, IonButton, IonIcon,
    IonButtons, IonBackButton
  ],
  standalone: true
})
export class ScenarioDetailPage implements OnInit {
  scenario?: Scenario;
  characters: Character[] = [];
  sessions: ChatSession[] = [];
  
  allModels: string[] = [];
  selectedModel = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private scenarioService: ScenarioService,
    private characterService: CharacterService,
    private chatSessionService: ChatSessionService,
    private connectionService: ConnectionService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({
      arrowBackOutline, playOutline, chatbubblesOutline, peopleOutline, 
      libraryOutline, starOutline, ellipsisHorizontalOutline
    });
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.scenario = await this.scenarioService.getScenario(id);
    if (!this.scenario) return;

    // Load characters
    this.characters = await this.characterService.getCharactersByIds(this.scenario.characterIds || []);

    // Load chat sessions for this scenario
    const allSessions = await this.chatSessionService.getAllSessions();
    this.sessions = allSessions
      .filter(s => s.scenarioId === id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()); // newest first

    // Load models
    await this.loadModels();
  }

  async loadModels(): Promise<void> {
    const profiles = await this.connectionService.getAllProfiles();
    let models: string[] = [];
    profiles.forEach(p => {
      if (p.modelList) models = models.concat(p.modelList);
    });
    this.allModels = [...new Set(models)];

    const defaultProfile = await this.connectionService.getDefaultProfile();
    this.selectedModel = defaultProfile?.modelList?.[0] || this.allModels[0] || '';
  }

  getDefaultHref(): string {
    return this.scenario?.type === 'world' ? '/worlds' : '/scenarios';
  }

  getBackgroundImage(): string {
    if (this.scenario?.coverImage) {
      return `url(${this.scenario.coverImage})`;
    }
    // Fallback to first character's avatar
    if (this.characters.length > 0 && this.characters[0].avatar) {
      return `url(${this.characters[0].avatar})`;
    }
    return '';
  }

  async selectModel(): Promise<void> {
    if (this.allModels.length === 0) {
      const toast = await this.toastCtrl.create({
        message: 'No models configured. Please check connection settings.',
        duration: 2000
      });
      await toast.present();
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Select Model',
      inputs: this.allModels.map(m => ({
        name: 'model',
        type: 'radio',
        label: m,
        value: m,
        checked: m === this.selectedModel
      })),
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Select',
          handler: (val) => {
            if (val) this.selectedModel = val;
          }
        }
      ]
    });
    await alert.present();
  }

  async startNewChat(): Promise<void> {
    if (!this.scenario || !this.selectedModel) return;

    const session = await this.chatSessionService.createSession({
      scenarioId: this.scenario.id,
      activeCharacterIds: this.scenario.characterIds || [],
      mode: this.scenario.defaultMode || 'chat',
      title: this.scenario.title || 'New Chat',
      activeModel: this.selectedModel
    });
    const routePrefix = this.scenario.defaultMode === 'story' ? '/story/' : '/chat/';
    this.router.navigateByUrl(routePrefix + session.id);
  }

  continueChat(): void {
    if (this.sessions.length > 0) {
      const mostRecent = this.sessions[0];
      const routePrefix = mostRecent.mode === 'story' ? '/story/' : '/chat/';
      this.router.navigateByUrl(routePrefix + mostRecent.id);
    }
  }
}
