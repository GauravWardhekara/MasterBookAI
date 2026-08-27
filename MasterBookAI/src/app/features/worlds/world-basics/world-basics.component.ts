import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, cloudUploadOutline, sparklesOutline, imageOutline } from 'ionicons/icons';
import { ScenarioService } from '../../../core/services/scenario.service';
import { Scenario } from '../../../core/models/scenario.model';

@Component({
  selector: 'app-world-basics',
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
        <h1 class="page-title">Basics</h1>
        <p class="page-subtitle">Name, description, tags, and author notes.</p>

        <!-- World Info -->
        <div class="section-block">
          <h2 class="section-title"><ion-icon name="information-circle-outline"></ion-icon> World Info</h2>
          
          <div class="form-group">
            <label>Name <span class="required">Required</span></label>
            <p class="help-text">Display name shown in the world browser and game UI</p>
            <ion-input [(ngModel)]="world.title" class="mb-input" placeholder="e.g. Neo-Cyberia 2099"></ion-input>
          </div>

          <div class="form-group">
            <label>Summary <span class="counter">{{ world.summary?.length || 0 }}/233</span></label>
            <p class="help-text">Optional one-line hook for the world card, used instead of the full description.</p>
            <ion-textarea [(ngModel)]="world.summary" class="mb-input" rows="3" maxlength="233"></ion-textarea>
          </div>

          <div class="form-group">
            <label>Description <span class="required">Required</span></label>
            <p class="help-text">World description, shown on the world card. This is what players read to decide whether to play.</p>
            <ion-textarea [(ngModel)]="world.description" class="mb-input" rows="6"></ion-textarea>
          </div>

          <div class="form-group">
            <label>Content Warning <span class="counter">{{ world.contentWarning?.length || 0 }}/200</span></label>
            <p class="help-text">Optional. Shown as a red callout above the Start button. Leave blank if none.</p>
            <ion-input [(ngModel)]="world.contentWarning" class="mb-input" maxlength="200"></ion-input>
          </div>

          <div class="form-group">
            <label>World Image</label>
            <p class="help-text">This image shows up in the world card.</p>
            <div class="image-upload-box mb-glass-card" (click)="triggerUpload('cover')">
              <img *ngIf="world.coverImage" [src]="world.coverImage" class="preview-img" />
              <div class="upload-placeholder" *ngIf="!world.coverImage">
                <ion-icon name="image-outline"></ion-icon>
                <div class="upload-actions">
                  <span><ion-icon name="cloud-upload-outline"></ion-icon> Upload</span>
                  <span><ion-icon name="sparkles-outline"></ion-icon> Generate</span>
                </div>
              </div>
            </div>
            <input type="file" #coverInput accept="image/png,image/jpeg" style="display:none" (change)="onFileSelected($event, 'cover')" />
          </div>

          <div class="form-group">
            <label>Background Image</label>
            <p class="help-text">Optional. Players will see this in the background when playing your world.</p>
            <div class="image-upload-box mb-glass-card" (click)="triggerUpload('bg')">
              <img *ngIf="world.backgroundImage" [src]="world.backgroundImage" class="preview-img" />
              <div class="upload-placeholder" *ngIf="!world.backgroundImage">
                <ion-icon name="image-outline"></ion-icon>
                <div class="upload-actions">
                  <span><ion-icon name="cloud-upload-outline"></ion-icon> Upload</span>
                  <span><ion-icon name="sparkles-outline"></ion-icon> Generate</span>
                </div>
              </div>
            </div>
            <input type="file" #bgInput accept="image/png,image/jpeg" style="display:none" (change)="onFileSelected($event, 'bg')" />
          </div>

          <div class="form-group">
            <label>Suggested Theme</label>
            <p class="help-text">Players will see this theme when they start a game.</p>
            <ion-input [(ngModel)]="world.suggestedTheme" class="mb-input" placeholder="e.g. #FF5555"></ion-input>
          </div>

          <div class="form-group toggle-group">
            <ion-toggle [(ngModel)]="world.isNsfw" color="danger"></ion-toggle>
            <div class="toggle-text">
              <label>NSFW (sexually explicit)</label>
              <p class="help-text">Players must opt-in to see NSFW worlds. They are hidden by default.</p>
            </div>
          </div>
        </div>

        <!-- Tags -->
        <div class="section-block">
          <h2 class="section-title"><ion-icon name="pricetags-outline"></ion-icon> Tags</h2>
          <p class="help-text">Genre and content tags help players discover your world in the browser.</p>
          
          <div class="tags-group">
            <div class="tag-category">GENRE</div>
            <div class="tags-list">
              <span class="preset-tag" (click)="toggleTag('Action')" [class.active]="hasTag('Action')">⚔️ Action</span>
              <span class="preset-tag" (click)="toggleTag('Adventure')" [class.active]="hasTag('Adventure')">🌍 Adventure</span>
              <span class="preset-tag" (click)="toggleTag('Comedy')" [class.active]="hasTag('Comedy')">😂 Comedy</span>
              <span class="preset-tag" (click)="toggleTag('Fantasy')" [class.active]="hasTag('Fantasy')">🔮 Fantasy</span>
              <span class="preset-tag" (click)="toggleTag('Sci-Fi')" [class.active]="hasTag('Sci-Fi')">🚀 Sci-Fi</span>
              <span class="preset-tag" (click)="toggleTag('Romance')" [class.active]="hasTag('Romance')">💖 Romance</span>
            </div>
          </div>
        </div>

        <!-- Author Notes -->
        <div class="section-block">
          <h2 class="section-title"><ion-icon name="pencil-outline"></ion-icon> Author Notes</h2>
          <p class="help-text">Personal notes for your reference, not used by the engine or shown to players.</p>
          <ion-textarea [(ngModel)]="world.authorNotes" class="mb-input" rows="4"></ion-textarea>
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
    .page-title {
      font-size: 24px;
      font-weight: 800;
      color: white;
      margin: 0 0 8px 0;
    }
    .page-subtitle {
      font-size: 13px;
      color: var(--mb-text-muted);
      margin: 0 0 32px 0;
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
    .form-group {
      margin-bottom: 24px;
    }
    .form-group:last-child {
      margin-bottom: 0;
    }
    label {
      display: flex;
      justify-content: space-between;
      font-weight: 600;
      color: var(--mb-text-primary);
      font-size: 14px;
      margin-bottom: 4px;
    }
    .required { color: #f472b6; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
    .counter { color: var(--mb-text-muted); font-size: 12px; font-weight: 400; }
    .help-text { font-size: 12px; color: var(--mb-text-muted); margin: 0 0 10px 0; line-height: 1.4; }
    
    .image-upload-box {
      width: 100%;
      height: 160px;
      border: 2px dashed rgba(255,255,255,0.1);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: all 0.2s;
    }
    .image-upload-box:hover {
      border-color: var(--mb-primary);
      background: rgba(167, 139, 250, 0.05);
    }
    .preview-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .upload-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: var(--mb-text-muted);
    }
    .upload-placeholder ion-icon { font-size: 32px; }
    .upload-actions {
      display: flex;
      gap: 16px;
      font-size: 13px;
      font-weight: 600;
    }
    .upload-actions span {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--mb-primary);
    }
    
    .toggle-group {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding-top: 12px;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .toggle-text label { margin-bottom: 4px; }
    .toggle-text p { margin: 0; }
    
    .tags-group { margin-bottom: 16px; }
    .tag-category {
      font-size: 11px;
      font-weight: 700;
      color: var(--mb-text-muted);
      margin-bottom: 8px;
      letter-spacing: 1px;
    }
    .tags-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .preset-tag {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 600;
      color: var(--mb-text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }
    .preset-tag:hover { background: rgba(255,255,255,0.1); }
    .preset-tag.active {
      background: rgba(59, 130, 246, 0.2);
      border-color: #3b82f6;
      color: #3b82f6;
    }
  `]
})
export class WorldBasicsComponent implements OnInit {
  worldId: string | null = null;
  world: Partial<Scenario> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private scenarioService: ScenarioService,
    private toastCtrl: ToastController
  ) {
    addIcons({ arrowBackOutline, cloudUploadOutline, sparklesOutline, imageOutline });
  }

  async ngOnInit() {
    this.worldId = this.route.snapshot.paramMap.get('id');
    if (this.worldId) {
      const loaded = await this.scenarioService.getScenario(this.worldId);
      if (loaded) this.world = loaded;
    }
  }

  goBack() {
    this.router.navigate(['/worlds', this.worldId, 'edit']);
  }

  async save() {
    if (this.worldId) {
      await this.scenarioService.updateScenario(this.worldId, this.world);
      const toast = await this.toastCtrl.create({ message: 'Saved basics.', duration: 2000, color: 'success' });
      await toast.present();
    }
  }

  triggerUpload(type: 'cover' | 'bg') {
    const input = document.querySelector(`input[#${type}Input]`) as HTMLInputElement | null;
    // Workaround since template ref # might not select like this easily in this quick implementation
    const inputs = document.querySelectorAll('input[type=file]');
    if (type === 'cover' && inputs[0]) (inputs[0] as HTMLInputElement).click();
    if (type === 'bg' && inputs[1]) (inputs[1] as HTMLInputElement).click();
  }

  onFileSelected(event: any, type: 'cover' | 'bg') {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (type === 'cover') this.world.coverImage = reader.result as string;
        if (type === 'bg') this.world.backgroundImage = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  toggleTag(tag: string) {
    if (!this.world.tags) this.world.tags = [];
    const index = this.world.tags.indexOf(tag);
    if (index === -1) {
      this.world.tags.push(tag);
    } else {
      this.world.tags.splice(index, 1);
    }
  }

  hasTag(tag: string): boolean {
    return this.world.tags?.includes(tag) || false;
  }
}
