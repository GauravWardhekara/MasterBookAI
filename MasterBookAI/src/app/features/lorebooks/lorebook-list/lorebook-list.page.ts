import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonSearchbar, IonFab, IonFabButton, IonChip, IonBadge,
  AlertController, ActionSheetController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline, createOutline, trashOutline, copyOutline, downloadOutline,
  libraryOutline, searchOutline, ellipsisVerticalOutline, cloudUploadOutline
} from 'ionicons/icons';
import { LorebookService } from '../../../core/services/lorebook.service';
import { Lorebook } from '../../../core/models/lorebook.model';

@Component({
  selector: 'app-lorebook-list',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>📚 Lorebooks</ion-title>
        <ion-button slot="end" fill="clear" (click)="importLorebook()">
          <ion-icon slot="icon-only" name="cloud-upload-outline"></ion-icon>
        </ion-button>
        <ion-button slot="end" fill="clear" (click)="navigateTo('/lorebooks/new')">
          <ion-icon slot="icon-only" name="add-outline"></ion-icon>
        </ion-button>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          [(ngModel)]="searchQuery"
          (ionInput)="onSearch()"
          placeholder="Search lorebooks..."
          class="mb-input"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div *ngIf="lorebooks.length === 0" class="mb-empty-state">
        <ion-icon name="library-outline"></ion-icon>
        <h3>No Lorebooks Yet</h3>
        <p>Create lorebooks to add world-building lore, factions, locations, and more to your scenarios</p>
        <ion-button class="mb-btn-primary" (click)="navigateTo('/lorebooks/new')">
          <ion-icon slot="start" name="add-outline"></ion-icon>
          Create Lorebook
        </ion-button>
      </div>

      <div class="lorebook-list" *ngIf="lorebooks.length > 0">
        <div *ngFor="let lb of lorebooks; let i = index"
             class="lorebook-card mb-glass-card mb-fade-in"
             [style.animation-delay]="(i * 0.05) + 's'">
          <div class="lb-header" (click)="navigateTo('/lorebooks/' + lb.id + '/edit')">
            <div class="lb-icon">📖</div>
            <div class="lb-info">
              <div class="lb-title">{{ lb.title }}</div>
              <div class="lb-meta">
                <span>{{ lb.entries?.length || 0 }} entries</span>
                <span class="dot">·</span>
                <span>Updated {{ getRelativeTime(lb.updatedAt) }}</span>
              </div>
              <div class="lb-description" *ngIf="lb.description">{{ lb.description | slice:0:80 }}{{ lb.description.length > 80 ? '...' : '' }}</div>
            </div>
          </div>
          <div class="lb-tags" *ngIf="lb.tags.length > 0">
            <ion-chip *ngFor="let tag of lb.tags | slice:0:3" class="mb-chip">{{ tag }}</ion-chip>
          </div>
          <div class="lb-actions">
            <ion-button fill="clear" size="small" (click)="navigateTo('/lorebooks/' + lb.id + '/edit')">
              <ion-icon slot="icon-only" name="create-outline"></ion-icon>
            </ion-button>
            <ion-button fill="clear" size="small" (click)="duplicate(lb)">
              <ion-icon slot="icon-only" name="copy-outline"></ion-icon>
            </ion-button>
            <ion-button fill="clear" size="small" (click)="exportLorebook(lb)">
              <ion-icon slot="icon-only" name="download-outline"></ion-icon>
            </ion-button>
            <ion-button fill="clear" size="small" color="danger" (click)="confirmDelete(lb)">
              <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
            </ion-button>
          </div>
        </div>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="navigateTo('/lorebooks/new')">
          <ion-icon name="add-outline"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <!-- Hidden file input for import -->
      <input type="file" #importInput accept=".json" (change)="onImportFileSelected($event)" style="display:none" />
    </ion-content>
  `,
  styles: [`
    .lorebook-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .lorebook-card {
      padding: 16px;
    }

    .lb-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      cursor: pointer;
      margin-bottom: 10px;
    }

    .lb-icon {
      font-size: 32px;
      flex-shrink: 0;
    }

    .lb-info {
      flex: 1;
      min-width: 0;
    }

    .lb-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--mb-text-primary);
      margin-bottom: 4px;
    }

    .lb-meta {
      font-size: 12px;
      color: var(--mb-text-muted);
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }

    .dot {
      color: var(--mb-text-muted);
    }

    .lb-description {
      font-size: 13px;
      color: var(--mb-text-secondary);
      line-height: 1.4;
    }

    .lb-tags {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 8px;
      padding-left: 46px;
    }

    .lb-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0;
      border-top: 1px solid var(--mb-border);
      padding-top: 8px;
      margin-top: 4px;
    }

    .lb-actions ion-button {
      --padding-start: 10px;
      --padding-end: 10px;
    }
  `],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonSearchbar, IonFab, IonFabButton, IonChip, IonBadge
  ],
})
export class LorebookListPage implements OnInit {
  lorebooks: Lorebook[] = [];
  searchQuery = '';

  constructor(
    private router: Router,
    private lorebookService: LorebookService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      addOutline, createOutline, trashOutline, copyOutline, downloadOutline,
      libraryOutline, searchOutline, ellipsisVerticalOutline, cloudUploadOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadLorebooks();
  }

  async loadLorebooks(): Promise<void> {
    this.lorebooks = await this.lorebookService.getAllLorebooks();
    // Populate entry counts
    for (const lb of this.lorebooks) {
      const entries = await this.lorebookService.getEntriesForLorebook(lb.id);
      lb.entries = entries;
    }
  }

  async onSearch(): Promise<void> {
    if (this.searchQuery.trim()) {
      this.lorebooks = await this.lorebookService.searchLorebooks(this.searchQuery);
    } else {
      await this.loadLorebooks();
    }
  }

  async duplicate(lb: Lorebook): Promise<void> {
    await this.lorebookService.duplicateLorebook(lb.id);
    await this.loadLorebooks();
    const toast = await this.toastCtrl.create({ message: 'Lorebook duplicated!', duration: 2000, color: 'success' });
    await toast.present();
  }

  async exportLorebook(lb: Lorebook): Promise<void> {
    const json = await this.lorebookService.exportLorebook(lb.id);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lb.title.replace(/\s+/g, '_')}_lorebook.json`;
    a.click();
    URL.revokeObjectURL(url);
    const toast = await this.toastCtrl.create({ message: 'Lorebook exported!', duration: 2000, color: 'success' });
    await toast.present();
  }

  importLorebook(): void {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    input?.click();
  }

  async onImportFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await this.lorebookService.importLorebook(text);
      await this.loadLorebooks();
      const toast = await this.toastCtrl.create({ message: 'Lorebook imported!', duration: 2000, color: 'success' });
      await toast.present();
    } catch (e) {
      const toast = await this.toastCtrl.create({ message: 'Failed to import lorebook', duration: 3000, color: 'danger' });
      await toast.present();
    }
    input.value = '';
  }

  async confirmDelete(lb: Lorebook): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Delete Lorebook',
      message: `Delete "${lb.title}" and all its entries?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            await this.lorebookService.deleteLorebook(lb.id);
            await this.loadLorebooks();
          },
        },
      ],
    });
    await alert.present();
  }

  getRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  }

  navigateTo(path: string): void {
    this.router.navigateByUrl(path);
  }
}
