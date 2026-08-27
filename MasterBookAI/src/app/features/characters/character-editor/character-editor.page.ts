import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonInput, IonTextarea, IonToggle, IonItem, IonLabel,
  IonBackButton, IonButtons, IonChip, ToastController, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  saveOutline, closeOutline, addOutline, imageOutline, trashOutline,
  arrowBackOutline, settingsOutline, textOutline, chatbubbleEllipsesOutline,
  statsChartOutline
} from 'ionicons/icons';
import { CharacterService } from '../../../core/services/character.service';
import { Character, createDefaultCharacter, RpgData, DnDStats, CultivationStats } from '../../../core/models/character.model';
import { Input } from '@angular/core';

@Component({
  selector: 'app-character-editor',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          @if (!isModal) {
            <ion-back-button defaultHref="/characters"></ion-back-button>
          }
          @if (isModal) {
            <ion-button (click)="closeModal()">
              <ion-icon slot="icon-only" name="close-outline"></ion-icon>
            </ion-button>
          }
        </ion-buttons>
        <ion-title>{{ isEditing ? 'Edit Character' : 'New Character' }}</ion-title>
        <ion-button slot="end" fill="clear" (click)="save()">
          <ion-icon slot="icon-only" name="save-outline"></ion-icon>
        </ion-button>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      <div class="editor-form mb-fade-in">
        <!-- Avatar Upload -->
        <div class="avatar-section">
          <div class="avatar-preview" (click)="triggerAvatarUpload()">
            @if (character.avatar) {
              <img [src]="character.avatar" alt="Avatar" />
            }
            @if (!character.avatar) {
              <div class="avatar-placeholder">
                <ion-icon name="image-outline"></ion-icon>
                <span>Upload Avatar</span>
              </div>
            }
          </div>
          <input type="file" #avatarInput accept="image/*" (change)="onAvatarSelected($event)" style="display:none" />
        </div>
    
        <!-- Basic Info -->
        <div class="form-section">
          <div class="mb-section-header">
            <span class="mb-section-title">Basic Info</span>
          </div>
          <div class="form-field">
            <label>Name</label>
            <ion-input [(ngModel)]="character.name" placeholder="Character name" class="mb-input"></ion-input>
          </div>
          <div class="form-field">
            <label>Description</label>
            <ion-textarea [(ngModel)]="character.description" placeholder="Physical appearance, background..." rows="3" class="mb-input"></ion-textarea>
          </div>
          <div class="form-field">
            <label>Personality</label>
            <ion-textarea [(ngModel)]="character.personality" placeholder="Personality traits, demeanor..." rows="3" class="mb-input"></ion-textarea>
          </div>
          <div class="form-field">
            <label>Speech Style</label>
            <ion-textarea [(ngModel)]="character.speechStyle" placeholder="How the character talks..." rows="2" class="mb-input"></ion-textarea>
          </div>
        </div>
    
        <!-- Advanced AI Settings -->
        <div class="form-section">
          <div class="mb-section-header">
            <span class="mb-section-title">Advanced Prompts</span>
          </div>
          <div class="form-field">
            <label>System Prompt Override</label>
            <ion-textarea [(ngModel)]="character.systemPrompt" placeholder="Character-specific system prompt..." rows="3" class="mb-input"></ion-textarea>
          </div>
          <div class="form-field">
            <label>Post-History Instructions (Jailbreak)</label>
            <ion-textarea [(ngModel)]="character.postHistoryInstructions" placeholder="Injected right before the AI responds..." rows="3" class="mb-input"></ion-textarea>
          </div>
          <div class="form-field">
            <label>Talkativeness</label>
            <div class="slider-row">
               <input type="range" min="0" max="1" step="0.1" [(ngModel)]="character.talkativeness" style="flex:1">
               <span style="font-size:12px;width:30px">{{ character.talkativeness | number:'1.1-1' }}</span>
            </div>
          </div>
        </div>
    
        <!-- Settings -->
        <div class="form-field" style="margin-top:14px">
          <label>Creator Notes</label>
          <ion-textarea [(ngModel)]="character.creatorNotes" placeholder="Notes for other users..." rows="2" class="mb-input"></ion-textarea>
        </div>
      </div>

      <!-- ── RPG Mechanics ── -->
      <div class="form-section">
        <div class="mb-section-header">
          <span class="mb-section-title"><ion-icon name="stats-chart-outline" style="margin-right:4px"></ion-icon> RPG Compatibility</span>
        </div>
        <div class="form-field">
          <label>RPG System</label>
          <select [(ngModel)]="rpgSystem" (change)="onRpgSystemChange()" class="mb-select">
            <option value="None">None</option>
            <option value="D&D">Standard D&D</option>
            <option value="Cultivation">Cultivation (Xianxia)</option>
          </select>
        </div>

        @if (rpgSystem && rpgSystem !== 'None' && character.rpgData) {
          @if (rpgSystem === 'D&D' && character.rpgData.dndStats) {
            <div class="stats-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
              <div class="form-field">
                <label>Level</label>
                <ion-input type="number" [(ngModel)]="character.rpgData.dndStats.level" class="mb-input"></ion-input>
              </div>
              <div class="form-field">
                <label>HP</label>
                <ion-input type="number" [(ngModel)]="character.rpgData.dndStats.hp" class="mb-input"></ion-input>
              </div>
              <div class="form-field">
                <label>Mana</label>
                <ion-input type="number" [(ngModel)]="character.rpgData.dndStats.mana" class="mb-input"></ion-input>
              </div>
              <div class="form-field">
                <label>STR</label>
                <ion-input type="number" [(ngModel)]="character.rpgData.dndStats.str" class="mb-input"></ion-input>
              </div>
              <div class="form-field">
                <label>DEX</label>
                <ion-input type="number" [(ngModel)]="character.rpgData.dndStats.dex" class="mb-input"></ion-input>
              </div>
              <div class="form-field">
                <label>CON</label>
                <ion-input type="number" [(ngModel)]="character.rpgData.dndStats.con" class="mb-input"></ion-input>
              </div>
              <div class="form-field">
                <label>INT</label>
                <ion-input type="number" [(ngModel)]="character.rpgData.dndStats.int" class="mb-input"></ion-input>
              </div>
              <div class="form-field">
                <label>WIS</label>
                <ion-input type="number" [(ngModel)]="character.rpgData.dndStats.wis" class="mb-input"></ion-input>
              </div>
              <div class="form-field">
                <label>CHA</label>
                <ion-input type="number" [(ngModel)]="character.rpgData.dndStats.cha" class="mb-input"></ion-input>
              </div>
              <div class="form-field">
                <label>Gold</label>
                <ion-input type="number" [(ngModel)]="character.rpgData.dndStats.gold" class="mb-input"></ion-input>
              </div>
            </div>
          }

          @if (rpgSystem === 'Cultivation' && character.rpgData.cultivationStats) {
            <div class="stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div class="form-field" style="grid-column: span 2;">
                <label>Realm</label>
                <ion-input [(ngModel)]="character.rpgData.cultivationStats.realm" class="mb-input"></ion-input>
              </div>
              <div class="form-field">
                <label>Stage (1-9)</label>
                <ion-input type="number" [(ngModel)]="character.rpgData.cultivationStats.stage" class="mb-input"></ion-input>
              </div>
              <div class="form-field">
                <label>Qi</label>
                <ion-input type="number" [(ngModel)]="character.rpgData.cultivationStats.qi" class="mb-input"></ion-input>
              </div>
              <div class="form-field">
                <label>Body Strength</label>
                <ion-input type="number" [(ngModel)]="character.rpgData.cultivationStats.bodyStrength" class="mb-input"></ion-input>
              </div>
              <div class="form-field">
                <label>Soul Strength</label>
                <ion-input type="number" [(ngModel)]="character.rpgData.cultivationStats.soulStrength" class="mb-input"></ion-input>
              </div>
              <div class="form-field">
                <label>Dao Comprehension</label>
                <ion-input type="number" [(ngModel)]="character.rpgData.cultivationStats.daoComprehension" class="mb-input"></ion-input>
              </div>
              <div class="form-field">
                <label>Spirit Stones</label>
                <ion-input type="number" [(ngModel)]="character.rpgData.cultivationStats.spiritStones" class="mb-input"></ion-input>
              </div>
            </div>
          }
          
          @if (character.rpgData.needs) {
            <div class="mb-section-header" style="margin-top:20px;">
              <span class="mb-section-title">Needs</span>
            </div>
            <div class="stats-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
              <div class="form-field">
                <label>Hunger (0-100)</label>
                <ion-input type="number" [(ngModel)]="character.rpgData.needs.hunger" class="mb-input"></ion-input>
              </div>
              <div class="form-field">
                <label>Thirst (0-100)</label>
                <ion-input type="number" [(ngModel)]="character.rpgData.needs.thirst" class="mb-input"></ion-input>
              </div>
              <div class="form-field">
                <label>Rest (0-100)</label>
                <ion-input type="number" [(ngModel)]="character.rpgData.needs.rest" class="mb-input"></ion-input>
              </div>
            </div>
          }
        }
      </div>

      <!-- Greeting Messages -->
        <div class="form-section">
          <div class="mb-section-header">
            <span class="mb-section-title">Greeting Messages</span>
            <ion-button fill="clear" size="small" (click)="addGreeting()">
              <ion-icon slot="icon-only" name="add-outline"></ion-icon>
            </ion-button>
          </div>
          @for (g of character.greetingMessages; track $index; let i = $index) {
            <div class="greeting-row">
              <ion-textarea [(ngModel)]="character.greetingMessages![i]" placeholder="Greeting message..." rows="2" class="mb-input"></ion-textarea>
              @if (character.greetingMessages!.length > 1) {
                <ion-button fill="clear" size="small" color="danger"
                  (click)="removeGreeting(i)">
                  <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                </ion-button>
              }
            </div>
          }
        </div>
        
        <!-- Alternate Greetings (V2) -->
        <div class="form-section">
          <div class="mb-section-header">
            <span class="mb-section-title">Alternate Greetings</span>
            <ion-button fill="clear" size="small" (click)="addAlternateGreeting()">
              <ion-icon slot="icon-only" name="add-outline"></ion-icon>
            </ion-button>
          </div>
          @for (g of character.alternateGreetings; track $index; let i = $index) {
            <div class="greeting-row">
              <ion-textarea [(ngModel)]="character.alternateGreetings![i]" placeholder="Alternate greeting (swipeable)..." rows="2" class="mb-input"></ion-textarea>
              <ion-button fill="clear" size="small" color="danger"
                (click)="removeAlternateGreeting(i)">
                <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
              </ion-button>
            </div>
          }
        </div>
    
        <!-- Tags -->
        <div class="form-section">
          <div class="mb-section-header">
            <span class="mb-section-title">Tags</span>
          </div>
          <div class="tags-input-row">
            <ion-input [(ngModel)]="newTag" placeholder="Add a tag..." class="mb-input"
            (keyup.enter)="addTag()"></ion-input>
            <ion-button fill="clear" (click)="addTag()">
              <ion-icon slot="icon-only" name="add-outline"></ion-icon>
            </ion-button>
          </div>
          <div class="tags-list">
            @for (tag of character.tags; track tag) {
              <ion-chip (click)="removeTag(tag)">
                {{ tag }}
                <ion-icon name="close-outline"></ion-icon>
              </ion-chip>
            }
          </div>
        </div>
    
        <!-- Save Button -->
        <ion-button expand="block" class="mb-btn-primary save-btn" (click)="save()">
          <ion-icon slot="start" name="save-outline"></ion-icon>
          {{ isEditing ? 'Update Character' : 'Create Character' }}
        </ion-button>
    </ion-content>
    `,
  styles: [`
    .editor-form {
      max-width: 600px;
      margin: 0 auto;
    }

    .avatar-section {
      display: flex;
      justify-content: center;
      margin-bottom: 24px;
    }

    .avatar-preview {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      overflow: hidden;
      border: 3px solid var(--mb-border);
      cursor: pointer;
      transition: all var(--mb-transition-normal);
    }

    .avatar-preview:hover {
      border-color: var(--mb-primary);
      box-shadow: var(--mb-shadow-glow);
    }

    .avatar-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--mb-bg-elevated);
      color: var(--mb-text-muted);
      gap: 4px;
    }

    .avatar-placeholder ion-icon {
      font-size: 28px;
    }

    .avatar-placeholder span {
      font-size: 10px;
    }

    .form-section {
      margin-bottom: 24px;
    }

    .form-field {
      margin-bottom: 14px;
    }

    .form-field label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--mb-text-secondary);
      margin-bottom: 6px;
    }

    .toggle-item {
      --background: var(--mb-bg-card);
      border-radius: var(--mb-radius-md);
      border: 1px solid var(--mb-border);
    }

    .greeting-row {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .greeting-row ion-textarea {
      flex: 1;
    }

    .tags-input-row {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
    }

    .tags-input-row ion-input {
      flex: 1;
    }
    
    .slider-row {
      display: flex; align-items: center; gap: 12px; color: var(--mb-text-secondary);
    }

    .tags-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .save-btn {
      margin-top: 24px;
      --padding-top: 14px;
      --padding-bottom: 14px;
    }
  `],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonInput,
    IonTextarea,
    IonToggle,
    IonItem,
    IonLabel,
    IonBackButton,
    IonButtons,
    IonChip
],
})
export class CharacterEditorPage implements OnInit {
  character: Partial<Character> = createDefaultCharacter();
  isEditing = false;
  isModal = false;
  newTag = '';
  private characterId?: string;

  @Input() rpgSystem?: 'D&D' | 'Cultivation' | 'None';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private characterService: CharacterService,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController,
  ) {
    addIcons({ saveOutline, closeOutline, addOutline, imageOutline, trashOutline, arrowBackOutline, settingsOutline, textOutline, chatbubbleEllipsesOutline });
  }

  async ngOnInit(): Promise<void> {
    // Check if we're inside a modal
    const topModal = await this.modalCtrl.getTop();
    this.isModal = !!topModal;

    this.characterId = this.route.snapshot.paramMap.get('id') || undefined;
    if (this.characterId) {
      this.isEditing = true;
      const char = await this.characterService.getCharacter(this.characterId);
      if (char) {
        this.character = { ...char };
      }
    }

    // Initialize RPG Data if a system is selected and data doesn't exist
    this.onRpgSystemChange();
  }

  onRpgSystemChange(): void {
    if (this.rpgSystem && this.rpgSystem !== 'None') {
      if (!this.character.rpgData) {
        this.character.rpgData = { 
          inventory: [],
          needs: { hunger: 100, thirst: 100, rest: 100 },
          dispositions: {}
        };
      }
      if (!this.character.rpgData.needs) {
        this.character.rpgData.needs = { hunger: 100, thirst: 100, rest: 100 };
      }
      if (!this.character.rpgData.dispositions) {
        this.character.rpgData.dispositions = {};
      }
      if (this.rpgSystem === 'D&D' && !this.character.rpgData.dndStats) {
        this.character.rpgData.dndStats = { level: 1, hp: 10, maxHp: 10, mana: 0, maxMana: 0, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, gold: 0 };
      } else if (this.rpgSystem === 'Cultivation' && !this.character.rpgData.cultivationStats) {
        this.character.rpgData.cultivationStats = { realm: 'Mortal', stage: 1, qi: 10, maxQi: 10, bodyStrength: 5, soulStrength: 5, daoComprehension: 1, spiritStones: 0 };
      }
    }
  }

  closeModal(): void {
    if (this.isModal) {
      this.modalCtrl.dismiss();
    }
  }

  triggerAvatarUpload(): void {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    input?.click();
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.character.avatar = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  addGreeting(): void {
    if (!this.character.greetingMessages) this.character.greetingMessages = [];
    this.character.greetingMessages.push('');
  }

  removeGreeting(index: number): void {
    this.character.greetingMessages?.splice(index, 1);
  }

  addAlternateGreeting(): void {
    if (!this.character.alternateGreetings) this.character.alternateGreetings = [];
    this.character.alternateGreetings.push('');
  }

  removeAlternateGreeting(index: number): void {
    this.character.alternateGreetings?.splice(index, 1);
  }

  addTag(): void {
    if (this.newTag.trim()) {
      if (!this.character.tags) this.character.tags = [];
      if (!this.character.tags.includes(this.newTag.trim())) {
        this.character.tags.push(this.newTag.trim());
      }
      this.newTag = '';
    }
  }

  removeTag(tag: string): void {
    this.character.tags = this.character.tags?.filter(t => t !== tag) || [];
  }

  async save(): Promise<void> {
    if (!this.character.name?.trim()) {
      const toast = await this.toastCtrl.create({
        message: 'Character name is required',
        duration: 2000,
        color: 'danger',
      });
      await toast.present();
      return;
    }

    if (this.isEditing && this.characterId) {
      await this.characterService.updateCharacter(this.characterId, this.character);
    } else {
      await this.characterService.createCharacter(this.character);
    }

    const toast = await this.toastCtrl.create({
      message: this.isEditing ? 'Character updated!' : 'Character created!',
      duration: 2000,
      color: 'success',
    });
    await toast.present();
    
    if (this.isModal) {
      // In a modal context, dismiss and pass back the saved character
      const finalChar = await this.characterService.getCharacter(this.character.id!) || this.character;
      this.modalCtrl.dismiss(finalChar, 'save');
    } else {
      this.router.navigateByUrl('/characters');
    }
  }

  trackByIndex(index: number): number {
    return index;
  }
}
