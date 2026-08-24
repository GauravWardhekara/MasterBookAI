import { Component, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonInput, IonTextarea, IonToggle, IonItem, IonLabel,
  IonBackButton, IonButtons, IonChip, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  saveOutline, closeOutline, addOutline, imageOutline, trashOutline,
  arrowBackOutline
} from 'ionicons/icons';
import { CharacterService } from '../../../core/services/character.service';
import { Character, createDefaultCharacter } from '../../../core/models/character.model';

@Component({
  selector: 'app-character-editor',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/characters"></ion-back-button>
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
    
        <!-- Settings -->
        <div class="form-section">
          <div class="mb-section-header">
            <span class="mb-section-title">Settings</span>
          </div>
          <ion-item lines="none" class="toggle-item">
            <ion-label>Playable Character</ion-label>
            <ion-toggle [(ngModel)]="character.isPlayable" slot="end"></ion-toggle>
          </ion-item>
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
      </div>
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
  newTag = '';
  private characterId?: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private characterService: CharacterService,
    private toastCtrl: ToastController,
  ) {
    addIcons({ saveOutline, closeOutline, addOutline, imageOutline, trashOutline, arrowBackOutline });
  }

  async ngOnInit(): Promise<void> {
    this.characterId = this.route.snapshot.paramMap.get('id') || undefined;
    if (this.characterId) {
      this.isEditing = true;
      const char = await this.characterService.getCharacter(this.characterId);
      if (char) {
        this.character = { ...char };
      }
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
    this.router.navigateByUrl('/characters');
  }

  trackByIndex(index: number): number {
    return index;
  }
}
