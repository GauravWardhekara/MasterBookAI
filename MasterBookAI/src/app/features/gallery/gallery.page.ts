import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonSearchbar, IonSegment, IonSegmentButton, IonLabel, AlertController, ToastController, ActionSheetController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  gridOutline, listOutline, heartOutline, heart, downloadOutline,
  cloudUploadOutline, trashOutline, copyOutline, playOutline,
  imagesOutline, searchOutline, starOutline, star, funnelOutline,
  swapVerticalOutline, imageOutline, ellipsisVerticalOutline
} from 'ionicons/icons';
import { ChatSessionService } from '../../core/services/chat-session.service';
import { ScenarioService } from '../../core/services/scenario.service';
import { FileIOService } from '../../core/services/file-io.service';
import { ChatSession } from '../../core/models/chat-session.model';
import { SettingsMenuComponent } from '../../shared/components/settings-menu/settings-menu.component';
import { MemoryBrowserPage } from '../memory/memory-browser.page';

@Component({
  selector: 'app-gallery',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>💬 Chats</ion-title>
        <ion-button slot="end" fill="clear" (click)="toggleView()" *ngIf="activeTab === 'chats'">
          <ion-icon slot="icon-only" [name]="viewMode === 'grid' ? 'list-outline' : 'grid-outline'"></ion-icon>
        </ion-button>
        <ion-button slot="end" fill="clear" (click)="importFromFile()" *ngIf="activeTab === 'chats'">
          <ion-icon slot="icon-only" name="cloud-upload-outline"></ion-icon>
        </ion-button>
        <app-settings-menu slot="end"></app-settings-menu>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [(ngModel)]="activeTab">
          <ion-segment-button value="chats">
            <ion-label>Chats</ion-label>
          </ion-segment-button>
          <ion-segment-button value="memories">
            <ion-label>Memories</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
      @if (activeTab === 'chats') {
      <ion-toolbar>
        <ion-searchbar
          [(ngModel)]="searchQuery"
          (ionInput)="onSearch()"
          placeholder="Search chats & stories..."
          class="mb-input"
        ></ion-searchbar>
      </ion-toolbar>
      <ion-toolbar>
        <div class="filter-row">
          <span class="mb-chip" [class.active]="filterMode === 'all'" (click)="setFilter('all')">All</span>
          <span class="mb-chip" [class.active]="filterMode === 'chat'" (click)="setFilter('chat')">Chat</span>
          <span class="mb-chip" [class.active]="filterMode === 'story'" (click)="setFilter('story')">Story</span>
          <span class="mb-chip" [class.active]="filterMode === 'favorites'" (click)="setFilter('favorites')">
            <ion-icon name="star-outline"></ion-icon> Favorites
          </span>
          <span class="sort-separator"></span>
          <select [(ngModel)]="sortMode" (ngModelChange)="onSort()" class="sort-select">
            <option value="updatedAt">Last Updated</option>
            <option value="createdAt">Created</option>
            <option value="title">Title</option>
            <option value="messageCount">Messages</option>
          </select>
        </div>
      </ion-toolbar>
      }
    </ion-header>
    
    <ion-content class="ion-padding">
      @if (activeTab === 'chats') {
        @if (filteredSessions.length === 0) {
          <div class="mb-empty-state">
            <ion-icon name="images-outline"></ion-icon>
            <h3>No Sessions Yet</h3>
            <p>Start a chat or story from a scenario, or load from a file</p>
            <ion-button class="mb-btn-primary" (click)="importFromFile()">
              <ion-icon slot="start" name="cloud-upload-outline"></ion-icon>
              Load from File
            </ion-button>
          </div>
        }
      
        <!-- Grid View -->
        @if (viewMode === 'grid' && filteredSessions.length > 0) {
          <div class="gallery-grid">
            @for (session of filteredSessions; track session; let i = $index) {
              <div
                class="gallery-card mb-glass-card mb-fade-in"
                [style.animation-delay]="(i * 0.04) + 's'"
                (click)="openSession(session)">
                <div class="gc-thumb">
                  @if (session.thumbnailImage) {
                    <img [src]="session.thumbnailImage" alt="" />
                  }
                  @if (!session.thumbnailImage) {
                    <div class="gc-thumb-placeholder">
                      <div class="gc-gradient" [style.background]="getGradient(i)"></div>
                      <span>{{ session.mode === 'chat' ? '💬' : '📖' }}</span>
                    </div>
                  }
                  <ion-button class="gc-fav-btn" fill="clear" (click)="toggleFavorite(session, $event)">
                    <ion-icon slot="icon-only" [name]="session.isFavorite ? 'star' : 'star-outline'"
                    [style.color]="session.isFavorite ? '#f59e0b' : 'white'"></ion-icon>
                  </ion-button>
                  <ion-button class="gc-menu-btn" fill="clear" (click)="showSessionActions(session, $event)">
                    <ion-icon slot="icon-only" name="ellipsis-vertical-outline" style="color: white; font-size: 16px;"></ion-icon>
                  </ion-button>
                </div>
                <div class="gc-info">
                  <div class="gc-title">{{ session.title }}</div>
                  <div class="gc-meta">
                    <span class="mb-badge" [class]="'mb-badge-' + (session.mode === 'chat' ? 'memory' : 'premise')">
                      {{ session.mode | titlecase }}
                    </span>
                    <span class="gc-time">{{ getRelativeTime(session.updatedAt) }}</span>
                  </div>
                  @if (session.summary) {
                    <div class="gc-summary">{{ session.summary | slice:0:50 }}...</div>
                  }
                </div>
              </div>
            }
          </div>
        }
      
        <!-- List View -->
        @if (viewMode === 'list' && filteredSessions.length > 0) {
          <div class="gallery-list">
            @for (session of filteredSessions; track session; let i = $index) {
              <div
                class="gallery-list-item mb-card mb-fade-in"
                [style.animation-delay]="(i * 0.03) + 's'"
                (click)="openSession(session)">
                <div class="gli-thumb">
                  @if (session.thumbnailImage) {
                    <img [src]="session.thumbnailImage" alt="" />
                  }
                  @if (!session.thumbnailImage) {
                    <div class="gli-thumb-placeholder">
                      {{ session.mode === 'chat' ? '💬' : '📖' }}
                    </div>
                  }
                </div>
                <div class="gli-info">
                  <div class="gli-title">{{ session.title }}</div>
                  <div class="gli-meta">
                    {{ session.messages.length }} messages · {{ getRelativeTime(session.updatedAt) }}
                  </div>
                </div>
                <div class="gli-actions">
                  <ion-button fill="clear" size="small" (click)="showSessionActions(session, $event)">
                    <ion-icon slot="icon-only" name="ellipsis-vertical-outline"></ion-icon>
                  </ion-button>
                </div>
              </div>
            }
          </div>
        }
      }
      
      @if (activeTab === 'memories') {
        <app-memory-browser></app-memory-browser>
      }
      
      <!-- Hidden file input -->
      <input type="file" #importInput accept=".json" (change)="onImportFileSelected($event)" style="display:none" />
      <input type="file" #thumbnailInput accept="image/*" (change)="onThumbnailSelected($event)" style="display:none" />
    </ion-content>
    `,
  styles: [`
    .filter-row {
      display: flex; gap: 8px; padding: 0 16px 8px; overflow-x: auto;
      align-items: center;
    }
    .sort-separator { flex: 1; }
    .sort-select {
      background: var(--mb-bg-input); color: var(--mb-text-secondary);
      border: 1px solid var(--mb-border); border-radius: var(--mb-radius-sm);
      padding: 4px 8px; font-size: 12px; appearance: auto;
      min-width: 120px;
    }

    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 14px;
    }

    .gallery-card { padding: 0; overflow: hidden; cursor: pointer; }

    .gc-thumb {
      height: 120px; position: relative; overflow: hidden;
    }

    .gc-thumb img { width: 100%; height: 100%; object-fit: cover; }

    .gc-thumb-placeholder {
      height: 100%; display: flex; align-items: center; justify-content: center;
      font-size: 36px; position: relative;
    }

    .gc-gradient {
      position: absolute; inset: 0; opacity: 0.6;
    }

    .gc-fav-btn {
      position: absolute; top: 4px; right: 36px;
      --padding-start: 4px; --padding-end: 4px;
    }

    .gc-menu-btn {
      position: absolute; top: 4px; right: 4px;
      --padding-start: 4px; --padding-end: 4px;
    }

    .gc-info { padding: 10px 12px; }

    .gc-title {
      font-weight: 700; font-size: 14px; color: var(--mb-text-primary);
      margin-bottom: 4px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    .gc-meta {
      display: flex; align-items: center; gap: 8px; margin-bottom: 4px;
    }

    .gc-time { font-size: 11px; color: var(--mb-text-muted); }

    .gc-summary { font-size: 12px; color: var(--mb-text-muted); line-height: 1.3; }

    .gallery-list { display: flex; flex-direction: column; gap: 8px; }

    .gallery-list-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; cursor: pointer;
    }

    .gli-thumb {
      width: 44px; height: 44px; border-radius: var(--mb-radius-md);
      overflow: hidden; flex-shrink: 0;
    }

    .gli-thumb img { width: 100%; height: 100%; object-fit: cover; }

    .gli-thumb-placeholder {
      width: 100%; height: 100%; display: flex;
      align-items: center; justify-content: center;
      background: var(--mb-bg-elevated); font-size: 20px;
    }

    .gli-info { flex: 1; min-width: 0; }

    .gli-title {
      font-weight: 600; font-size: 15px; color: var(--mb-text-primary);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    .gli-meta { font-size: 12px; color: var(--mb-text-muted); }

    .gli-actions { display: flex; gap: 0; }
    .gli-actions ion-button {
      --padding-start: 6px; --padding-end: 6px;
    }
  `],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonSearchbar, IonSegment, IonSegmentButton, IonLabel,
    SettingsMenuComponent, MemoryBrowserPage
  ],
})
export class GalleryPage implements OnInit {
  activeTab: 'chats' | 'memories' = 'chats';
  sessions: ChatSession[] = [];
  viewMode: 'grid' | 'list' = 'grid';
  searchQuery = '';
  filterMode: 'all' | 'chat' | 'story' | 'favorites' = 'all';
  sortMode: 'updatedAt' | 'createdAt' | 'title' | 'messageCount' = 'updatedAt';

  private gradients = [
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  ];

  constructor(
    private router: Router,
    private chatSessionService: ChatSessionService,
    private fileIOService: FileIOService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController,
  ) {
    addIcons({
      gridOutline, listOutline, heartOutline, heart, downloadOutline,
      cloudUploadOutline, trashOutline, copyOutline, playOutline,
      imagesOutline, searchOutline, starOutline, star, funnelOutline,
      swapVerticalOutline, imageOutline, ellipsisVerticalOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadSessions();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.loadSessions();
  }

  async loadSessions(): Promise<void> {
    this.sessions = await this.chatSessionService.getAllSessions();
  }

  get filteredSessions(): ChatSession[] {
    let result = this.sessions;
    if (this.filterMode === 'chat') result = result.filter(s => s.mode === 'chat');
    else if (this.filterMode === 'story') result = result.filter(s => s.mode === 'story');
    else if (this.filterMode === 'favorites') result = result.filter(s => s.isFavorite);

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.summary || '').toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sort
    switch (this.sortMode) {
      case 'createdAt':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'messageCount':
        result.sort((a, b) => b.messages.length - a.messages.length);
        break;
      case 'updatedAt':
      default:
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
    }

    return result;
  }

  toggleView(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  setFilter(mode: 'all' | 'chat' | 'story' | 'favorites'): void {
    this.filterMode = mode;
  }

  onSort(): void {
    // Sorting is done reactively via the getter
  }

  async onSearch(): Promise<void> {
    // Filtering is done reactively via the getter
  }

  getGradient(index: number): string {
    return this.gradients[index % this.gradients.length];
  }

  openSession(session: ChatSession): void {
    const routePrefix = session.mode === 'story' ? '/story/' : '/chat/';
    this.router.navigateByUrl(routePrefix + session.id);
  }

  async toggleFavorite(session: ChatSession, event: Event): Promise<void> {
    event.stopPropagation();
    await this.chatSessionService.toggleFavorite(session.id);
    session.isFavorite = !session.isFavorite;
  }

  async exportSession(session: ChatSession, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      const json = await this.fileIOService.exportSession(session.id);
      this.fileIOService.downloadFile(json, `${session.title.replace(/\s+/g, '_')}_session.json`);
      const toast = await this.toastCtrl.create({ message: 'Session exported!', duration: 2000, color: 'success' });
      await toast.present();
    } catch (e: any) {
      const toast = await this.toastCtrl.create({ message: `Export failed: ${e.message}`, duration: 3000, color: 'danger' });
      await toast.present();
    }
  }

  async duplicateSession(session: ChatSession, event: Event): Promise<void> {
    event.stopPropagation();
    await this.chatSessionService.duplicateSession(session.id);
    await this.loadSessions();
    const toast = await this.toastCtrl.create({ message: 'Session duplicated!', duration: 2000, color: 'success' });
    await toast.present();
  }

  async confirmDelete(session: ChatSession, event: Event): Promise<void> {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Delete Session',
      message: `Delete "${session.title}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: async () => {
            await this.chatSessionService.deleteSession(session.id);
            await this.loadSessions();
          },
        },
      ],
    });
    await alert.present();
  }

  importFromFile(): void {
    const input = document.querySelector('#importInput, input[accept=".json"]') as HTMLInputElement;
    input?.click();
  }

  // ── Session Actions ──

  private thumbnailTargetSession?: ChatSession;

  async showSessionActions(session: ChatSession, event: Event): Promise<void> {
    event.stopPropagation();

    const actionSheet = await this.actionSheetCtrl.create({
      header: session.title,
      buttons: [
        {
          text: 'Set Thumbnail',
          icon: 'image-outline',
          handler: () => {
            this.thumbnailTargetSession = session;
            const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
            input?.click();
          },
        },
        {
          text: session.isFavorite ? 'Remove Favorite' : 'Add Favorite',
          icon: session.isFavorite ? 'star' : 'star-outline',
          handler: () => this.toggleFavorite(session, event),
        },
        {
          text: 'Export',
          icon: 'download-outline',
          handler: () => this.exportSession(session, event),
        },
        {
          text: 'Duplicate',
          icon: 'copy-outline',
          handler: () => this.duplicateSession(session, event),
        },
        {
          text: 'Delete',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => this.confirmDelete(session, event),
        },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await actionSheet.present();
  }

  async onThumbnailSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.thumbnailTargetSession) return;

    try {
      const dataUrl = await this.readFileAsDataUrl(file);
      await this.chatSessionService.updateSession(this.thumbnailTargetSession.id, {
        thumbnailImage: dataUrl,
      });
      this.thumbnailTargetSession.thumbnailImage = dataUrl;

      const toast = await this.toastCtrl.create({
        message: '🖼️ Thumbnail set!', duration: 2000, color: 'success',
      });
      await toast.present();
    } catch (e: any) {
      const toast = await this.toastCtrl.create({
        message: `Failed to set thumbnail: ${e.message}`, duration: 3000, color: 'danger',
      });
      await toast.present();
    }

    input.value = '';
    this.thumbnailTargetSession = undefined;
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  async onImportFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await this.fileIOService.readFileAsText(file);
      const result = await this.fileIOService.importFromJson(text);

      if (result.conflicts.length > 0) {
        const conflictNames = result.conflicts.map(c => `${c.type}: ${c.name}`).join(', ');
        const alert = await this.alertCtrl.create({
          header: 'Import Conflicts',
          message: `Existing data found: ${conflictNames}. How should we handle this?`,
          buttons: [
            { text: 'Cancel', role: 'cancel' },
            { text: 'Skip Duplicates', handler: async () => {
              await this.fileIOService.executeImport(result.data, 'skip');
              await this.loadSessions();
            }},
            { text: 'Create Copies', handler: async () => {
              await this.fileIOService.executeImport(result.data, 'copy');
              await this.loadSessions();
            }},
          ],
        });
        await alert.present();
      } else {
        await this.fileIOService.executeImport(result.data, 'skip');
        await this.loadSessions();
        const toast = await this.toastCtrl.create({ message: 'Session imported!', duration: 2000, color: 'success' });
        await toast.present();
      }
    } catch (e: any) {
      const toast = await this.toastCtrl.create({ message: `Import failed: ${e.message}`, duration: 3000, color: 'danger' });
      await toast.present();
    }
    input.value = '';
  }

  getRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return days < 7 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`;
  }
}
