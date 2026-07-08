import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonMenuButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonIcon, IonList, IonItem, IonLabel, IonBadge,
  IonFab, IonFabButton,
  ToastController, AlertController,
} from '@ionic/angular/standalone';
import { StorageService } from '../../core/services/storage.service';
import { Scenario } from '../../core/models/scenario.model';

@Component({
  selector: 'app-scenarios',
  templateUrl: './scenarios.page.html',
  styleUrls: ['./scenarios.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonButtons, IonMenuButton,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonIcon, IonList, IonItem, IonLabel, IonBadge,
    IonFab, IonFabButton,
    RouterLink,
  ],
})
export class ScenariosPage {
  private storage = inject(StorageService);
  private router = inject(Router);

  scenarios = signal<Scenario[]>([]);

  async ionViewWillEnter() {
    this.scenarios.set(await this.storage.getScenarios());
  }

  openScenario(id: string) {
    this.router.navigate(['/scenarios', id]);
  }
}
