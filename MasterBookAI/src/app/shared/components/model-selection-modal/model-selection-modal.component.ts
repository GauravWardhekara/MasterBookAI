import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonSearchbar, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, swapVerticalOutline, informationCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-model-selection-modal',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonSearchbar
  ],
  template: `
    <ion-header class="ion-no-border ms-header">
      <ion-toolbar class="transparent-toolbar">
        <ion-buttons slot="start">
          <ion-button (click)="cancel()">
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title class="ms-title">Models</ion-title>
        <ion-buttons slot="end">
          <ion-button>
            <ion-icon slot="icon-only" name="swap-vertical-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <div class="search-container">
        <ion-searchbar class="ms-searchbar" placeholder="Search models"></ion-searchbar>
      </div>
    </ion-header>

    <ion-content class="ms-content ion-padding">
      <div class="ms-container">
        
        <!-- Subscribe Banner -->
        <div class="subscribe-banner">
          <div class="banner-text">Unlock unlimited chats with<br>select models!</div>
          <div class="banner-btn">
            Subscribe
          </div>
        </div>

        <!-- Models List -->
        <div class="model-list">
          
          <div class="model-card" (click)="selectModel('Moedark')">
            <div class="card-header">
              <span class="model-name">Moedark</span>
              <ion-icon name="information-circle-outline"></ion-icon>
            </div>
            <div class="card-meta">
              Context: 16K
            </div>
            <div class="card-desc">Creative, unfiltered chat</div>
          </div>

          <div class="model-card" (click)="selectModel('Claude Opus 5')">
            <div class="card-header">
              <span class="model-name">Claude Opus 5</span>
              <ion-icon name="information-circle-outline"></ion-icon>
            </div>
            <div class="card-meta">
              Context: 16K
            </div>
            <div class="card-desc">Anthropic's most powerful model</div>
          </div>

          <div class="model-card" (click)="selectModel('Kimi K3')">
            <div class="card-header">
              <div class="name-badge-wrapper">
                <span class="model-name">Kimi K3</span>
                <span class="reasoning-badge"><ion-icon name="brain"></ion-icon> Reasoning</span>
              </div>
              <ion-icon name="information-circle-outline"></ion-icon>
            </div>
            <div class="card-meta">
              Context: 16K
            </div>
            <div class="card-desc">Smart, capable roleplay</div>
          </div>

        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    .ms-header { background: #1c1c1e; }
    .transparent-toolbar { --background: transparent; color: white; }
    .ms-title { font-size: 17px; font-weight: 600; text-align: center; }
    
    .search-container { padding: 0 16px 12px; background: #1c1c1e; }
    .ms-searchbar {
      --background: transparent; --color: white; --placeholder-color: #a1a1aa;
      --icon-color: #a1a1aa; --border-radius: 8px; padding-left: 0; padding-right: 0;
      --box-shadow: none;
    }

    .ms-content { --background: #1c1c1e; }
    .ms-container { max-width: 600px; margin: 0 auto; padding-bottom: 30px; }

    /* Subscribe Banner */
    .subscribe-banner {
      background: linear-gradient(135deg, #a855f7, #8b5cf6);
      border-radius: 12px; padding: 14px 16px; display: flex;
      justify-content: space-between; align-items: center; margin-bottom: 20px;
    }
    .banner-text { color: white; font-size: 14px; font-weight: 500; line-height: 1.4; }
    .banner-btn {
      background: #27272a; color: white; font-size: 13px; font-weight: 600;
      padding: 8px 12px; border-radius: 20px; display: flex; align-items: center; gap: 6px;
    }

    /* Model Cards */
    .model-list { display: flex; flex-direction: column; gap: 12px; }
    
    .model-card {
      background: #27272a; border-radius: 12px; padding: 16px; cursor: pointer;
    }
    .card-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
    }
    .name-badge-wrapper { display: flex; align-items: center; gap: 8px; }
    .model-name { font-size: 15px; font-weight: 700; color: white; }
    .card-header ion-icon { color: #a1a1aa; font-size: 20px; }
    
    .reasoning-badge {
      background: #3b82f6; color: white; font-size: 11px; font-weight: 600;
      padding: 2px 8px; border-radius: 12px; display: flex; align-items: center; gap: 4px;
    }

    .card-meta { font-size: 13px; color: #a1a1aa; display: flex; align-items: center; }
    .mt-1 { margin-top: 4px; }
    
    .card-desc { font-size: 13px; color: #71717a; margin-top: 8px; }
  `]
})
export class ModelSelectionModalComponent implements OnInit {
  @Input() currentModel: string = '';

  constructor(private modalCtrl: ModalController) {
    addIcons({ closeOutline, swapVerticalOutline, informationCircleOutline });
  }

  ngOnInit() {}

  selectModel(model: string) {
    this.modalCtrl.dismiss({ model });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
