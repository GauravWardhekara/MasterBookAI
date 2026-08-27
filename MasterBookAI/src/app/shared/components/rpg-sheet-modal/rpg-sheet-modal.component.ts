import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonButtons, IonList, IonItem, IonLabel, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { Character, Persona } from '../../../core/models/character.model';

@Component({
  selector: 'app-rpg-sheet-modal',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonButtons, IonList, IonItem, IonLabel
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>RPG Character Sheet</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      @if (rpgSystem === 'D&D') {
        @if (persona && persona.rpgData?.dndStats) {
          <div class="character-card mb-fade-in">
            <h2>{{ persona.name }} (You)</h2>
            <div class="stats-grid">
              <div class="stat-box"><span class="stat-label">Level</span><span class="stat-val">{{ persona.rpgData!.dndStats!.level }}</span></div>
              <div class="stat-box"><span class="stat-label">HP</span><span class="stat-val">{{ persona.rpgData!.dndStats!.hp }} / {{ persona.rpgData!.dndStats!.maxHp }}</span></div>
              <div class="stat-box"><span class="stat-label">Mana</span><span class="stat-val">{{ persona.rpgData!.dndStats!.mana }} / {{ persona.rpgData!.dndStats!.maxMana }}</span></div>
              <div class="stat-box"><span class="stat-label">STR</span><span class="stat-val">{{ persona.rpgData!.dndStats!.str }}</span></div>
              <div class="stat-box"><span class="stat-label">DEX</span><span class="stat-val">{{ persona.rpgData!.dndStats!.dex }}</span></div>
              <div class="stat-box"><span class="stat-label">CON</span><span class="stat-val">{{ persona.rpgData!.dndStats!.con }}</span></div>
              <div class="stat-box"><span class="stat-label">INT</span><span class="stat-val">{{ persona.rpgData!.dndStats!.int }}</span></div>
              <div class="stat-box"><span class="stat-label">WIS</span><span class="stat-val">{{ persona.rpgData!.dndStats!.wis }}</span></div>
              <div class="stat-box"><span class="stat-label">CHA</span><span class="stat-val">{{ persona.rpgData!.dndStats!.cha }}</span></div>
              <div class="stat-box"><span class="stat-label">Gold</span><span class="stat-val">{{ persona.rpgData!.dndStats!.gold }}</span></div>
            </div>
            @if (persona.rpgData?.needs) {
              <div class="needs-bar-container">
                <div class="need-item">
                  <span class="stat-label">Hunger</span>
                  <div class="progress-bg"><div class="progress-fill" [style.width.%]="persona.rpgData!.needs!.hunger"></div></div>
                </div>
                <div class="need-item">
                  <span class="stat-label">Thirst</span>
                  <div class="progress-bg"><div class="progress-fill" [style.width.%]="persona.rpgData!.needs!.thirst"></div></div>
                </div>
                <div class="need-item">
                  <span class="stat-label">Rest</span>
                  <div class="progress-bg"><div class="progress-fill" [style.width.%]="persona.rpgData!.needs!.rest"></div></div>
                </div>
              </div>
            }
          </div>
        }
        
        @for (char of characters; track char.id) {
          @if (char.rpgData?.dndStats) {
            <div class="character-card mb-fade-in">
              <h2>{{ char.name }}</h2>
              <div class="stats-grid">
                <div class="stat-box"><span class="stat-label">Level</span><span class="stat-val">{{ char.rpgData!.dndStats!.level }}</span></div>
                <div class="stat-box"><span class="stat-label">HP</span><span class="stat-val">{{ char.rpgData!.dndStats!.hp }} / {{ char.rpgData!.dndStats!.maxHp }}</span></div>
                <div class="stat-box"><span class="stat-label">STR</span><span class="stat-val">{{ char.rpgData!.dndStats!.str }}</span></div>
                <div class="stat-box"><span class="stat-label">DEX</span><span class="stat-val">{{ char.rpgData!.dndStats!.dex }}</span></div>
                <div class="stat-box"><span class="stat-label">INT</span><span class="stat-val">{{ char.rpgData!.dndStats!.int }}</span></div>
              </div>
            </div>
          }
        }
      }

      @if (rpgSystem === 'Cultivation') {
        @if (persona && persona.rpgData?.cultivationStats) {
          <div class="character-card mb-fade-in">
            <h2>{{ persona.name }} (You)</h2>
            <div class="stats-grid cultivation-grid">
              <div class="stat-box span-2"><span class="stat-label">Realm</span><span class="stat-val">{{ persona.rpgData!.cultivationStats!.realm }} (Stage {{ persona.rpgData!.cultivationStats!.stage }})</span></div>
              <div class="stat-box"><span class="stat-label">Qi</span><span class="stat-val">{{ persona.rpgData!.cultivationStats!.qi }} / {{ persona.rpgData!.cultivationStats!.maxQi }}</span></div>
              <div class="stat-box"><span class="stat-label">Body Str</span><span class="stat-val">{{ persona.rpgData!.cultivationStats!.bodyStrength }}</span></div>
              <div class="stat-box"><span class="stat-label">Soul Str</span><span class="stat-val">{{ persona.rpgData!.cultivationStats!.soulStrength }}</span></div>
              <div class="stat-box"><span class="stat-label">Dao</span><span class="stat-val">{{ persona.rpgData!.cultivationStats!.daoComprehension }}</span></div>
              <div class="stat-box span-2"><span class="stat-label">Spirit Stones</span><span class="stat-val">{{ persona.rpgData!.cultivationStats!.spiritStones }}</span></div>
            </div>
            @if (persona.rpgData?.needs) {
              <div class="needs-bar-container">
                <div class="need-item">
                  <span class="stat-label">Hunger</span>
                  <div class="progress-bg"><div class="progress-fill" [style.width.%]="persona.rpgData!.needs!.hunger"></div></div>
                </div>
                <div class="need-item">
                  <span class="stat-label">Thirst</span>
                  <div class="progress-bg"><div class="progress-fill" [style.width.%]="persona.rpgData!.needs!.thirst"></div></div>
                </div>
                <div class="need-item">
                  <span class="stat-label">Rest</span>
                  <div class="progress-bg"><div class="progress-fill" [style.width.%]="persona.rpgData!.needs!.rest"></div></div>
                </div>
              </div>
            }
          </div>
        }

        @for (char of characters; track char.id) {
          @if (char.rpgData?.cultivationStats) {
            <div class="character-card mb-fade-in">
              <h2>{{ char.name }}</h2>
              <div class="stats-grid cultivation-grid">
                <div class="stat-box span-2"><span class="stat-label">Realm</span><span class="stat-val">{{ char.rpgData!.cultivationStats!.realm }} (Stage {{ char.rpgData!.cultivationStats!.stage }})</span></div>
                <div class="stat-box"><span class="stat-label">Qi</span><span class="stat-val">{{ char.rpgData!.cultivationStats!.qi }}</span></div>
              </div>
            </div>
          }
        }
      }
    </ion-content>
  `,
  styles: [`
    .character-card {
      background: var(--mb-bg-secondary);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius-lg);
      padding: 16px;
      margin-bottom: 20px;
    }
    .character-card h2 {
      margin: 0 0 16px 0;
      font-size: 18px;
      color: var(--mb-primary-light);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .cultivation-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .stat-box {
      background: var(--mb-bg-elevated);
      border: 1px solid var(--mb-border-light);
      border-radius: var(--mb-radius-md);
      padding: 10px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .span-2 { grid-column: span 2; }
    .stat-label {
      font-size: 11px;
      color: var(--mb-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-val {
      font-size: 16px;
      font-weight: 700;
      color: var(--mb-text-primary);
    }
    .needs-bar-container {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid var(--mb-border-light);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .need-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .need-item .stat-label {
      width: 50px;
    }
    .progress-bg {
      flex: 1;
      height: 8px;
      background: var(--mb-bg-deep);
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--mb-primary);
      border-radius: 4px;
      transition: width 0.3s ease;
    }
  `]
})
export class RpgSheetModalComponent implements OnInit {
  @Input() rpgSystem!: 'D&D' | 'Cultivation';
  @Input() persona?: Persona;
  @Input() characters: Character[] = [];

  constructor(private modalCtrl: ModalController) {
    addIcons({ closeOutline });
  }

  ngOnInit() {}

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
