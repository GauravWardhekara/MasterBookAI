import { Component, inject, signal } from '@angular/core';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonMenuButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonIcon, IonList, IonItem, IonLabel, IonBadge,
} from '@ionic/angular/standalone';
import { StorageService } from '../../core/services/storage.service';
import { ImageGenConfig } from '../../core/models/image-gen-config.model';

@Component({
  selector: 'app-image-gen',
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Image Generation</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true">
      <div style="max-width:900px;margin:0 auto;padding:16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
          <ion-icon name="image-outline" color="primary"></ion-icon>
          <h2 style="margin:0;font-size:1.1rem;font-weight:600;">Image Generation Backends</h2>
        </div>

        @if (configs().length === 0) {
          <div class="ion-text-center" style="padding:48px 16px;color:var(--ion-color-medium);">
            <ion-icon name="image-outline" color="primary" style="font-size:64px;margin-bottom:16px;opacity:0.5;"></ion-icon>
            <h2>No Image Backends</h2>
            <p>Configure image generation providers like Stable Diffusion, DALL-E, or ComfyUI.</p>
          </div>
        } @else {
          <ion-list lines="full">
            @for (c of configs(); track c.id) {
              <ion-item>
                <ion-icon name="image-outline" slot="start" color="primary"></ion-icon>
                <ion-label>
                  <h3>{{ c.name }}</h3>
                  <p>{{ c.providerType }} · {{ c.modelOrCheckpoint }}</p>
                </ion-label>
                @if (c.isDefault) {
                  <ion-badge slot="end" color="primary">Default</ion-badge>
                }
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
    IonIcon, IonList, IonItem, IonLabel, IonBadge,
  ],
})
export class ImageGenPage {
  private storage = inject(StorageService);
  configs = signal<ImageGenConfig[]>([]);

  async ionViewWillEnter() {
    this.configs.set(await this.storage.getImageGenConfigs());
  }
}
