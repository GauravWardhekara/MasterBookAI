import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonInput, IonTextarea, IonBackButton, IonButtons, IonChip,
  ToastController, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  saveOutline, addOutline, closeOutline, arrowBackOutline,
  peopleOutline, libraryOutline, personOutline, imageOutline,
  trashOutline, swapHorizontalOutline, createOutline, playOutline
} from 'ionicons/icons';
import { ScenarioService } from '../../../core/services/scenario.service';
import { CharacterService } from '../../../core/services/character.service';
import { LorebookService } from '../../../core/services/lorebook.service';
import { ChatSessionService } from '../../../core/services/chat-session.service';
import { Scenario, createDefaultScenario } from '../../../core/models/scenario.model';
import { Character } from '../../../core/models/character.model';
import { Lorebook } from '../../../core/models/lorebook.model';

@Component({
  selector: 'app-scenario-editor',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/scenarios"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ isEditing ? 'Edit Scenario' : 'New Scenario' }}</ion-title>
        <ion-button slot="end" fill="clear" (click)="save()">
          <ion-icon slot="icon-only" name="save-outline"></ion-icon>
        </ion-button>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="editor-form mb-fade-in">
        <!-- Cover Image -->
        <div class="cover-section" (click)="triggerCoverUpload()">
          <div *ngIf="scenario.coverImage" class="cover-preview">
            <img [src]="scenario.coverImage" alt="Cover" />
            <div class="cover-overlay">
              <ion-icon name="image-outline"></ion-icon>
              <span>Change Cover</span>
            </div>
          </div>
          <div *ngIf="!scenario.coverImage" class="cover-placeholder">
            <ion-icon name="image-outline"></ion-icon>
            <span>Upload Cover Image</span>
          </div>
          <input type="file" #coverInput accept="image/*" (change)="onCoverSelected($event)" style="display:none" />
        </div>

        <!-- Basic Info -->
        <div class="form-section">
          <div class="form-field">
            <label>Title</label>
            <ion-input [(ngModel)]="scenario.title" placeholder="Scenario title..." class="mb-input"></ion-input>
          </div>
          <div class="form-field">
            <label>Description</label>
            <ion-textarea [(ngModel)]="scenario.description" placeholder="Describe the scenario..." rows="3" class="mb-input"></ion-textarea>
          </div>
        </div>

        <!-- Characters Section -->
        <div class="form-section">
          <div class="mb-section-header">
            <span class="mb-section-title">
              <ion-icon name="people-outline"></ion-icon> Characters
            </span>
            <div class="header-actions">
              <ion-button fill="clear" size="small" (click)="showCharacterPicker()">
                <ion-icon slot="start" name="add-outline"></ion-icon>
                Add Existing
              </ion-button>
              <ion-button fill="clear" size="small" (click)="createNewCharacter()">
                <ion-icon slot="start" name="person-outline"></ion-icon>
                Create New
              </ion-button>
            </div>
          </div>

          <div *ngIf="selectedCharacters.length === 0" class="empty-inline">
            No characters added yet
          </div>

          <div class="character-chips">
            <div *ngFor="let char of selectedCharacters" class="char-chip mb-card">
              <div class="char-chip-avatar">
                <div *ngIf="char.avatar" class="mini-avatar">
                  <img [src]="char.avatar" alt="" />
                </div>
                <div *ngIf="!char.avatar" class="mini-avatar mb-avatar-placeholder">
                  {{ char.name.charAt(0) }}
                </div>
              </div>
              <div class="char-chip-info">
                <span class="char-chip-name">{{ char.name }}</span>
                <span class="char-chip-role mb-badge"
                      [class.mb-badge-premise]="scenario.characterRoles![char.id] === 'playable'"
                      [class.mb-badge-memory]="scenario.characterRoles![char.id] === 'npc'"
                      (click)="toggleRole(char.id)">
                  {{ scenario.characterRoles![char.id] | titlecase }}
                  <ion-icon name="swap-horizontal-outline" style="font-size: 10px; margin-left: 3px;"></ion-icon>
                </span>
              </div>
              <ion-button fill="clear" size="small" color="danger" (click)="removeCharacter(char.id)">
                <ion-icon slot="icon-only" name="close-outline"></ion-icon>
              </ion-button>
            </div>
          </div>
        </div>

        <!-- Lorebooks Section -->
        <div class="form-section">
          <div class="mb-section-header">
            <span class="mb-section-title">
              <ion-icon name="library-outline"></ion-icon> Lorebooks
            </span>
            <div class="header-actions">
              <ion-button fill="clear" size="small" (click)="showLorebookPicker()">
                <ion-icon slot="start" name="add-outline"></ion-icon>
                Select Existing
              </ion-button>
              <ion-button fill="clear" size="small" (click)="createNewLorebook()">
                <ion-icon slot="start" name="library-outline"></ion-icon>
                Create New
              </ion-button>
            </div>
          </div>

          <div *ngIf="selectedLorebooks.length === 0" class="empty-inline">
            No lorebooks linked yet
          </div>

          <div class="lorebook-chips">
            <div *ngFor="let lb of selectedLorebooks; let i = index" class="lb-chip mb-card">
              <span class="lb-chip-icon">📖</span>
              <div class="lb-chip-info">
                <span class="lb-chip-name">{{ lb.title }}</span>
                <span class="lb-chip-meta">{{ lb.entries?.length || 0 }} entries · Priority {{ i + 1 }}</span>
              </div>
              <ion-button fill="clear" size="small" (click)="editLorebook(lb)">
                <ion-icon slot="icon-only" name="create-outline"></ion-icon>
              </ion-button>
              <ion-button fill="clear" size="small" color="danger" (click)="removeLorebook(lb.id)">
                <ion-icon slot="icon-only" name="close-outline"></ion-icon>
              </ion-button>
            </div>
          </div>
        </div>

        <!-- Configuration -->
        <div class="form-section">
          <div class="mb-section-header">
            <span class="mb-section-title">Configuration</span>
          </div>

          <div class="config-grid">
            <div class="form-field">
              <label>Mode</label>
              <div class="toggle-group">
                <span class="mb-chip" [class.active]="scenario.defaultMode === 'chat'"
                      (click)="scenario.defaultMode = 'chat'">Chat</span>
                <span class="mb-chip" [class.active]="scenario.defaultMode === 'story'"
                      (click)="scenario.defaultMode = 'story'">Story</span>
              </div>
            </div>

            <div class="form-field">
              <label>POV</label>
              <div class="toggle-group">
                <span class="mb-chip" [class.active]="scenario.defaultPOV === '1st-person'"
                      (click)="scenario.defaultPOV = '1st-person'">1st Person</span>
                <span class="mb-chip" [class.active]="scenario.defaultPOV === '3rd-person'"
                      (click)="scenario.defaultPOV = '3rd-person'">3rd Person</span>
              </div>
            </div>

            <div class="form-field">
              <label>Tense</label>
              <div class="toggle-group">
                <span class="mb-chip" [class.active]="scenario.defaultTense === 'present'"
                      (click)="scenario.defaultTense = 'present'">Present</span>
                <span class="mb-chip" [class.active]="scenario.defaultTense === 'past'"
                      (click)="scenario.defaultTense = 'past'">Past</span>
              </div>
            </div>
          </div>

          <div class="form-field">
            <label>Special Instructions (System Prompt)</label>
            <ion-textarea [(ngModel)]="scenario.specialInstructions" placeholder="Instructions for the AI..." rows="4" class="mb-input"></ion-textarea>
          </div>
        </div>

        <!-- Tags -->
        <div class="form-section">
          <div class="mb-section-header">
            <span class="mb-section-title">Tags</span>
          </div>
          <div class="tags-input-row">
            <ion-input [(ngModel)]="newTag" placeholder="Add tag..." class="mb-input" (keyup.enter)="addTag()"></ion-input>
            <ion-button fill="clear" (click)="addTag()">
              <ion-icon slot="icon-only" name="add-outline"></ion-icon>
            </ion-button>
          </div>
          <div class="tags-list">
            <ion-chip *ngFor="let tag of scenario.tags" (click)="removeTag(tag)">
              {{ tag }} <ion-icon name="close-outline"></ion-icon>
            </ion-chip>
          </div>
        </div>

        <!-- Save -->
        <ion-button expand="block" class="mb-btn-primary save-btn" (click)="save()">
          <ion-icon slot="start" name="save-outline"></ion-icon>
          {{ isEditing ? 'Update Scenario' : 'Create Scenario' }}
        </ion-button>

        <!-- Start Chat (only for existing scenarios) -->
        <ion-button *ngIf="isEditing" expand="block" class="start-chat-btn" (click)="startChat()">
          <ion-icon slot="start" name="play-outline"></ion-icon>
          Start Chat
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .editor-form { max-width: 600px; margin: 0 auto; }

    .cover-section {
      border-radius: var(--mb-radius-lg); overflow: hidden;
      margin-bottom: 24px; cursor: pointer;
      border: 1px solid var(--mb-border);
      transition: border-color var(--mb-transition-normal);
    }

    .cover-section:hover { border-color: var(--mb-primary); }

    .cover-preview {
      position: relative; height: 160px;
    }

    .cover-preview img { width: 100%; height: 100%; object-fit: cover; }

    .cover-overlay {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.5); display: flex;
      flex-direction: column; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 200ms; color: white; gap: 4px;
    }

    .cover-preview:hover .cover-overlay { opacity: 1; }

    .cover-placeholder {
      height: 120px; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      background: var(--mb-bg-elevated); color: var(--mb-text-muted); gap: 8px;
    }

    .cover-placeholder ion-icon { font-size: 32px; }

    .form-section { margin-bottom: 24px; }
    .form-field { margin-bottom: 14px; }
    .form-field label {
      display: block; font-size: 13px; font-weight: 600;
      color: var(--mb-text-secondary); margin-bottom: 6px;
    }

    .header-actions { display: flex; gap: 0; }

    .empty-inline {
      padding: 16px; text-align: center; color: var(--mb-text-muted);
      font-size: 13px; font-style: italic;
    }

    .character-chips, .lorebook-chips {
      display: flex; flex-direction: column; gap: 8px;
    }

    .char-chip, .lb-chip {
      display: flex; align-items: center; gap: 10px; padding: 10px 12px;
    }

    .mini-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      overflow: hidden; border: 2px solid var(--mb-border); flex-shrink: 0;
    }

    .mini-avatar img { width: 100%; height: 100%; object-fit: cover; }

    .mb-avatar-placeholder {
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, var(--mb-primary-dark), var(--mb-primary));
      color: white; font-weight: 700; font-size: 14px;
    }

    .char-chip-info, .lb-chip-info { flex: 1; min-width: 0; }
    .char-chip-name, .lb-chip-name {
      font-weight: 600; font-size: 14px; color: var(--mb-text-primary); display: block;
    }

    .char-chip-role {
      cursor: pointer; margin-top: 3px; display: inline-flex; align-items: center;
    }

    .lb-chip-icon { font-size: 24px; flex-shrink: 0; }
    .lb-chip-meta { font-size: 12px; color: var(--mb-text-muted); }

    .config-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 14px; margin-bottom: 14px;
    }

    .toggle-group { display: flex; gap: 6px; }

    .tags-input-row { display: flex; gap: 8px; margin-bottom: 8px; }
    .tags-input-row ion-input { flex: 1; }
    .tags-list { display: flex; flex-wrap: wrap; gap: 6px; }

    .save-btn {
      margin-top: 24px;
      --padding-top: 14px; --padding-bottom: 14px;
    }

    .start-chat-btn {
      margin-top: 10px;
      --background: var(--mb-bg-elevated);
      --color: var(--mb-success);
      --border-radius: var(--mb-radius-md);
      border: 1px solid rgba(52, 211, 153, 0.3);
      font-weight: 600;
      --padding-top: 14px; --padding-bottom: 14px;
    }
  `],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonInput, IonTextarea, IonBackButton, IonButtons, IonChip
  ],
})
export class ScenarioEditorPage implements OnInit {
  scenario: Partial<Scenario> = createDefaultScenario();
  isEditing = false;
  newTag = '';

  allCharacters: Character[] = [];
  allLorebooks: Lorebook[] = [];
  selectedCharacters: Character[] = [];
  selectedLorebooks: Lorebook[] = [];

  private scenarioId?: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private scenarioService: ScenarioService,
    private characterService: CharacterService,
    private lorebookService: LorebookService,
    private chatSessionService: ChatSessionService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
  ) {
    addIcons({
      saveOutline, addOutline, closeOutline, arrowBackOutline,
      peopleOutline, libraryOutline, personOutline, imageOutline,
      trashOutline, swapHorizontalOutline, createOutline, playOutline
    });
  }

  async ngOnInit(): Promise<void> {
    this.allCharacters = await this.characterService.getAllCharacters();
    this.allLorebooks = await this.lorebookService.getAllLorebooks();

    this.scenarioId = this.route.snapshot.paramMap.get('id') || undefined;
    if (this.scenarioId) {
      this.isEditing = true;
      const sc = await this.scenarioService.getScenario(this.scenarioId);
      if (sc) {
        this.scenario = { ...sc };
        this.selectedCharacters = await this.characterService.getCharactersByIds(sc.characterIds);
        this.selectedLorebooks = await this.lorebookService.getLorebooksByIds(sc.lorebookIds);
      }
    }
  }

  triggerCoverUpload(): void {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    input?.click();
  }

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => { this.scenario.coverImage = reader.result as string; };
      reader.readAsDataURL(file);
    }
  }

  // ── Characters ──
  async showCharacterPicker(): Promise<void> {
    const available = this.allCharacters.filter(c => !this.scenario.characterIds?.includes(c.id));
    if (available.length === 0) {
      const toast = await this.toastCtrl.create({ message: 'No available characters. Create one first!', duration: 2000 });
      await toast.present();
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Select Characters',
      inputs: available.map(c => ({
        type: 'checkbox' as const,
        label: c.name,
        value: c.id,
      })),
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (selectedIds: string[]) => {
            for (const id of selectedIds) {
              if (!this.scenario.characterIds) this.scenario.characterIds = [];
              if (!this.scenario.characterRoles) this.scenario.characterRoles = {};
              this.scenario.characterIds.push(id);
              this.scenario.characterRoles[id] = 'npc';
              const char = this.allCharacters.find(c => c.id === id);
              if (char) this.selectedCharacters.push(char);
            }
          },
        },
      ],
    });
    await alert.present();
  }

  createNewCharacter(): void {
    this.router.navigateByUrl('/characters/new');
  }

  toggleRole(charId: string): void {
    if (!this.scenario.characterRoles) return;
    this.scenario.characterRoles[charId] =
      this.scenario.characterRoles[charId] === 'npc' ? 'playable' : 'npc';
  }

  removeCharacter(charId: string): void {
    this.scenario.characterIds = this.scenario.characterIds?.filter(id => id !== charId) || [];
    delete this.scenario.characterRoles?.[charId];
    this.selectedCharacters = this.selectedCharacters.filter(c => c.id !== charId);
  }

  // ── Lorebooks ──
  async showLorebookPicker(): Promise<void> {
    const available = this.allLorebooks.filter(lb => !this.scenario.lorebookIds?.includes(lb.id));
    if (available.length === 0) {
      const toast = await this.toastCtrl.create({ message: 'No available lorebooks. Create one first!', duration: 2000 });
      await toast.present();
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Select Lorebooks',
      inputs: available.map(lb => ({
        type: 'checkbox' as const,
        label: `${lb.title} (${lb.entries?.length || 0} entries)`,
        value: lb.id,
      })),
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Link',
          handler: (selectedIds: string[]) => {
            for (const id of selectedIds) {
              if (!this.scenario.lorebookIds) this.scenario.lorebookIds = [];
              this.scenario.lorebookIds.push(id);
              const lb = this.allLorebooks.find(l => l.id === id);
              if (lb) this.selectedLorebooks.push(lb);
            }
          },
        },
      ],
    });
    await alert.present();
  }

  createNewLorebook(): void {
    this.router.navigateByUrl('/lorebooks/new');
  }

  editLorebook(lb: Lorebook): void {
    this.router.navigateByUrl(`/lorebooks/${lb.id}/edit`);
  }

  removeLorebook(lorebookId: string): void {
    this.scenario.lorebookIds = this.scenario.lorebookIds?.filter(id => id !== lorebookId) || [];
    this.selectedLorebooks = this.selectedLorebooks.filter(lb => lb.id !== lorebookId);
  }

  // ── Tags ──
  addTag(): void {
    if (this.newTag.trim()) {
      if (!this.scenario.tags) this.scenario.tags = [];
      if (!this.scenario.tags.includes(this.newTag.trim())) {
        this.scenario.tags.push(this.newTag.trim());
      }
      this.newTag = '';
    }
  }

  removeTag(tag: string): void {
    this.scenario.tags = this.scenario.tags?.filter(t => t !== tag) || [];
  }

  // ── Save ──
  async save(): Promise<void> {
    if (!this.scenario.title?.trim()) {
      const toast = await this.toastCtrl.create({ message: 'Scenario title is required', duration: 2000, color: 'danger' });
      await toast.present();
      return;
    }

    if (this.isEditing && this.scenarioId) {
      await this.scenarioService.updateScenario(this.scenarioId, this.scenario);
    } else {
      await this.scenarioService.createScenario(this.scenario);
    }

    const toast = await this.toastCtrl.create({
      message: this.isEditing ? 'Scenario updated!' : 'Scenario created!',
      duration: 2000, color: 'success',
    });
    await toast.present();
    this.router.navigateByUrl('/scenarios');
  }

  async startChat(): Promise<void> {
    // Save scenario first if there are changes
    if (this.scenarioId) {
      await this.scenarioService.updateScenario(this.scenarioId, this.scenario);
    }

    // Create a new chat session from this scenario
    const session = await this.chatSessionService.createSession({
      scenarioId: this.scenarioId,
      activeCharacterIds: this.scenario.characterIds || [],
      mode: this.scenario.defaultMode || 'chat',
      title: this.scenario.title || 'New Chat',
    });

    const routePrefix = this.scenario.defaultMode === 'story' ? '/story/' : '/chat/';
    this.router.navigateByUrl(routePrefix + session.id);
  }
}
