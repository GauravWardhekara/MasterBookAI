import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline, bookOutline, peopleOutline, libraryOutline,
  chatbubblesOutline, sparklesOutline, rocketOutline, bulbOutline
} from 'ionicons/icons';
import { ScenarioService } from '../../core/services/scenario.service';
import { CharacterService } from '../../core/services/character.service';
import { LorebookService } from '../../core/services/lorebook.service';
import { ChatSessionService } from '../../core/services/chat-session.service';
import { MemoryService } from '../../core/services/memory.service';

@Component({
  selector: 'app-home',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>
          <span class="brand-title">
            <ion-icon name="sparkles-outline" class="brand-icon"></ion-icon>
            MasterBookAI
          </span>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="hero-section mb-fade-in">
        <div class="hero-glow"></div>
        <h1 class="hero-title">Create Your Story</h1>
        <p class="hero-subtitle">Build immersive AI-powered narratives with custom characters and rich lore</p>
        <ion-button class="mb-btn-primary hero-btn" (click)="navigateTo('/scenarios/new')">
          <ion-icon slot="start" name="rocket-outline"></ion-icon>
          New Scenario
        </ion-button>
      </div>

      <div class="stats-row mb-fade-in" style="animation-delay: 0.1s">
        <div class="stat-card" (click)="navigateTo('/scenarios')">
          <ion-icon name="book-outline" color="primary"></ion-icon>
          <div class="stat-value">{{ scenarioCount }}</div>
          <div class="stat-label">Scenarios</div>
        </div>
        <div class="stat-card" (click)="navigateTo('/characters')">
          <ion-icon name="people-outline" style="color: var(--mb-secondary)"></ion-icon>
          <div class="stat-value">{{ characterCount }}</div>
          <div class="stat-label">Characters</div>
        </div>
        <div class="stat-card" (click)="navigateTo('/lorebooks')">
          <ion-icon name="library-outline" style="color: var(--mb-accent)"></ion-icon>
          <div class="stat-value">{{ lorebookCount }}</div>
          <div class="stat-label">Lorebooks</div>
        </div>
        <div class="stat-card" (click)="navigateTo('/gallery')">
          <ion-icon name="chatbubbles-outline" style="color: var(--mb-success)"></ion-icon>
          <div class="stat-value">{{ sessionCount }}</div>
          <div class="stat-label">Sessions</div>
        </div>
      </div>

      <div class="quick-actions mb-fade-in" style="animation-delay: 0.2s">
        <div class="mb-section-header">
          <span class="mb-section-title">Quick Actions</span>
        </div>
        <div class="action-grid">
          <div class="action-card" (click)="navigateTo('/scenarios/new')">
            <div class="action-icon" style="background: rgba(167, 139, 250, 0.1)">
              <ion-icon name="book-outline" style="color: var(--mb-primary)"></ion-icon>
            </div>
            <span>New Scenario</span>
          </div>
          <div class="action-card" (click)="navigateTo('/characters/new')">
            <div class="action-icon" style="background: rgba(96, 165, 250, 0.1)">
              <ion-icon name="people-outline" style="color: var(--mb-secondary)"></ion-icon>
            </div>
            <span>New Character</span>
          </div>
          <div class="action-card" (click)="navigateTo('/lorebooks/new')">
            <div class="action-icon" style="background: rgba(245, 158, 11, 0.1)">
              <ion-icon name="library-outline" style="color: var(--mb-accent)"></ion-icon>
            </div>
            <span>New Lorebook</span>
          </div>
          <div class="action-card" (click)="navigateTo('/gallery')">
            <div class="action-icon" style="background: rgba(52, 211, 153, 0.1)">
              <ion-icon name="chatbubbles-outline" style="color: var(--mb-success)"></ion-icon>
            </div>
            <span>Gallery</span>
          </div>
        </div>
      </div>

      <div class="quick-actions mb-fade-in" style="animation-delay: 0.3s">
        <div class="mb-section-header">
          <span class="mb-section-title">Browse</span>
        </div>
        <div class="browse-grid">
          <div class="browse-card" (click)="navigateTo('/characters')">
            <ion-icon name="people-outline" style="color: var(--mb-secondary)"></ion-icon>
            <span>Characters</span>
            <span class="browse-count">{{ characterCount }}</span>
          </div>
          <div class="browse-card" (click)="navigateTo('/lorebooks')">
            <ion-icon name="library-outline" style="color: var(--mb-accent)"></ion-icon>
            <span>Lorebooks</span>
            <span class="browse-count">{{ lorebookCount }}</span>
          </div>
          <div class="browse-card" (click)="navigateTo('/memories')">
            <ion-icon name="bulb-outline" style="color: var(--mb-primary)"></ion-icon>
            <span>Memories</span>
            <span class="browse-count">{{ memoryCount }}</span>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .brand-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 800;
      font-size: 20px;
      letter-spacing: -0.5px;
    }

    .brand-icon {
      color: var(--mb-primary);
      font-size: 22px;
    }

    .hero-section {
      position: relative;
      text-align: center;
      padding: 40px 20px 32px;
      margin-bottom: 24px;
      overflow: hidden;
    }

    .hero-glow {
      position: absolute;
      top: -50%;
      left: 50%;
      transform: translateX(-50%);
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(167, 139, 250, 0.12) 0%, transparent 70%);
      pointer-events: none;
    }

    .hero-title {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -1px;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #f0f0f5 0%, #a78bfa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-subtitle {
      color: var(--mb-text-secondary);
      font-size: 15px;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .hero-btn {
      --padding-start: 24px;
      --padding-end: 24px;
      --padding-top: 12px;
      --padding-bottom: 12px;
      font-size: 15px;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 28px;
    }

    .stat-card {
      background: var(--mb-bg-card);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius-lg);
      padding: 16px 8px;
      text-align: center;
      cursor: pointer;
      transition: all var(--mb-transition-normal);
    }

    .stat-card:hover {
      border-color: var(--mb-border-light);
      transform: translateY(-2px);
      box-shadow: var(--mb-shadow-sm);
    }

    .stat-card ion-icon {
      font-size: 24px;
      margin-bottom: 8px;
    }

    .stat-value {
      font-size: 22px;
      font-weight: 800;
      color: var(--mb-text-primary);
    }

    .stat-label {
      font-size: 11px;
      color: var(--mb-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }

    .action-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .action-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--mb-bg-card);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius-md);
      padding: 14px 16px;
      cursor: pointer;
      transition: all var(--mb-transition-normal);
    }

    .action-card:hover {
      border-color: var(--mb-border-light);
      background: var(--mb-bg-card-hover);
      transform: translateY(-1px);
    }

    .action-card span {
      font-size: 14px;
      font-weight: 600;
      color: var(--mb-text-primary);
    }

    .action-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--mb-radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .action-icon ion-icon {
      font-size: 20px;
    }

    @media (max-width: 400px) {
      .stats-row {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .browse-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .browse-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      background: var(--mb-bg-card);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius-md);
      padding: 16px 10px;
      cursor: pointer;
      transition: all var(--mb-transition-normal);
    }

    .browse-card:hover {
      border-color: var(--mb-border-light);
      background: var(--mb-bg-card-hover);
      transform: translateY(-1px);
    }

    .browse-card ion-icon {
      font-size: 24px;
    }

    .browse-card span {
      font-size: 12px;
      font-weight: 600;
      color: var(--mb-text-primary);
    }

    .browse-count {
      font-size: 11px !important;
      color: var(--mb-text-muted) !important;
      font-weight: 500 !important;
    }
  `],
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon
  ],
})
export class HomePage implements OnInit {
  scenarioCount = 0;
  characterCount = 0;
  lorebookCount = 0;
  sessionCount = 0;
  memoryCount = 0;

  constructor(
    private router: Router,
    private scenarioService: ScenarioService,
    private characterService: CharacterService,
    private lorebookService: LorebookService,
    private chatSessionService: ChatSessionService,
    private memoryService: MemoryService,
  ) {
    addIcons({
      addOutline, bookOutline, peopleOutline, libraryOutline,
      chatbubblesOutline, sparklesOutline, rocketOutline, bulbOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadCounts();
  }

  async loadCounts(): Promise<void> {
    const [scenarios, characters, lorebooks, sessions, memoryStats] = await Promise.all([
      this.scenarioService.getAllScenarios(),
      this.characterService.getAllCharacters(),
      this.lorebookService.getAllLorebooks(),
      this.chatSessionService.getAllSessions(),
      this.memoryService.getStats(),
    ]);
    this.scenarioCount = scenarios.length;
    this.characterCount = characters.length;
    this.lorebookCount = lorebooks.length;
    this.sessionCount = sessions.length;
    this.memoryCount = memoryStats.total;
  }

  navigateTo(path: string): void {
    this.router.navigateByUrl(path);
  }
}
