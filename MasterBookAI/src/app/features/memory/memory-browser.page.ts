import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonSearchbar, IonSegment, IonSegmentButton, IonLabel,
  AlertController, ToastController, ActionSheetController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  bulbOutline, trashOutline, createOutline, searchOutline,
  filterOutline, trendingUpOutline, trendingDownOutline,
  bookmarkOutline, flashOutline, sparklesOutline, timeOutline,
  chevronDownOutline, chevronUpOutline, ellipsisVerticalOutline,
  refreshOutline, analyticsOutline
} from 'ionicons/icons';
import { MemoryService } from '../../core/services/memory.service';
import { Memory } from '../../core/models/chat-session.model';

@Component({
  selector: 'app-memory-browser',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>
          <span class="page-title">
            <ion-icon name="bulb-outline" class="title-icon"></ion-icon>
            Memories
          </span>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="memory-container mb-fade-in">

        <!-- Stats Bar -->
        <div class="stats-bar mb-glass-card">
          <div class="stat-item">
            <ion-icon name="analytics-outline"></ion-icon>
            <div class="stat-data">
              <span class="stat-num">{{ stats.total }}</span>
              <span class="stat-lbl">Total</span>
            </div>
          </div>
          <div class="stat-item">
            <ion-icon name="sparkles-outline" style="color: var(--mb-primary)"></ion-icon>
            <div class="stat-data">
              <span class="stat-num">{{ stats.auto }}</span>
              <span class="stat-lbl">Auto</span>
            </div>
          </div>
          <div class="stat-item">
            <ion-icon name="bookmark-outline" style="color: var(--mb-accent)"></ion-icon>
            <div class="stat-data">
              <span class="stat-num">{{ stats.manual }}</span>
              <span class="stat-lbl">Pinned</span>
            </div>
          </div>
          <div class="stat-item">
            <ion-icon name="trending-up-outline" style="color: var(--mb-success)"></ion-icon>
            <div class="stat-data">
              <span class="stat-num">{{ (stats.avgImportance * 100).toFixed(0) }}%</span>
              <span class="stat-lbl">Avg Score</span>
            </div>
          </div>
        </div>

        <!-- Search & Filter -->
        <div class="filter-row">
          <ion-searchbar
            [(ngModel)]="searchQuery"
            placeholder="Search memories..."
            (ionInput)="filterMemories()"
            class="memory-search"
          ></ion-searchbar>
        </div>

        <ion-segment [(ngModel)]="filterSource" (ionChange)="filterMemories()" class="source-filter">
          <ion-segment-button value="all">
            <ion-label>All</ion-label>
          </ion-segment-button>
          <ion-segment-button value="auto">
            <ion-label>🤖 Auto</ion-label>
          </ion-segment-button>
          <ion-segment-button value="manual">
            <ion-label>📌 Pinned</ion-label>
          </ion-segment-button>
        </ion-segment>

        <div class="sort-row">
          <span class="sort-label">Sort by:</span>
          <span class="mb-chip" [class.active]="sortBy === 'date'" (click)="setSortBy('date')">
            <ion-icon name="time-outline"></ion-icon> Date
          </span>
          <span class="mb-chip" [class.active]="sortBy === 'importance'" (click)="setSortBy('importance')">
            <ion-icon name="trending-up-outline"></ion-icon> Importance
          </span>
          <span class="mb-chip" [class.active]="sortBy === 'decay'" (click)="setSortBy('decay')">
            <ion-icon name="trending-down-outline"></ion-icon> Relevance
          </span>
        </div>

        <!-- Empty State -->
        <div *ngIf="filteredMemories.length === 0 && !isLoading" class="mb-empty-state">
          <ion-icon name="bulb-outline"></ion-icon>
          <h3>No Memories Yet</h3>
          <p>Memories are automatically extracted during chats, or you can pin important messages manually</p>
        </div>

        <!-- Memory Cards -->
        <div class="memory-list">
          <div *ngFor="let memory of filteredMemories; let i = index; trackBy: trackByMemId"
               class="memory-card mb-card mb-fade-in"
               [style.animation-delay]="(i * 0.03) + 's'"
               [class.high-importance]="memory.importanceScore >= 0.7"
               [class.low-decay]="memory.decayFactor < 0.5">

            <div class="memory-header">
              <div class="memory-source-badge" [class.auto]="memory.source === 'auto'" [class.manual]="memory.source === 'manual'">
                <ion-icon [name]="memory.source === 'auto' ? 'sparkles-outline' : 'bookmark-outline'"></ion-icon>
                {{ memory.source === 'auto' ? 'Auto-extracted' : 'Pinned' }}
              </div>
              <div class="memory-scores">
                <span class="score-pill importance"
                      [title]="'Importance: ' + (memory.importanceScore * 100).toFixed(0) + '%'">
                  <ion-icon name="trending-up-outline"></ion-icon>
                  {{ (memory.importanceScore * 100).toFixed(0) }}%
                </span>
                <span class="score-pill decay"
                      [title]="'Relevance decay: ' + (memory.decayFactor * 100).toFixed(0) + '%'"
                      [class.fading]="memory.decayFactor < 0.5">
                  <ion-icon name="flash-outline"></ion-icon>
                  {{ (memory.decayFactor * 100).toFixed(0) }}%
                </span>
              </div>
            </div>

            <div class="memory-text">{{ memory.summaryText }}</div>

            <div class="memory-footer">
              <span class="memory-date">{{ formatDate(memory.createdAt) }}</span>
              <div class="memory-actions">
                <ion-button fill="clear" size="small" (click)="boostMemory(memory)" title="Boost importance">
                  <ion-icon slot="icon-only" name="trending-up-outline"></ion-icon>
                </ion-button>
                <ion-button fill="clear" size="small" (click)="editMemory(memory)" title="Edit">
                  <ion-icon slot="icon-only" name="create-outline"></ion-icon>
                </ion-button>
                <ion-button fill="clear" size="small" color="danger" (click)="confirmDeleteMemory(memory)" title="Delete">
                  <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                </ion-button>
              </div>
            </div>
          </div>
        </div>

        <!-- Bulk Actions -->
        <div class="bulk-actions" *ngIf="filteredMemories.length > 0">
          <ion-button fill="clear" size="small" (click)="applyDecay()">
            <ion-icon slot="start" name="refresh-outline"></ion-icon>
            Apply Decay
          </ion-button>
          <ion-button fill="clear" size="small" color="danger" (click)="confirmClearAll()">
            <ion-icon slot="start" name="trash-outline"></ion-icon>
            Clear All
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .memory-container { max-width: 700px; margin: 0 auto; }

    .page-title {
      display: flex; align-items: center; gap: 8px;
      font-weight: 800; font-size: 20px;
    }
    .title-icon { color: var(--mb-accent); font-size: 22px; }

    /* Stats Bar */
    .stats-bar {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 0; padding: 16px 12px; margin-bottom: 16px;
    }
    .stat-item {
      display: flex; align-items: center; gap: 8px;
      justify-content: center; padding: 4px 8px;
      border-right: 1px solid var(--mb-border);
    }
    .stat-item:last-child { border-right: none; }
    .stat-item ion-icon { font-size: 20px; color: var(--mb-text-muted); }
    .stat-data { display: flex; flex-direction: column; }
    .stat-num { font-size: 18px; font-weight: 800; color: var(--mb-text-primary); }
    .stat-lbl { font-size: 10px; color: var(--mb-text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

    /* Filters */
    .filter-row { margin-bottom: 12px; }
    .memory-search {
      --background: var(--mb-bg-input);
      --border-radius: var(--mb-radius-md);
      --color: var(--mb-text-primary);
      --placeholder-color: var(--mb-text-muted);
      padding: 0;
    }
    .source-filter {
      --background: var(--mb-bg-card);
      border-radius: var(--mb-radius-md);
      margin-bottom: 12px;
    }
    .sort-row {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 16px; flex-wrap: wrap;
    }
    .sort-label { font-size: 12px; color: var(--mb-text-muted); font-weight: 500; }

    /* Memory Cards */
    .memory-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }

    .memory-card {
      padding: 14px 16px; position: relative;
      border-left: 3px solid var(--mb-border);
    }
    .memory-card.high-importance { border-left-color: var(--mb-success); }
    .memory-card.low-decay { opacity: 0.7; }

    .memory-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 8px;
    }

    .memory-source-badge {
      display: flex; align-items: center; gap: 4px;
      font-size: 11px; font-weight: 600;
      padding: 2px 8px; border-radius: var(--mb-radius-full);
    }
    .memory-source-badge.auto {
      background: rgba(167, 139, 250, 0.1); color: var(--mb-primary);
    }
    .memory-source-badge.manual {
      background: rgba(245, 158, 11, 0.1); color: var(--mb-accent);
    }
    .memory-source-badge ion-icon { font-size: 12px; }

    .memory-scores { display: flex; gap: 6px; }

    .score-pill {
      display: flex; align-items: center; gap: 3px;
      font-size: 10px; font-weight: 600;
      padding: 2px 6px; border-radius: var(--mb-radius-full);
    }
    .score-pill ion-icon { font-size: 10px; }
    .score-pill.importance {
      background: rgba(52, 211, 153, 0.1); color: var(--mb-success);
    }
    .score-pill.decay {
      background: rgba(96, 165, 250, 0.1); color: var(--mb-secondary);
    }
    .score-pill.decay.fading {
      background: rgba(248, 113, 113, 0.1); color: var(--mb-danger);
    }

    .memory-text {
      font-size: 14px; line-height: 1.6;
      color: var(--mb-text-primary); white-space: pre-wrap;
    }

    .memory-footer {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 8px; padding-top: 6px;
      border-top: 1px solid var(--mb-border);
    }
    .memory-date { font-size: 11px; color: var(--mb-text-muted); }
    .memory-actions { display: flex; gap: 0; }
    .memory-actions ion-button {
      --padding-start: 4px; --padding-end: 4px;
      height: 28px; font-size: 14px;
    }

    .bulk-actions {
      display: flex; justify-content: center; gap: 12px;
      padding: 16px 0;
    }

    @media (max-width: 400px) {
      .stats-bar { grid-template-columns: repeat(2, 1fr); }
      .stat-item { border-bottom: 1px solid var(--mb-border); padding: 8px; }
      .stat-item:nth-child(2) { border-right: none; }
      .stat-item:nth-child(3), .stat-item:nth-child(4) { border-bottom: none; }
    }
  `],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonSearchbar, IonSegment, IonSegmentButton, IonLabel
  ],
})
export class MemoryBrowserPage implements OnInit {
  allMemories: Memory[] = [];
  filteredMemories: Memory[] = [];
  isLoading = true;

  searchQuery = '';
  filterSource: 'all' | 'auto' | 'manual' = 'all';
  sortBy: 'date' | 'importance' | 'decay' = 'date';

  stats = { total: 0, auto: 0, manual: 0, avgImportance: 0 };

  constructor(
    private memoryService: MemoryService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private router: Router,
  ) {
    addIcons({
      bulbOutline, trashOutline, createOutline, searchOutline,
      filterOutline, trendingUpOutline, trendingDownOutline,
      bookmarkOutline, flashOutline, sparklesOutline, timeOutline,
      chevronDownOutline, chevronUpOutline, ellipsisVerticalOutline,
      refreshOutline, analyticsOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadMemories();
  }

  async loadMemories(): Promise<void> {
    this.isLoading = true;
    this.allMemories = await this.memoryService.getAllMemories();
    this.stats = await this.memoryService.getStats();
    this.filterMemories();
    this.isLoading = false;
  }

  filterMemories(): void {
    let result = [...this.allMemories];

    // Source filter
    if (this.filterSource === 'auto') {
      result = result.filter(m => m.source === 'auto');
    } else if (this.filterSource === 'manual') {
      result = result.filter(m => m.source === 'manual');
    }

    // Search filter
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(m => m.summaryText.toLowerCase().includes(q));
    }

    // Sort
    switch (this.sortBy) {
      case 'importance':
        result.sort((a, b) => b.importanceScore - a.importanceScore);
        break;
      case 'decay':
        result.sort((a, b) => b.decayFactor - a.decayFactor);
        break;
      case 'date':
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    this.filteredMemories = result;
  }

  setSortBy(sort: 'date' | 'importance' | 'decay'): void {
    this.sortBy = sort;
    this.filterMemories();
  }

  // ── Actions ──

  async editMemory(memory: Memory): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Edit Memory',
      inputs: [
        { name: 'summary', type: 'textarea', value: memory.summaryText, placeholder: 'Memory content...' },
        { name: 'importance', type: 'number', value: String(Math.round(memory.importanceScore * 100)), placeholder: 'Importance (0-100)' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data) => {
            if (data.summary?.trim()) {
              const importance = Math.max(0, Math.min(100, parseInt(data.importance, 10) || 50)) / 100;
              await this.memoryService.updateMemory(memory.id, {
                summaryText: data.summary.trim(),
                importanceScore: importance,
              });
              await this.loadMemories();

              const toast = await this.toastCtrl.create({
                message: 'Memory updated!', duration: 2000, color: 'success',
              });
              await toast.present();
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async boostMemory(memory: Memory): Promise<void> {
    await this.memoryService.boostMemory(memory.id, 0.1);
    await this.loadMemories();

    const toast = await this.toastCtrl.create({
      message: '⬆️ Memory importance boosted!', duration: 1500, color: 'success',
    });
    await toast.present();
  }

  async confirmDeleteMemory(memory: Memory): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Delete Memory',
      message: `Delete this memory?\n\n"${memory.summaryText.substring(0, 80)}${memory.summaryText.length > 80 ? '...' : ''}"`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: async () => {
            await this.memoryService.deleteMemory(memory.id);
            await this.loadMemories();
          },
        },
      ],
    });
    await alert.present();
  }

  async applyDecay(): Promise<void> {
    await this.memoryService.applyDecay();
    await this.loadMemories();

    const toast = await this.toastCtrl.create({
      message: 'Decay applied to all memories', duration: 2000,
    });
    await toast.present();
  }

  async confirmClearAll(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Clear All Memories',
      message: 'This will permanently delete all memories. This cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete All', role: 'destructive',
          handler: async () => {
            for (const m of this.allMemories) {
              await this.memoryService.deleteMemory(m.id);
            }
            await this.loadMemories();

            const toast = await this.toastCtrl.create({
              message: 'All memories cleared', duration: 2000, color: 'danger',
            });
            await toast.present();
          },
        },
      ],
    });
    await alert.present();
  }

  // ── Helpers ──

  formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  }

  trackByMemId(index: number, memory: Memory): string {
    return memory.id;
  }
}
