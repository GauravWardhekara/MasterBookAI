import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonMenuButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonIcon, IonList, IonItem, IonLabel, IonBadge,
  IonFab, IonFabButton, IonModal, IonToggle, IonInput, IonTextarea,
  IonGrid, IonRow, IonCol,
  ToastController, AlertController,
} from '@ionic/angular/standalone';
import { StorageService } from '../../core/services/storage.service';
import { Character } from '../../core/models/character.model';

@Component({
  selector: 'app-characters',
  templateUrl: './characters.page.html',
  styleUrls: ['./characters.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonButtons, IonMenuButton,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonIcon, IonList, IonItem, IonLabel, IonBadge,
    IonFab, IonFabButton, IonModal, IonToggle, IonInput, IonTextarea,
    IonGrid, IonRow, IonCol,
    RouterLink,
  ],
})
export class CharactersPage {
  private storage = inject(StorageService);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  characters = signal<Character[]>([]);
  showModal = signal(false);

  newCharacter = signal<Partial<Character>>({
    name: '',
    description: '',
    personality: '',
    greetingMessages: ['Hello!'],
    tags: [],
    isPlayable: false,
    isNpc: true,
  });

  async ionViewWillEnter() {
    await this.loadCharacters();
  }

  private async loadCharacters() {
    this.characters.set(await this.storage.getCharacters());
  }

  openCharacter(id: string) {
    this.router.navigate(['/characters', id]);
  }

  async createCharacter() {
    const char = this.newCharacter();
    if (!char.name?.trim()) {
      const toast = await this.toastCtrl.create({
        message: 'Character name is required',
        duration: 2000,
        color: 'warning',
      });
      await toast.present();
      return;
    }

    const character: Character = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: char.name.trim(),
      description: char.description || '',
      personality: char.personality || '',
      greetingMessages: char.greetingMessages || ['Hello!'],
      tags: char.tags || [],
      isPlayable: char.isPlayable ?? false,
      isNpc: char.isNpc ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.storage.saveCharacter(character);
    await this.loadCharacters();
    this.showModal.set(false);
    this.resetForm();

    const toast = await this.toastCtrl.create({
      message: `Character "${character.name}" created!`,
      duration: 2000,
      color: 'success',
    });
    await toast.present();
  }

  async deleteCharacter(id: string, name: string) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Character?',
      message: `Are you sure you want to delete "${name}"? This cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            await this.storage.deleteCharacter(id);
            await this.loadCharacters();
          },
        },
      ],
    });
    await alert.present();
  }

  private resetForm() {
    this.newCharacter.set({
      name: '',
      description: '',
      personality: '',
      greetingMessages: ['Hello!'],
      tags: [],
      isPlayable: false,
      isNpc: true,
    });
  }

  updateNewCharacter(updates: Partial<Character>): void {
    this.newCharacter.update(current => ({ ...current, ...updates }));
  }

  getString(value: any, defaultValue: string = ''): string {
    return typeof value === 'string' ? value : defaultValue;
  }

  // Wrapper to ensure proper type for updateNewCharacter
  onNameChange(value: string | number | null | undefined) {
    this.updateNewCharacter({ name: this.getString(value, '') });
  }
}
