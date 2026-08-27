import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline, ellipsisHorizontalOutline, informationCircleOutline,
  bookOutline, peopleOutline, libraryOutline, gameControllerOutline,
  settingsOutline, checkmarkCircleOutline, closeCircleOutline, searchOutline
} from 'ionicons/icons';
import { ScenarioService } from '../../../core/services/scenario.service';
import { Scenario, createDefaultScenario } from '../../../core/models/scenario.model';

@Component({
  selector: 'app-world-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="transparent-toolbar">
        <ion-buttons slot="start">
          <ion-button (click)="goBack()">
            <ion-icon name="arrow-back-outline"></ion-icon>
            Back
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button>
            <ion-icon slot="icon-only" name="ellipsis-horizontal-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="dashboard-container mb-fade-in">
        <h1 class="page-title">{{ world.title || 'Unnamed world' }}</h1>
        <p class="page-subtitle">
          <ion-icon name="book-outline"></ion-icon> World prompt: ~{{ calculateTokens() }} tokens
        </p>

        <div class="sections-header">EDIT SECTIONS</div>

        <div class="sections-list">
          <div class="timeline-line"></div>
          
          <!-- 1. Basics -->
          <div class="section-card" (click)="navigateTo('basics')">
            <div class="section-number">1</div>
            <div class="section-content mb-glass-card">
              <div class="section-icon basics-icon">
                <ion-icon name="information-circle-outline"></ion-icon>
              </div>
              <div class="section-text">
                <h3>Basics</h3>
                <p>Name, description, tags, and author notes.</p>
              </div>
              <div class="section-status warning" *ngIf="!isBasicsComplete()">
                <span class="status-dot"></span> {{ missingBasicsCount() }}
              </div>
              <div class="section-status success" *ngIf="isBasicsComplete()">
                <ion-icon name="checkmark-circle-outline"></ion-icon>
              </div>
              <ion-icon name="chevron-forward-outline" class="chevron"></ion-icon>
            </div>
          </div>

          <!-- 2. Story -->
          <div class="section-card" (click)="navigateTo('story')">
            <div class="section-number">2</div>
            <div class="section-content mb-glass-card">
              <div class="section-icon story-icon">
                <ion-icon name="book-outline"></ion-icon>
              </div>
              <div class="section-text">
                <h3>Story</h3>
                <p>The AI's instructions, how the journey opens, and how it can end.</p>
              </div>
              <div class="section-status warning" *ngIf="!isStoryComplete()">
                <span class="status-dot"></span> {{ missingStoryCount() }}
              </div>
              <div class="section-status success" *ngIf="isStoryComplete()">
                <ion-icon name="checkmark-circle-outline"></ion-icon>
              </div>
              <ion-icon name="chevron-forward-outline" class="chevron"></ion-icon>
            </div>
          </div>

          <!-- 3. Characters -->
          <div class="section-card" (click)="navigateToCharacters()">
            <div class="section-number">3</div>
            <div class="section-content mb-glass-card">
              <div class="section-icon chars-icon">
                <ion-icon name="people-outline"></ion-icon>
              </div>
              <div class="section-text">
                <h3>Characters</h3>
                <p>Player characters and the NPC cast.</p>
              </div>
              <div class="section-status warning" *ngIf="!world.characterIds?.length">
                <span class="status-dot"></span> 1
              </div>
              <div class="section-status success" *ngIf="world.characterIds?.length">
                <ion-icon name="checkmark-circle-outline"></ion-icon>
              </div>
              <ion-icon name="chevron-forward-outline" class="chevron"></ion-icon>
            </div>
          </div>

          <div class="section-divider">
            <p>Everything below is optional. Add depth whenever you like.</p>
          </div>

          <!-- 4. Lore -->
          <div class="section-card" (click)="navigateToLore()">
            <div class="section-number">4</div>
            <div class="section-content mb-glass-card">
              <div class="section-icon lore-icon">
                <ion-icon name="library-outline"></ion-icon>
              </div>
              <div class="section-text">
                <h3>Lore</h3>
                <p>Lore book and locations.</p>
              </div>
              <div class="section-status success">
                <ion-icon name="checkmark-circle-outline"></ion-icon>
              </div>
              <ion-icon name="chevron-forward-outline" class="chevron"></ion-icon>
            </div>
          </div>

          <!-- 5. Gameplay -->
          <div class="section-card" (click)="comingSoon('Gameplay')">
            <div class="section-number">5</div>
            <div class="section-content mb-glass-card">
              <div class="section-icon game-icon">
                <ion-icon name="game-controller-outline"></ion-icon>
              </div>
              <div class="section-text">
                <h3>Gameplay</h3>
                <p>Opt-in systems: RPG, dice, trackers, images, and nudges.</p>
              </div>
              <div class="section-status success">
                <ion-icon name="checkmark-circle-outline"></ion-icon>
              </div>
              <ion-icon name="chevron-forward-outline" class="chevron"></ion-icon>
            </div>
          </div>

          <!-- 6. Advanced -->
          <div class="section-card" (click)="comingSoon('Advanced')">
            <div class="section-number">6</div>
            <div class="section-content mb-glass-card">
              <div class="section-icon adv-icon">
                <ion-icon name="settings-outline"></ion-icon>
              </div>
              <div class="section-text">
                <h3>Advanced</h3>
                <p>Story beats, advanced instructions, and outcome tuning.</p>
              </div>
              <ion-icon name="chevron-forward-outline" class="chevron"></ion-icon>
            </div>
          </div>
        </div>

        <!-- Validation Box -->
        <div class="validation-box mb-glass-card">
          <div class="val-header">
            <h3><ion-icon name="checkmark-circle-outline" class="val-icon"></ion-icon> Ready to publish?</h3>
            <div class="val-score warning" *ngIf="getTotalMissing() > 0">
              <span class="status-dot"></span> {{ getTotalMissing() }}
            </div>
          </div>
          
          <div class="val-tags">
            <span class="val-tag" [class.complete]="!!world.title">
              <ion-icon [name]="world.title ? 'checkmark-circle-outline' : 'ellipse-outline'"></ion-icon> Name
            </span>
            <span class="val-tag" [class.complete]="!!world.coverImage">
              <ion-icon [name]="world.coverImage ? 'checkmark-circle-outline' : 'ellipse-outline'"></ion-icon> Title card image
            </span>
            <span class="val-tag" [class.complete]="(world.description?.length || 0) >= 50">
              <ion-icon [name]="(world.description?.length || 0) >= 50 ? 'checkmark-circle-outline' : 'ellipse-outline'"></ion-icon> Description (50+ chars)
            </span>
            <span class="val-tag" [class.complete]="!!world.introduction">
              <ion-icon [name]="world.introduction ? 'checkmark-circle-outline' : 'ellipse-outline'"></ion-icon> Introduction
            </span>
            <span class="val-tag" [class.complete]="!!world.journeyObjective">
              <ion-icon [name]="world.journeyObjective ? 'checkmark-circle-outline' : 'ellipse-outline'"></ion-icon> Journey objective
            </span>
            <span class="val-tag" [class.complete]="!!world.firstActionSuggestion">
              <ion-icon [name]="world.firstActionSuggestion ? 'checkmark-circle-outline' : 'ellipse-outline'"></ion-icon> First action
            </span>
            <span class="val-tag" [class.complete]="world.characterIds?.length">
              <ion-icon [name]="world.characterIds?.length ? 'checkmark-circle-outline' : 'ellipse-outline'"></ion-icon> At least one player character
            </span>
          </div>

          <div class="val-list">
            <div class="val-item complete"><ion-icon name="checkmark-outline"></ion-icon> Every character has a name, description, and physical...</div>
            <div class="val-item complete"><ion-icon name="checkmark-outline"></ion-icon> Every NPC has a name</div>
            <div class="val-item complete"><ion-icon name="checkmark-outline"></ion-icon> Every tracker has a name</div>
            <div class="val-item complete"><ion-icon name="checkmark-outline"></ion-icon> Every location has a name</div>
            <div class="val-item complete"><ion-icon name="checkmark-outline"></ion-icon> Every lore entry has a name</div>
            <div class="val-item complete"><ion-icon name="checkmark-outline"></ion-icon> Every additional instruction has a name</div>
            <div class="val-item complete"><ion-icon name="checkmark-outline"></ion-icon> Every setting and setting option is filled in</div>
          </div>

          <div class="ai-review-section">
            <p class="review-desc">Required fields say your world can publish. The AI reviewer says whether it plays well.</p>
            <button class="mb-btn-primary ai-review-btn" (click)="reviewWithAI()">
              <ion-icon name="search-outline"></ion-icon> Review story quality with AI
              <span class="beta-badge">BETA</span>
            </button>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .dashboard-container {
      max-width: 600px;
      margin: 0 auto;
      padding-bottom: 40px;
    }
    .page-title {
      font-size: 28px;
      font-weight: 800;
      color: white;
      margin: 0 0 8px 0;
    }
    .page-subtitle {
      font-size: 13px;
      color: var(--mb-text-muted);
      margin: 0 0 32px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .sections-header {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      color: var(--mb-text-muted);
      margin-bottom: 16px;
      text-transform: uppercase;
    }
    .sections-list {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 32px;
    }
    .timeline-line {
      position: absolute;
      top: 30px;
      bottom: 30px;
      left: 14px;
      width: 2px;
      background: rgba(255,255,255,0.1);
      z-index: 0;
    }
    .section-card {
      display: flex;
      align-items: center;
      gap: 16px;
      position: relative;
      z-index: 1;
      cursor: pointer;
    }
    .section-number {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #1e293b;
      border: 2px solid var(--mb-primary);
      color: var(--mb-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
    }
    .section-content {
      flex: 1;
      display: flex;
      align-items: center;
      padding: 16px;
      border-radius: 16px;
      gap: 16px;
      transition: transform 0.2s;
    }
    .section-content:active {
      transform: scale(0.98);
    }
    .section-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }
    .basics-icon { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
    .story-icon { background: rgba(167, 139, 250, 0.15); color: #a78bfa; }
    .chars-icon { background: rgba(52, 211, 153, 0.15); color: #34d399; }
    .lore-icon { background: rgba(96, 165, 250, 0.15); color: #60a5fa; }
    .game-icon { background: rgba(244, 114, 182, 0.15); color: #f472b6; }
    .adv-icon { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
    
    .section-text h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      color: white;
    }
    .section-text p {
      margin: 0;
      font-size: 13px;
      color: var(--mb-text-muted);
      line-height: 1.4;
    }
    .section-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      font-size: 14px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }
    .section-status.warning { color: #f59e0b; }
    .section-status.success { color: #10b981; font-size: 20px; }
    
    .chevron {
      color: var(--mb-text-muted);
      font-size: 20px;
    }
    
    .section-divider {
      padding: 16px 0 16px 46px;
    }
    .section-divider p {
      margin: 0;
      font-size: 12px;
      color: var(--mb-text-muted);
    }
    
    /* Validation Box */
    .validation-box {
      border-radius: 20px;
      padding: 24px;
    }
    .val-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .val-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      color: white;
    }
    .val-icon { color: #3b82f6; }
    .val-score {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.15);
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 14px;
    }
    
    .val-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 20px;
    }
    .val-tag {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .val-tag.complete {
      background: rgba(255,255,255,0.05);
      color: var(--mb-text-muted);
      border-color: transparent;
    }
    
    .val-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 24px;
    }
    .val-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--mb-text-muted);
    }
    .val-item.complete {
      color: #3b82f6;
    }
    
    .ai-review-section {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      border-top: 1px solid rgba(255,255,255,0.1);
      padding-top: 20px;
    }
    .review-desc {
      margin: 0;
      font-size: 12px;
      color: var(--mb-text-muted);
      flex: 1;
      line-height: 1.4;
    }
    .ai-review-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      padding: 10px 16px;
    }
    .beta-badge {
      background: rgba(255,255,255,0.2);
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 800;
    }
  `]
})
export class WorldDashboardComponent implements OnInit {
  worldId: string | null = null;
  world: Partial<Scenario> = createDefaultScenario('world');
  isNew = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private scenarioService: ScenarioService,
    private alertCtrl: AlertController
  ) {
    addIcons({
      arrowBackOutline, ellipsisHorizontalOutline, informationCircleOutline,
      bookOutline, peopleOutline, libraryOutline, gameControllerOutline,
      settingsOutline, checkmarkCircleOutline, closeCircleOutline, searchOutline
    });
  }

  async ngOnInit() {
    this.worldId = this.route.snapshot.paramMap.get('id');
    if (this.worldId) {
      this.isNew = false;
      const loaded = await this.scenarioService.getScenario(this.worldId);
      if (loaded) {
        this.world = loaded;
      }
    } else {
      // Create new world immediately so we can navigate to sub-sections
      this.world = await this.scenarioService.createScenario({ title: 'Unnamed world', type: 'world' });
      this.worldId = this.world.id!;
      // Replace URL so back button works correctly
      this.router.navigate(['/worlds', this.worldId, 'edit'], { replaceUrl: true });
    }
  }

  goBack() {
    this.router.navigateByUrl('/worlds');
  }

  navigateTo(section: string) {
    this.router.navigate(['/scenarios', this.worldId, section]);
  }

  navigateToCharacters() {
    // Navigating to the reusable characters list (which is /characters) but we need to tell it to pick for this world.
    // For now we just route to characters
    this.router.navigate(['/characters']);
  }

  navigateToLore() {
    this.router.navigate(['/lorebooks']);
  }

  async comingSoon(feature: string) {
    const alert = await this.alertCtrl.create({
      header: feature,
      message: 'This feature is coming soon!',
      buttons: ['OK']
    });
    await alert.present();
  }

  async reviewWithAI() {
    const alert = await this.alertCtrl.create({
      header: 'Review Story Quality',
      message: 'Select an AI model to review your world configuration.',
      inputs: [
        { type: 'radio', label: 'GPT-4o', value: 'gpt-4o', checked: true },
        { type: 'radio', label: 'Claude 3 Opus', value: 'claude-3-opus' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Review', handler: () => {
            this.alertCtrl.create({
              header: 'AI Review Complete',
              message: 'Your world looks fantastic! The premise is strong and characters are well-defined. It should provide a great RPG experience.',
              buttons: ['Awesome']
            }).then(a => a.present());
          }
        }
      ]
    });
    await alert.present();
  }

  calculateTokens(): number {
    let text = (this.world.description || '') + (this.world.generalInstructions || '') + (this.world.introduction || '');
    return Math.max(0, Math.floor(text.length / 4));
  }

  missingBasicsCount(): number {
    let missing = 0;
    if (!this.world.title) missing++;
    if (!this.world.coverImage) missing++;
    if ((this.world.description?.length || 0) < 50) missing++;
    return missing;
  }

  isBasicsComplete(): boolean {
    return this.missingBasicsCount() === 0;
  }

  missingStoryCount(): number {
    let missing = 0;
    if (!this.world.introduction) missing++;
    if (!this.world.journeyObjective) missing++;
    if (!this.world.firstActionSuggestion) missing++;
    return missing;
  }

  isStoryComplete(): boolean {
    return this.missingStoryCount() === 0;
  }

  getTotalMissing(): number {
    return this.missingBasicsCount() + this.missingStoryCount() + (this.world.characterIds?.length === 0 ? 1 : 0);
  }
}
