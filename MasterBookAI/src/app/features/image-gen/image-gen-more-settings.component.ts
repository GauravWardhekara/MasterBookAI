import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonRange, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronDownOutline, diceOutline, happyOutline } from 'ionicons/icons';
import { ImageGenSessionConfig } from '../../core/models/image-gen-config.model';

@Component({
  selector: 'app-image-gen-more-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonRange
  ],
  template: `
    <ion-header class="ion-no-border ig-ms-header">
      <ion-toolbar class="transparent-toolbar">
        <ion-buttons slot="start">
          <ion-button (click)="cancel()" class="back-btn">
            <ion-icon slot="icon-only" name="chevron-back-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title class="ig-ms-title">More Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ig-ms-content ion-padding">
      <div class="ig-ms-container">
        
        <!-- Sampling Method -->
        <div class="setting-group mt-2">
          <div class="setting-label">Sampling Method</div>
          <div class="ig-select-wrapper">
            <select [(ngModel)]="samplingMethod" class="ig-select">
              <option value="DPM++ 2M Karras">DPM++ 2M Karras</option>
              <option value="Euler a">Euler a</option>
              <option value="DDIM">DDIM</option>
            </select>
            <ion-icon name="chevron-down-outline" class="select-icon"></ion-icon>
          </div>
        </div>

        <!-- Seed -->
        <div class="setting-group mt-4">
          <div class="setting-label">Seed</div>
          <div class="seed-input-wrapper">
            <input type="number" [(ngModel)]="seed" class="ig-input" placeholder="-1" />
            <button class="dice-btn" (click)="randomizeSeed()">
              <ion-icon name="dice-outline"></ion-icon>
            </button>
          </div>
        </div>

        <!-- Sampling Steps -->
        <div class="setting-group mt-4">
          <div class="setting-label flex-between">
            <span>Sampling Steps (1 - 100)</span>
            <span class="value-text">{{ config.steps }}</span>
          </div>
          <ion-range [min]="1" [max]="100" [step]="1" [(ngModel)]="config.steps" class="mb-slider"></ion-range>
        </div>

        <!-- Scale -->
        <div class="setting-group mt-4">
          <div class="setting-label flex-between">
            <span>Scale (1 - 30)</span>
            <span class="value-text">{{ config.cfgScale }}</span>
          </div>
          <ion-range [min]="1" [max]="30" [step]="0.5" [(ngModel)]="config.cfgScale" class="mb-slider"></ion-range>
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    .ig-ms-header { background: #1c1c1e; }
    .transparent-toolbar { --background: transparent; color: white; }
    .back-btn { --color: #a1a1aa; width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.05); margin-left: 8px; }
    .ig-ms-title { font-size: 17px; font-weight: 600; text-align: center; }

    .ig-ms-content { --background: #1c1c1e; }
    .ig-ms-container { max-width: 600px; margin: 0 auto; padding-bottom: 30px; color: white; }

    .mt-2 { margin-top: 8px; }
    .mt-4 { margin-top: 24px; }
    
    .setting-group { display: flex; flex-direction: column; }
    
    .setting-label { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }
    .align-center { align-items: center; }
    .no-mb { margin-bottom: 0; }
    
    .value-text { color: #a1a1aa; font-weight: 400; font-size: 15px; }

    /* Select */
    .ig-select-wrapper { position: relative; }
    .ig-select {
      width: 100%; appearance: none; background: #27272a; color: white;
      border: none; border-radius: 12px; padding: 14px 16px;
      font-size: 15px; outline: none; cursor: pointer;
    }
    .select-icon {
      position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
      color: #a1a1aa; pointer-events: none;
    }

    /* Input */
    .seed-input-wrapper { display: flex; gap: 8px; }
    .ig-input {
      flex: 1; background: #27272a; color: white; border: none;
      border-radius: 12px; padding: 14px 16px; font-size: 15px; outline: none;
    }
    .dice-btn {
      background: #27272a; border: none; border-radius: 12px; padding: 0 16px;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
    }
    .dice-btn ion-icon { font-size: 20px; color: #a1a1aa; }

    /* Slider */
    .mb-slider {
      --bar-background: #3f3f46;
      --bar-background-active: #eab308;
      --knob-background: white;
      --knob-size: 24px;
      --pin-background: transparent;
      margin: 0; padding: 0;
    }

    /* Toggle */
    .toggle-row { background: transparent; }
    .mb-toggle { --handle-background: white; --track-background-checked: white; }
  `]
})
export class ImageGenMoreSettingsComponent implements OnInit {
  @Input() config!: ImageGenSessionConfig;

  // Mock UI state for fields without backend yet
  samplingMethod = 'DPM++ 2M Karras';
  seed = -1;

  constructor(private modalCtrl: ModalController) {
    addIcons({ chevronBackOutline, chevronDownOutline, diceOutline, happyOutline });
  }

  ngOnInit() {
    if (!this.config) {
      this.config = { steps: 25, cfgScale: 4.5 } as any;
    }
  }

  randomizeSeed() {
    this.seed = -1;
  }

  cancel() {
    this.modalCtrl.dismiss({ config: this.config });
  }
}
