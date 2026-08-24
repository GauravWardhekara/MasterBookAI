import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonButtons, IonSearchbar, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, checkmarkCircle, checkmarkCircleOutline,
  personOutline, addOutline, searchOutline
} from 'ionicons/icons';
import { CharacterService } from '../../../core/services/character.service';
import { Character } from '../../../core/models/character.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-character-picker-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="dismiss()">
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Select Characters</ion-title>
      </ion-toolbar>
      <ion-toolbar class="search-toolbar">
        <ion-searchbar
          [(ngModel)]="searchQuery"
          (ionInput)="onSearch()"
          placeholder="Search by name, description, or tag…"
          class="picker-searchbar"
          [debounce]="200"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="picker-content">
      <!-- Empty state: no characters exist at all -->
      @if (allCharacters.length === 0) {
        <div class="picker-empty">
          <div class="picker-empty-icon">👤</div>
          <h3>No Characters Yet</h3>
          <p>Create your first character, then come back to add it here.</p>
          <ion-button class="mb-btn-primary" (click)="createNewCharacter()">
            <ion-icon slot="start" name="add-outline"></ion-icon>
            Create Character
          </ion-button>
        </div>
      }
    
      <!-- Character cards -->
      @if (allCharacters.length > 0) {
        <div class="picker-grid">
          <!-- Create New shortcut card -->
          <div class="picker-card create-card" (click)="createNewCharacter()">
            <div class="create-card-inner">
              <ion-icon name="add-outline" class="create-icon"></ion-icon>
              <span class="create-label">Create New Character</span>
            </div>
          </div>
          @for (char of filteredCharacters; track trackById(i, char); let i = $index) {
            <div
              class="picker-card"
              [class.selected]="isSelected(char.id)"
              [class.disabled]="isExcluded(char.id)"
              [style.animation-delay]="(i * 0.04) + 's'"
              (click)="toggleSelect(char)"
              >
              <!-- Selection overlay -->
              <div class="select-indicator">
                <ion-icon
                  [name]="isSelected(char.id) ? 'checkmark-circle' : 'checkmark-circle-outline'"
                  class="select-icon"
                  [class.checked]="isSelected(char.id)"
                ></ion-icon>
              </div>
              <!-- Already-added badge -->
              @if (isExcluded(char.id)) {
                <div class="already-badge">
                  Already Added
                </div>
              }
              <!-- Avatar -->
              <div class="picker-avatar-wrap">
                @if (char.avatar) {
                  <div class="picker-avatar">
                    <img [src]="char.avatar" [alt]="char.name" />
                  </div>
                }
                @if (!char.avatar) {
                  <div class="picker-avatar picker-avatar-placeholder">
                    {{ char.name.charAt(0).toUpperCase() }}
                  </div>
                }
              </div>
              <!-- Info -->
              <div class="picker-info">
                <div class="picker-name">{{ char.name }}</div>
                <div class="picker-desc">
                  {{ char.description | slice:0:80 }}{{ char.description.length > 80 ? '…' : '' }}
                </div>
                <div class="picker-tags">
                  @if (char.isPlayable) {
                    <span class="tag-badge playable-badge">Playable</span>
                  }
                  @for (tag of char.tags | slice:0:3; track tag) {
                    <span class="tag-badge">{{ tag }}</span>
                  }
                </div>
              </div>
            </div>
          }
          <!-- No results from search -->
          @if (filteredCharacters.length === 0 && searchQuery.trim()) {
            <div class="picker-no-results">
              <ion-icon name="search-outline"></ion-icon>
              <span>No characters match "{{ searchQuery }}"</span>
            </div>
          }
        </div>
      }
    </ion-content>
    
    <!-- Sticky bottom bar -->
    @if (allCharacters.length > 0) {
      <div class="picker-footer">
        <div class="footer-count">
          <span class="count-number">{{ selectedIds.size }}</span>
          <span class="count-label">selected</span>
        </div>
        <ion-button
          class="confirm-btn"
          [disabled]="selectedIds.size === 0"
          (click)="confirm()"
          >
          <ion-icon slot="start" name="checkmark-circle-outline"></ion-icon>
          Add {{ selectedIds.size > 0 ? selectedIds.size : '' }} Character{{ selectedIds.size !== 1 ? 's' : '' }}
        </ion-button>
      </div>
    }
    `,
  styles: [`
    /* ═══════════════════════════════════════
       HEADER & SEARCH
       ═══════════════════════════════════════ */
    .search-toolbar {
      --min-height: 48px;
      --padding-top: 0;
      --padding-bottom: 4px;
    }

    .picker-searchbar {
      --background: var(--mb-bg-input);
      --border-radius: var(--mb-radius-full);
      --icon-color: var(--mb-text-muted);
      --placeholder-color: var(--mb-text-muted);
      --color: var(--mb-text-primary);
      font-size: 14px;
      padding: 0 8px;
    }

    /* ═══════════════════════════════════════
       CONTENT AREA
       ═══════════════════════════════════════ */
    .picker-content {
      --background: var(--mb-bg-deep);
    }

    /* ═══════════════════════════════════════
       EMPTY STATE
       ═══════════════════════════════════════ */
    .picker-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
      text-align: center;
      animation: mb-fade-in 0.3s ease forwards;
    }

    .picker-empty-icon {
      font-size: 56px;
      margin-bottom: 16px;
      opacity: 0.6;
    }

    .picker-empty h3 {
      color: var(--mb-text-secondary);
      font-weight: 700;
      margin-bottom: 8px;
    }

    .picker-empty p {
      color: var(--mb-text-muted);
      font-size: 14px;
      max-width: 280px;
      margin-bottom: 20px;
      line-height: 1.5;
    }

    /* ═══════════════════════════════════════
       CARD GRID
       ═══════════════════════════════════════ */
    .picker-grid {
      padding: 12px 16px 100px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /* ── Create New Shortcut Card ── */
    .create-card {
      border: 2px dashed rgba(167, 139, 250, 0.25) !important;
      background: transparent !important;
      cursor: pointer;
      transition: all var(--mb-transition-normal);
    }

    .create-card:hover {
      border-color: var(--mb-primary) !important;
      background: rgba(167, 139, 250, 0.04) !important;
    }

    .create-card-inner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 8px 0;
      color: var(--mb-primary);
      font-weight: 600;
      font-size: 14px;
    }

    .create-icon {
      font-size: 22px;
    }

    /* ═══════════════════════════════════════
       CHARACTER CARD
       ═══════════════════════════════════════ */
    .picker-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      background: var(--mb-bg-card);
      border: 1.5px solid var(--mb-border);
      border-radius: var(--mb-radius-lg);
      cursor: pointer;
      transition: all var(--mb-transition-normal);
      position: relative;
      animation: mb-stagger-in 0.35s ease forwards;
      opacity: 0;
    }

    .picker-card:hover:not(.disabled) {
      background: var(--mb-bg-card-hover);
      border-color: var(--mb-border-light);
      box-shadow: var(--mb-shadow-sm);
    }

    /* Selected state */
    .picker-card.selected {
      border-color: var(--mb-primary);
      background: rgba(167, 139, 250, 0.06);
      box-shadow: 0 0 0 1px rgba(167, 139, 250, 0.2),
                  0 0 16px rgba(167, 139, 250, 0.08);
    }

    .picker-card.selected:hover {
      background: rgba(167, 139, 250, 0.1);
    }

    /* Disabled (already added) state */
    .picker-card.disabled {
      opacity: 0.45;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* ── Selection Indicator ── */
    .select-indicator {
      position: absolute;
      top: 10px;
      right: 10px;
    }

    .select-icon {
      font-size: 22px;
      color: var(--mb-border-light);
      transition: all var(--mb-transition-fast);
    }

    .select-icon.checked {
      color: var(--mb-primary);
      filter: drop-shadow(0 0 4px rgba(167, 139, 250, 0.4));
      animation: check-pop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes check-pop {
      0% { transform: scale(0.6); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }

    /* ── Already-added badge ── */
    .already-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      border-radius: var(--mb-radius-full);
      background: rgba(92, 99, 112, 0.25);
      color: var(--mb-text-muted);
    }

    /* ── Avatar ── */
    .picker-avatar-wrap {
      flex-shrink: 0;
    }

    .picker-avatar {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid var(--mb-border);
      transition: border-color var(--mb-transition-fast);
    }

    .selected .picker-avatar {
      border-color: var(--mb-primary);
    }

    .picker-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .picker-avatar-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--mb-primary-dark), var(--mb-primary));
      color: white;
      font-weight: 700;
      font-size: 20px;
    }

    /* ── Info ── */
    .picker-info {
      flex: 1;
      min-width: 0;
      padding-right: 28px;
    }

    .picker-name {
      font-weight: 700;
      font-size: 15px;
      color: var(--mb-text-primary);
      margin-bottom: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .selected .picker-name {
      color: var(--mb-primary-light);
    }

    .picker-desc {
      font-size: 12.5px;
      color: var(--mb-text-muted);
      line-height: 1.4;
      margin-bottom: 6px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .picker-tags {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
    }

    .tag-badge {
      display: inline-flex;
      align-items: center;
      padding: 1px 8px;
      border-radius: var(--mb-radius-full);
      font-size: 11px;
      font-weight: 500;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      color: var(--mb-text-muted);
    }

    .playable-badge {
      background: rgba(167, 139, 250, 0.12);
      border-color: rgba(167, 139, 250, 0.2);
      color: var(--mb-primary);
    }

    /* ── No Results ── */
    .picker-no-results {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 40px 20px;
      color: var(--mb-text-muted);
      font-size: 14px;
    }

    .picker-no-results ion-icon {
      font-size: 32px;
      opacity: 0.4;
    }

    /* ═══════════════════════════════════════
       STICKY FOOTER
       ═══════════════════════════════════════ */
    .picker-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--mb-bg-secondary);
      border-top: 1px solid var(--mb-border);
      position: sticky;
      bottom: 0;
      z-index: 100;
    }

    .footer-count {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .count-number {
      font-size: 22px;
      font-weight: 700;
      color: var(--mb-primary);
      line-height: 1;
      transition: all var(--mb-transition-fast);
    }

    .count-label {
      font-size: 13px;
      color: var(--mb-text-muted);
    }

    .confirm-btn {
      --background: linear-gradient(135deg, var(--mb-primary), var(--mb-primary-dark));
      --border-radius: var(--mb-radius-md);
      --box-shadow: 0 4px 12px rgba(167, 139, 250, 0.3);
      font-weight: 600;
      letter-spacing: 0.3px;
      --padding-top: 10px;
      --padding-bottom: 10px;
      --padding-start: 20px;
      --padding-end: 20px;
      transition: all var(--mb-transition-normal);
    }

    .confirm-btn:hover:not([disabled]) {
      --box-shadow: 0 6px 20px rgba(167, 139, 250, 0.4);
      transform: translateY(-1px);
    }

    .confirm-btn[disabled] {
      opacity: 0.4;
    }

    /* ═══════════════════════════════════════
       RESPONSIVE — 2 columns on wider screens
       ═══════════════════════════════════════ */
    @media (min-width: 640px) {
      .picker-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
      }

      .create-card {
        grid-column: 1 / -1;
      }
    }
  `],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonButtons, IonSearchbar
  ],
  standalone: true,
})
export class CharacterPickerModalComponent implements OnInit {
  /**
   * IDs of characters already added to the scenario.
   * These will be greyed-out and non-selectable.
   */
  @Input() excludeIds: string[] = [];

  /** All characters loaded from the database */
  allCharacters: Character[] = [];

  /** Filtered list based on search */
  filteredCharacters: Character[] = [];

  /** Currently selected character IDs (new selections only) */
  selectedIds = new Set<string>();

  /** Search query string */
  searchQuery = '';

  constructor(
    private modalCtrl: ModalController,
    private characterService: CharacterService,
    private router: Router,
  ) {
    addIcons({
      closeOutline, checkmarkCircle, checkmarkCircleOutline,
      personOutline, addOutline, searchOutline
    });
  }

  async ngOnInit(): Promise<void> {
    this.allCharacters = await this.characterService.getAllCharacters();
    this.filteredCharacters = [...this.allCharacters];
  }

  /** Filter characters by name, description, or tags */
  onSearch(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredCharacters = [...this.allCharacters];
      return;
    }
    this.filteredCharacters = this.allCharacters.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  /** Check if a character is already added to the scenario */
  isExcluded(id: string): boolean {
    return this.excludeIds.includes(id);
  }

  /** Check if a character is currently selected */
  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  /** Toggle selection of a character */
  toggleSelect(char: Character): void {
    if (this.isExcluded(char.id)) return;

    if (this.selectedIds.has(char.id)) {
      this.selectedIds.delete(char.id);
    } else {
      this.selectedIds.add(char.id);
    }
  }

  /** Confirm selection and return selected characters */
  confirm(): void {
    const selected = this.allCharacters.filter(c => this.selectedIds.has(c.id));
    this.modalCtrl.dismiss(selected, 'confirm');
  }

  /** Dismiss without selection */
  dismiss(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  /** Navigate to character creation page */
  createNewCharacter(): void {
    this.modalCtrl.dismiss(null, 'create-new');
  }

  trackById(index: number, char: Character): string {
    return char.id;
  }
}
