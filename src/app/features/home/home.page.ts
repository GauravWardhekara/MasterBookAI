import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonMenuButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonIcon, IonList, IonItem, IonLabel, IonBadge,
  IonGrid, IonRow, IonCol, IonFab, IonFabButton,
} from '@ionic/angular/standalone';
import { StorageService } from '../../core/services/storage.service';
import { ChatSession } from '../../core/models/chat-session.model';
import { Character } from '../../core/models/character.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonButtons, IonMenuButton,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonIcon, IonList, IonItem, IonLabel, IonBadge,
    IonGrid, IonRow, IonCol, IonFab, IonFabButton,
    RouterLink,
  ],
})
export class HomePage {
  private storage = inject(StorageService);
  private router = inject(Router);

  recentChats = signal<ChatSession[]>([]);
  favoriteCharacters = signal<Character[]>([]);
  totalChats = signal(0);
  totalCharacters = signal(0);

  async ionViewWillEnter() {
    await this.loadData();
  }

  private async loadData() {
    const chats = await this.storage.getChatSessions();
    this.recentChats.set(chats.slice(0, 5));
    this.totalChats.set(chats.length);

    const characters = await this.storage.getCharacters();
    this.favoriteCharacters.set(characters.slice(0, 4));
    this.totalCharacters.set(characters.length);
  }

  async startNewChat() {
    this.router.navigate(['/chat']);
  }

  openChat(sessionId: string) {
    this.router.navigate(['/chat', sessionId]);
  }

  openCharacter(characterId: string) {
    this.router.navigate(['/characters', characterId]);
  }
}
