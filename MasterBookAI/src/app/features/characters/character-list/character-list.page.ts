import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonIcon,
  IonSearchbar, IonFab, IonFabButton,
  AlertController, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline, createOutline, trashOutline, personOutline, searchOutline, cloudDownloadOutline
} from 'ionicons/icons';
import { CharacterService } from '../../../core/services/character.service';
import { Character } from '../../../core/models/character.model';
import { CharacterImportModalComponent } from '../../../shared/components/character-import-modal/character-import-modal.component';

@Component({
  selector: 'app-character-list',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Characters</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" (click)="openImportModal()" title="Import Character Card">
            <ion-icon slot="icon-only" name="cloud-download-outline"></ion-icon>
          </ion-button>
          <ion-button fill="clear" (click)="navigateTo('/characters/new')">
            <ion-icon slot="icon-only" name="add-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          [(ngModel)]="searchQuery"
          (ionInput)="onSearch()"
          placeholder="Search characters..."
          class="mb-input"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div *ngIf="characters.length === 0" class="mb-empty-state">
        <ion-icon name="person-outline"></ion-icon>
        <h3>No Characters Yet</h3>
        <p>Create your first character to use in scenarios and chats</p>
        <ion-button class="mb-btn-primary" (click)="navigateTo('/characters/new')">
          <ion-icon slot="start" name="add-outline"></ion-icon>
          Create Character
        </ion-button>
      </div>

      <div class="character-grid" *ngIf="characters.length > 0">
        <div *ngFor="let char of characters; let i = index"
             class="character-card mb-card mb-fade-in"
             [style.animation-delay]="(i * 0.05) + 's'"
             (click)="navigateTo('/characters/' + char.id + '/edit')">
          <div class="char-avatar-wrap">
            <div *ngIf="char.avatar" class="char-avatar">
              <img [src]="char.avatar" [alt]="char.name" />
            </div>
            <div *ngIf="!char.avatar" class="char-avatar mb-avatar-placeholder">
              {{ char.name.charAt(0).toUpperCase() }}
            </div>
          </div>
          <div class="char-info">
            <div class="char-name">{{ char.name }}</div>
            <div class="char-desc">{{ char.description | slice:0:60 }}{{ char.description.length > 60 ? '...' : '' }}</div>
            <div class="char-tags">
              <span *ngIf="char.isPlayable" class="mb-badge mb-badge-premise">Playable</span>
              <span *ngFor="let tag of char.tags | slice:0:2" class="mb-chip">{{ tag }}</span>
            </div>
          </div>
          <div class="char-actions">
            <ion-button fill="clear" size="small" (click)="editCharacter(char, $event)">
              <ion-icon slot="icon-only" name="create-outline"></ion-icon>
            </ion-button>
            <ion-button fill="clear" size="small" color="danger" (click)="confirmDelete(char, $event)">
              <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
            </ion-button>
          </div>
        </div>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="navigateTo('/characters/new')">
          <ion-icon name="add-outline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [`
    .character-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .character-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px;
      cursor: pointer;
    }

    .char-avatar-wrap {
      flex-shrink: 0;
    }

    .char-avatar {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid var(--mb-border);
    }

    .char-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .mb-avatar-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--mb-primary-dark), var(--mb-primary));
      color: white;
      font-weight: 700;
      font-size: 20px;
    }

    .char-info {
      flex: 1;
      min-width: 0;
    }

    .char-name {
      font-weight: 700;
      font-size: 16px;
      color: var(--mb-text-primary);
      margin-bottom: 3px;
    }

    .char-desc {
      font-size: 13px;
      color: var(--mb-text-muted);
      margin-bottom: 6px;
      line-height: 1.3;
    }

    .char-tags {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .char-actions {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .char-actions ion-button {
      --padding-start: 6px;
      --padding-end: 6px;
    }
  `],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonSearchbar, IonFab, IonFabButton, IonButtons
  ],
})
export class CharacterListPage implements OnInit {
  characters: Character[] = [];
  searchQuery = '';

  constructor(
    private router: Router,
    private characterService: CharacterService,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
  ) {
    addIcons({ addOutline, createOutline, trashOutline, personOutline, searchOutline, cloudDownloadOutline });
  }

  async ngOnInit(): Promise<void> {
    await this.loadCharacters();
  }

  async loadCharacters(): Promise<void> {
    this.characters = await this.characterService.getAllCharacters();
  }

  async onSearch(): Promise<void> {
    if (this.searchQuery.trim()) {
      this.characters = await this.characterService.searchCharacters(this.searchQuery);
    } else {
      await this.loadCharacters();
    }
  }

  async openImportModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: CharacterImportModalComponent,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data?.imported) {
      await this.loadCharacters();
    }
  }

  editCharacter(char: Character, event: Event): void {
    event.stopPropagation();
    this.navigateTo(`/characters/${char.id}/edit`);
  }

  async confirmDelete(char: Character, event: Event): Promise<void> {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Delete Character',
      message: `Are you sure you want to delete "${char.name}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            await this.characterService.deleteCharacter(char.id);
            await this.loadCharacters();
          },
        },
      ],
    });
    await alert.present();
  }

  navigateTo(path: string): void {
    this.router.navigateByUrl(path);
  }
}
