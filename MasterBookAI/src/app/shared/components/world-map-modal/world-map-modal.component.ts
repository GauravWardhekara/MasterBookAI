import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonButtons, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, locationOutline, mapOutline } from 'ionicons/icons';
import { Lorebook, LoreEntry, LoreType } from '../../../core/models/lorebook.model';

@Component({
  selector: 'app-world-map-modal',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonButtons
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>World Map & Locations</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding map-bg">
      <div class="map-container">
        @if (locations.length === 0) {
          <div class="empty-state">
            <ion-icon name="map-outline"></ion-icon>
            <p>No locations discovered yet.</p>
            <span>Add entries with type "Location" to your Lorebook to see them here.</span>
          </div>
        }
        
        <div class="nodes-grid">
          @for (loc of locations; track loc.id) {
            <div class="map-node mb-fade-in">
              <div class="node-header">
                <ion-icon name="location-outline"></ion-icon>
                <h3>{{ loc.title }}</h3>
              </div>
              <p class="node-desc">{{ loc.loreDescription }}</p>
              <div class="node-tags">
                @for (tag of loc.triggerWords; track tag) {
                  <span class="mb-chip">{{ tag }}</span>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .map-bg {
      --background: var(--mb-bg-primary);
    }
    .map-container {
      padding: 16px;
      max-width: 800px;
      margin: 0 auto;
    }
    .nodes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }
    .map-node {
      background: var(--mb-bg-secondary);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius-lg);
      padding: 20px;
      position: relative;
      overflow: hidden;
      transition: all var(--mb-transition-fast);
    }
    .map-node:hover {
      border-color: var(--mb-primary);
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      transform: translateY(-2px);
    }
    .map-node::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, var(--mb-primary), var(--mb-secondary));
    }
    .node-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      color: var(--mb-primary-light);
    }
    .node-header ion-icon {
      font-size: 24px;
      color: var(--mb-secondary);
    }
    .node-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
    }
    .node-desc {
      font-size: 14px;
      color: var(--mb-text-secondary);
      line-height: 1.5;
      margin: 0 0 16px 0;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .node-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--mb-text-muted);
    }
    .empty-state ion-icon {
      font-size: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    .empty-state p {
      font-size: 18px;
      font-weight: 600;
      color: var(--mb-text-secondary);
      margin: 0 0 8px 0;
    }
    .empty-state span {
      font-size: 14px;
    }
  `]
})
export class WorldMapModalComponent implements OnInit {
  @Input() lorebooks: Lorebook[] = [];
  
  locations: LoreEntry[] = [];

  constructor(private modalCtrl: ModalController) {
    addIcons({ closeOutline, locationOutline, mapOutline });
  }

  ngOnInit() {
    this.extractLocations();
  }

  private extractLocations() {
    const locs: LoreEntry[] = [];
    for (const lb of this.lorebooks) {
      if (lb.entries) {
        for (const entry of lb.entries) {
          if (entry.loreType === LoreType.LOCATION) {
            locs.push(entry);
          }
        }
      }
    }
    this.locations = locs;
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
