import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonBadge, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline, cloudDownloadOutline, heartOutline,
  downloadOutline, pricetagOutline, timeOutline
} from 'ionicons/icons';
import { HubModel, ModelFile, DeviceCapabilities } from '../../core/models/model-hub.model';
import { ModelHubService } from '../../core/services/model-hub.service';
import { DeviceCapabilityService } from '../../core/services/device-capability.service';
import { ModelDownloadComponent } from './model-download.component';

@Component({
  selector: 'app-model-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonBadge
  ],
  template: `
    <ion-header class="ion-no-border det-header">
      <ion-toolbar class="transparent-toolbar">
        <ion-buttons slot="start">
          <ion-button (click)="dismiss()">
            <ion-icon slot="icon-only" name="chevron-back-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title class="det-title">Model Details</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="det-content ion-padding">
      <div class="det-container">

        <!-- Header Card -->
        <div class="detail-hero">
          <div class="hero-name">{{ model?.name }}</div>
          <div class="hero-repo">{{ model?.id }}</div>

          <div class="hero-stats">
            <div class="stat" *ngIf="model?.downloads">
              <ion-icon name="download-outline"></ion-icon>
              <span>{{ formatNumber(model!.downloads!) }}</span>
            </div>
            <div class="stat" *ngIf="model?.likes">
              <ion-icon name="heart-outline"></ion-icon>
              <span>{{ model!.likes }}</span>
            </div>
            <div class="stat" *ngIf="model?.parameterCount">
              <ion-icon name="pricetag-outline"></ion-icon>
              <span>{{ model!.parameterCount }}</span>
            </div>
            <div class="stat" *ngIf="model?.lastUpdated">
              <ion-icon name="time-outline"></ion-icon>
              <span>{{ model!.lastUpdated | date:'mediumDate' }}</span>
            </div>
          </div>

          <div class="hero-desc" *ngIf="model?.description">{{ model?.description }}</div>

          <div class="hero-tags">
            <span class="tag" *ngFor="let t of model?.tags?.slice(0, 10)">{{ t }}</span>
          </div>
        </div>

        <!-- Compatibility -->
        <div class="compat-card" *ngIf="deviceCaps">
          <div class="compat-header">Device Compatibility</div>
          <div class="compat-row">
            <span>Your Device</span>
            <ion-badge [color]="getTierColor(deviceCaps.tier)">{{ deviceCaps.tier | uppercase }}</ion-badge>
          </div>
          <div class="compat-row">
            <span>RAM</span>
            <span class="compat-val">{{ deviceCaps.ramGB }} GB</span>
          </div>
          <div class="compat-row">
            <span>Min. Required Tier</span>
            <ion-badge [color]="getTierColor(model?.compatibilityTier || 'low')">{{ (model?.compatibilityTier || 'low') | uppercase }}</ion-badge>
          </div>
        </div>

        <!-- Action Button -->
        <ion-button expand="block" class="download-btn" (click)="openDownload()" color="warning">
          <ion-icon slot="start" name="cloud-download-outline"></ion-icon>
          Download / Pull Model
        </ion-button>

      </div>
    </ion-content>
  `,
  styles: [`
    .det-header { background: #1c1c1e; }
    .transparent-toolbar { --background: transparent; color: white; }
    .det-title { font-size: 17px; font-weight: 600; text-align: center; }

    .det-content { --background: #1c1c1e; }
    .det-container { max-width: 600px; margin: 0 auto; padding-bottom: 40px; }

    /* Hero */
    .detail-hero {
      background: #27272a; border-radius: 14px; padding: 24px; margin-bottom: 16px;
    }
    .hero-name { font-size: 22px; font-weight: 800; color: white; margin-bottom: 4px; }
    .hero-repo { font-size: 13px; color: #71717a; margin-bottom: 16px; }

    .hero-stats {
      display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 16px;
    }
    .stat {
      display: flex; align-items: center; gap: 4px; font-size: 13px; color: #a1a1aa;
    }
    .stat ion-icon { font-size: 16px; }

    .hero-desc {
      font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 16px;
      border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px;
    }

    .hero-tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .tag {
      font-size: 11px; color: #a1a1aa; padding: 3px 10px;
      background: rgba(255,255,255,0.06); border-radius: 6px;
    }

    /* Compat Card */
    .compat-card {
      background: #27272a; border-radius: 14px; padding: 16px; margin-bottom: 20px;
    }
    .compat-header { font-size: 14px; font-weight: 600; color: white; margin-bottom: 12px; }
    .compat-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06);
      font-size: 14px; color: #a1a1aa;
    }
    .compat-row:last-child { border-bottom: none; }
    .compat-val { color: white; font-weight: 500; }

    .download-btn {
      --border-radius: 12px; font-weight: 600; margin-top: 8px;
    }
  `]
})
export class ModelDetailComponent implements OnInit {
  @Input() model!: HubModel;

  deviceCaps?: DeviceCapabilities;

  constructor(
    private modalCtrl: ModalController,
    private deviceCapService: DeviceCapabilityService
  ) {
    addIcons({
      chevronBackOutline, cloudDownloadOutline, heartOutline,
      downloadOutline, pricetagOutline, timeOutline
    });
  }

  async ngOnInit() {
    this.deviceCaps = await this.deviceCapService.detect();
  }

  async openDownload() {
    const modal = await this.modalCtrl.create({
      component: ModelDownloadComponent,
      componentProps: { model: this.model }
    });
    await modal.present();
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  getTierColor(tier: string): string {
    switch (tier) {
      case 'ultra': return 'success';
      case 'high': return 'primary';
      case 'medium': return 'warning';
      case 'low': return 'danger';
      default: return 'medium';
    }
  }

  formatNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  }
}
