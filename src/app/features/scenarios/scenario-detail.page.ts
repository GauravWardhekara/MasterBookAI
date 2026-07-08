import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonBackButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonIcon, IonList, IonItem, IonLabel,
  ToastController,
} from '@ionic/angular/standalone';
import { StorageService } from '../../core/services/storage.service';
import { Scenario } from '../../core/models/scenario.model';

@Component({
  selector: 'app-scenario-detail',
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/scenarios"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ scenario()?.title || 'Scenario' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true">
      @if (scenario(); as s) {
        <div style="max-width:800px;margin:0 auto;padding:16px;">
          <h1 style="font-size:1.75rem;font-weight:700;margin-bottom:8px;">{{ s.title }}</h1>
          <p style="color:var(--ion-color-medium);margin-bottom:24px;">{{ s.description }}</p>

          <ion-card>
            <ion-card-header>
              <ion-card-title>Settings</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p><strong>Mode:</strong> {{ s.defaultMode }}</p>
              <p><strong>POV:</strong> {{ s.defaultPov || 'Not set' }}</p>
              <p><strong>Tense:</strong> {{ s.defaultTense || 'Not set' }}</p>
            </ion-card-content>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>Special Instructions</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p style="white-space:pre-wrap;">{{ s.specialInstructions || 'None' }}</p>
            </ion-card-content>
          </ion-card>

          <div style="margin-top:24px;">
            <ion-button expand="block" color="primary" (click)="startChat()">
              <ion-icon name="chatbubble-outline" slot="start"></ion-icon>
              Start Chat in this Scenario
            </ion-button>
          </div>
        </div>
      }
    </ion-content>
  `,
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonButtons, IonBackButton,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonIcon, IonList, IonItem, IonLabel,
  ],
})
export class ScenarioDetailPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private storage = inject(StorageService);

  scenario = signal<Scenario | null>(null);

  async ionViewWillEnter() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const s = await this.storage.getScenario(id);
      this.scenario.set(s || null);
    }
  }

  startChat() {
    this.router.navigate(['/chat']);
  }
}
