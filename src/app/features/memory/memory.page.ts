import { Component, inject, signal } from '@angular/core';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonMenuButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonIcon, IonList, IonItem, IonLabel,
} from '@ionic/angular/standalone';
import { StorageService } from '../../core/services/storage.service';
import { Memory } from '../../core/models/memory.model';

@Component({
  selector: 'app-memory',
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Memory</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true">
      <div style="max-width:900px;margin:0 auto;padding:16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
          <ion-icon name="brain-outline" color="primary"></ion-icon>
          <h2 style="margin:0;font-size:1.1rem;font-weight:600;">Long-term Memories</h2>
        </div>

        @if (memories().length === 0) {
          <div class="ion-text-center" style="padding:48px 16px;color:var(--ion-color-medium);">
            <ion-icon name="brain-outline" color="primary" style="font-size:64px;margin-bottom:16px;opacity:0.5;"></ion-icon>
            <h2>No Memories Yet</h2>
            <p>Important events from your chats will appear here. You can also pin messages as memories.</p>
          </div>
        } @else {
          <ion-list lines="full">
            @for (m of memories(); track m.id) {
              <ion-item>
                <ion-icon
                  [name]="m.source === 'auto' ? 'flash-outline' : 'bookmark-outline'"
                  slot="start"
                  [color]="m.source === 'auto' ? 'warning' : 'primary'"
                ></ion-icon>
                <ion-label>
                  <h3>{{ m.summary }}</h3>
                  <p>Importance: {{ (m.importanceScore * 100).toFixed(0) }}% · {{ m.source }}</p>
                </ion-label>
              </ion-item>
            }
          </ion-list>
        }
      </div>
    </ion-content>
  `,
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonButtons, IonMenuButton,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonIcon, IonList, IonItem, IonLabel,
  ],
})
export class MemoryPage {
  private storage = inject(StorageService);
  memories = signal<Memory[]>([]);

  async ionViewWillEnter() {
    this.memories.set(await this.storage.getMemories());
  }
}
