import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonBackButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonIcon, IonList, IonItem, IonLabel, IonBadge,
  IonTextarea, IonInput, IonToggle, IonSelect, IonSelectOption,
  ToastController, AlertController,
} from '@ionic/angular/standalone';
import { StorageService } from '../../core/services/storage.service';
import { Character } from '../../core/models/character.model';

@Component({
  selector: 'app-character-detail',
  templateUrl: './character-detail.page.html',
  styleUrls: ['./character-detail.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonButtons, IonBackButton,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonIcon, IonList, IonItem, IonLabel, IonBadge,
    IonTextarea, IonInput, IonToggle, IonSelect, IonSelectOption,
  ],
})
export class CharacterDetailPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private storage = inject(StorageService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  character = signal<Character | null>(null);
  isEditing = signal(false);
  editData = signal<Partial<Character>>({});

  async ionViewWillEnter() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/characters']);
      return;
    }
    const char = await this.storage.getCharacter(id);
    if (!char) {
      this.router.navigate(['/characters']);
      return;
    }
    this.character.set(char);
    this.editData.set({ ...char });
  }

  async saveChanges() {
    const current = this.character();
    const edits = this.editData();
    if (!current) return;

    const updated: Character = {
      ...current,
      ...edits,
      updatedAt: new Date(),
    } as Character;

    await this.storage.saveCharacter(updated);
    this.character.set(updated);
    this.isEditing.set(false);

    const toast = await this.toastCtrl.create({
      message: 'Character updated',
      duration: 1500,
      color: 'success',
    });
    await toast.present();
  }

  async deleteCharacter() {
    const char = this.character();
    if (!char) return;

    const alert = await this.alertCtrl.create({
      header: 'Delete Character?',
      message: `Delete "${char.name}"? This cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            await this.storage.deleteCharacter(char.id);
            this.router.navigate(['/characters']);
          },
        },
      ],
    });
    await alert.present();
  }

  async startChat() {
    const char = this.character();
    if (!char) return;
    this.router.navigate(['/chat']);
  }

  updateEdit(field: keyof Character, value: any) {
    this.editData.set({ ...this.editData(), [field]: value });
  }
}
