import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, addOutline, listOutline, eyeOutline } from 'ionicons/icons';
import { ScenarioService } from '../../../core/services/scenario.service';
import { Scenario } from '../../../core/models/scenario.model';
import { InstructionEditorModalComponent, InstructionBlock } from '../../../shared/components/instruction-editor-modal/instruction-editor-modal.component';

@Component({
  selector: 'app-world-story',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
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
          <ion-button (click)="save()" class="mb-btn-primary" style="height:32px; font-size:13px; font-weight:600;">
            Save
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="form-container mb-fade-in">
        <div class="header-block">
          <div class="header-icon"><ion-icon name="book-outline"></ion-icon></div>
          <div>
            <h1 class="page-title">Story</h1>
            <p class="page-subtitle">The AI's instructions, how the journey opens, and how it can end.</p>
          </div>
        </div>

        <!-- Instructions -->
        <div class="section-block">
          <h2 class="section-title"><ion-icon name="list-outline"></ion-icon> Instructions</h2>
          
          <div class="form-group">
            <label>General Instructions</label>
            <p class="help-text">Core world-building and rules for the AI. Describe the setting, tone, key mechanics, and boundaries. Always included in the prompt. <a href="#">Supports macros ⓘ</a></p>
            <ion-textarea [(ngModel)]="world.generalInstructions" class="mb-input" rows="6"></ion-textarea>
          </div>

          <div class="form-group">
            <div class="flex-between">
              <label>Named instruction blocks</label>
              <button class="add-btn" (click)="openInstructionEditor()">
                <ion-icon name="add-outline"></ion-icon> Add
              </button>
            </div>
            <p class="help-text">Optional named blocks appended to the instructions above, great for organizing rules like gameplay mechanics.</p>
            
            <div class="blocks-list" *ngIf="world.namedInstructions && world.namedInstructions.length > 0">
              <div class="instruction-item" *ngFor="let block of world.namedInstructions; let i = index" (click)="openInstructionEditor(block, i)">
                <span class="block-name">{{ block.name || 'Unnamed block' }}</span>
                <span class="block-preview">{{ block.content | slice:0:40 }}...</span>
              </div>
            </div>
            <div class="empty-blocks" *ngIf="!world.namedInstructions || world.namedInstructions.length === 0">
              No instruction blocks.
            </div>
          </div>

          <div class="form-group">
            <label>NSFW instructions (optional)</label>
            <p class="help-text">Extra guidance the AI follows only for players who have NSFW content enabled. <a href="#">Supports macros ⓘ</a></p>
            <ion-textarea [(ngModel)]="world.nsfwInstructions" class="mb-input" rows="4"></ion-textarea>
          </div>

          <div class="form-group">
            <label>Narration length</label>
            <p class="help-text">How long the AI's narrative responses should be.</p>
            
            <ion-radio-group [(ngModel)]="world.narrationLength">
              <div class="radio-option" (click)="world.narrationLength = 'brief'">
                <ion-radio [value]="'brief'"></ion-radio>
                <div class="radio-text">
                  <strong>Brief</strong>
                  <span>Short, dialogue-forward replies. Best for chat-style.</span>
                </div>
              </div>
              <div class="radio-option" (click)="world.narrationLength = 'standard'">
                <ion-radio [value]="'standard'"></ion-radio>
                <div class="radio-text">
                  <strong>Standard</strong>
                  <span>The engine's default pacing.</span>
                </div>
              </div>
            </ion-radio-group>
          </div>
        </div>

        <!-- Journey Start -->
        <div class="section-block">
          <h2 class="section-title"><ion-icon name="play-outline"></ion-icon> Journey Start</h2>
          
          <div class="form-group">
            <label>Introduction <span class="required">Required</span></label>
            <p class="help-text">Opening narration shown to the player when the game starts, before the first AI turn. <a href="#">Supports macros ⓘ</a></p>
            <div class="editor-toolbar">
              <button><b>B</b></button>
              <button><i>I</i></button>
              <button><s>S</s></button>
              <div class="divider"></div>
              <button>H▾</button>
              <button>≡</button>
              <button>”</button>
              <button>&lt;/&gt;</button>
              <button>🔗</button>
            </div>
            <ion-textarea [(ngModel)]="world.introduction" class="mb-input editor-textarea" rows="6"></ion-textarea>
            <div class="editor-footer">
              <button class="footer-btn"><ion-icon name="document-text-outline"></ion-icon> Markdown guide</button>
              <button class="footer-btn preview-btn"><ion-icon name="eye-outline"></ion-icon> Preview introduction</button>
            </div>
          </div>

          <div class="form-group">
            <label>Journey Objective <span class="required">Required</span></label>
            <p class="help-text">The overarching goal or theme. Guides the AI's narrative direction and pacing. <a href="#">Supports macros ⓘ</a></p>
            <ion-textarea [(ngModel)]="world.journeyObjective" class="mb-input" rows="3"></ion-textarea>
          </div>

          <div class="form-group toggle-group">
            <ion-toggle [(ngModel)]="world.showObjectiveToPlayer" color="primary"></ion-toggle>
            <div class="toggle-text">
              <label>Show journey objective to the player</label>
              <p class="help-text">When enabled, the objective card appears at the top of the narrative.</p>
            </div>
          </div>

          <div class="form-group">
            <label>First action suggestion <span class="required">Required</span></label>
            <p class="help-text">Offered to the player as a one-click "Suggested first turn" before their first turn. (e.g. 'Open the strange letter') <a href="#">Supports macros ⓘ</a></p>
            <ion-textarea [(ngModel)]="world.firstActionSuggestion" class="mb-input" rows="2"></ion-textarea>
          </div>
          
          <button class="preview-journey-btn">
            <ion-icon name="eye-outline"></ion-icon> Preview journey start
          </button>
        </div>

        <!-- Endings -->
        <div class="section-block">
          <h2 class="section-title"><ion-icon name="flag-outline"></ion-icon> Endings</h2>
          <p class="help-text">Define conditions under which the AI can declare the story has reached its conclusion.</p>
          
          <div class="segment-control">
            <button class="segment-btn" [class.active]="world.endingMode === 'off' || !world.endingMode" (click)="world.endingMode = 'off'">Off</button>
            <button class="segment-btn" [class.active]="world.endingMode === 'simple'" (click)="world.endingMode = 'simple'">Simple</button>
            <button class="segment-btn" [class.active]="world.endingMode === 'multiple'" (click)="world.endingMode = 'multiple'">Multiple Endings</button>
          </div>
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    .form-container {
      max-width: 600px;
      margin: 0 auto;
      padding-bottom: 40px;
    }
    .header-block {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    .header-icon {
      width: 48px;
      height: 48px;
      background: rgba(167, 139, 250, 0.15);
      color: #a78bfa;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    .page-title {
      font-size: 24px;
      font-weight: 800;
      color: white;
      margin: 0 0 4px 0;
    }
    .page-subtitle {
      font-size: 13px;
      color: var(--mb-text-muted);
      margin: 0;
    }
    
    .section-block {
      background: var(--mb-bg-card);
      border: 1px solid var(--mb-border);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: white;
      margin: 0 0 20px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title ion-icon {
      color: var(--mb-primary);
    }
    
    .form-group { margin-bottom: 24px; }
    .form-group:last-child { margin-bottom: 0; }
    
    .flex-between {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    
    label {
      display: flex;
      font-weight: 600;
      color: var(--mb-text-primary);
      font-size: 14px;
    }
    .required { color: #f472b6; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-left: 8px; }
    .help-text { font-size: 12px; color: var(--mb-text-muted); margin: 0 0 10px 0; line-height: 1.4; }
    .help-text a { color: var(--mb-primary); text-decoration: none; }
    
    .add-btn {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }
    .add-btn:hover { background: rgba(59, 130, 246, 0.2); }
    
    .empty-blocks {
      font-size: 13px;
      color: var(--mb-text-muted);
      font-style: italic;
      padding: 12px 0;
    }
    .blocks-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .instruction-item {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      cursor: pointer;
    }
    .instruction-item:hover { background: rgba(255,255,255,0.08); }
    .block-name { font-size: 14px; font-weight: 600; color: white; }
    .block-preview { font-size: 12px; color: var(--mb-text-muted); }
    
    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .radio-option {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      cursor: pointer;
    }
    .radio-text strong { display: block; font-size: 14px; color: white; margin-bottom: 2px; }
    .radio-text span { font-size: 12px; color: var(--mb-text-muted); }
    
    .editor-toolbar {
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--mb-border);
      border-bottom: none;
      border-radius: 8px 8px 0 0;
      padding: 6px 8px;
    }
    .editor-toolbar button {
      background: transparent;
      border: none;
      color: var(--mb-text-secondary);
      width: 28px;
      height: 28px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .editor-toolbar button:hover { background: rgba(255,255,255,0.1); color: white; }
    .divider { width: 1px; height: 16px; background: rgba(255,255,255,0.2); margin: 0 4px; }
    .editor-textarea {
      border-radius: 0 0 8px 8px;
      border-top: none;
    }
    .editor-footer {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
    }
    .footer-btn {
      background: transparent;
      border: none;
      color: var(--mb-primary);
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }
    .preview-btn { color: white; }
    
    .toggle-group {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    .toggle-text label { margin-bottom: 4px; }
    .toggle-text p { margin: 0; }
    
    .preview-journey-btn {
      width: 100%;
      background: transparent;
      border: none;
      color: var(--mb-text-muted);
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 16px 0 0 0;
      margin-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.1);
      cursor: pointer;
    }
    .preview-journey-btn:hover { color: white; }
    
    .segment-control {
      display: flex;
      background: rgba(0,0,0,0.3);
      border-radius: 8px;
      padding: 4px;
    }
    .segment-btn {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--mb-text-muted);
      font-size: 13px;
      font-weight: 600;
      padding: 8px 0;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .segment-btn.active {
      background: rgba(255,255,255,0.1);
      color: white;
    }
  `]
})
export class WorldStoryComponent implements OnInit {
  worldId: string | null = null;
  world: Partial<Scenario> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private scenarioService: ScenarioService,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController
  ) {
    addIcons({ arrowBackOutline, addOutline, listOutline, eyeOutline });
  }

  async ngOnInit() {
    this.worldId = this.route.snapshot.paramMap.get('id');
    if (this.worldId) {
      const loaded = await this.scenarioService.getScenario(this.worldId);
      if (loaded) {
        this.world = loaded;
        if (!this.world.namedInstructions) {
          this.world.namedInstructions = [];
        }
      }
    }
  }

  goBack() {
    this.router.navigate(['/worlds', this.worldId, 'edit']);
  }

  async save() {
    if (this.worldId) {
      await this.scenarioService.updateScenario(this.worldId, this.world);
      const toast = await this.toastCtrl.create({ message: 'Saved story.', duration: 2000, color: 'success' });
      await toast.present();
    }
  }

  async openInstructionEditor(block?: InstructionBlock, index?: number) {
    const modal = await this.modalCtrl.create({
      component: InstructionEditorModalComponent,
      componentProps: { inputBlock: block }
    });
    
    await modal.present();
    
    const { data, role } = await modal.onDidDismiss();
    
    if (role === 'save' && data) {
      if (!this.world.namedInstructions) this.world.namedInstructions = [];
      
      if (index !== undefined) {
        this.world.namedInstructions[index] = data;
      } else {
        this.world.namedInstructions.push(data);
      }
    } else if (role === 'remove' && index !== undefined) {
      this.world.namedInstructions!.splice(index, 1);
    }
  }
}
