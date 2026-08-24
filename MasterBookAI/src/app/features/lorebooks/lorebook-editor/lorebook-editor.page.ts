import { Component, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonInput, IonTextarea, IonBackButton, IonButtons, IonChip,
  IonLabel, IonItem, IonToggle,
  ModalController, ToastController, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  saveOutline, addOutline, trashOutline, createOutline, closeOutline,
  eyeOutline, eyeOffOutline, arrowBackOutline, bookOutline, timeOutline,
  cloudOutline, peopleOutline, locationOutline, pawOutline, linkOutline
} from 'ionicons/icons';
import { LorebookService } from '../../../core/services/lorebook.service';
import { CharacterService } from '../../../core/services/character.service';
import { Lorebook, LoreEntry, LoreType, LORE_TYPE_META, createDefaultLorebook, createDefaultLoreEntry } from '../../../core/models/lorebook.model';
import { Character } from '../../../core/models/character.model';

@Component({
  selector: 'app-lorebook-editor',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/lorebooks"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ isEditing ? '📖 ' + lorebook.title : '📖 New Lorebook' }}</ion-title>
        <ion-button slot="end" fill="clear" (click)="saveLorebook()">
          <ion-icon slot="icon-only" name="save-outline"></ion-icon>
        </ion-button>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="ion-padding">
      <div class="editor-form mb-fade-in">
        <!-- Lorebook Info -->
        <div class="form-section">
          <div class="form-field">
            <label>Title</label>
            <ion-input [(ngModel)]="lorebook.title" placeholder="Lorebook title..." class="mb-input"></ion-input>
          </div>
          <div class="form-field">
            <label>Description</label>
            <ion-textarea [(ngModel)]="lorebook.description" placeholder="What is this lorebook about..." rows="2" class="mb-input"></ion-textarea>
          </div>
          <div class="form-field">
            <div class="tags-input-row">
              <ion-input [(ngModel)]="newTag" placeholder="Add tag..." class="mb-input" (keyup.enter)="addTag()"></ion-input>
              <ion-button fill="clear" (click)="addTag()">
                <ion-icon slot="icon-only" name="add-outline"></ion-icon>
              </ion-button>
            </div>
            @if (lorebook.tags && lorebook.tags.length > 0) {
              <div class="tags-list">
                @for (tag of lorebook.tags; track tag) {
                  <ion-chip (click)="removeTag(tag)">
                    {{ tag }} <ion-icon name="close-outline"></ion-icon>
                  </ion-chip>
                }
              </div>
            }
          </div>
        </div>
    
        <!-- Entries Section -->
        <div class="form-section">
          <div class="mb-section-header">
            <span class="mb-section-title">Entries ({{ entries.length }})</span>
            <ion-button fill="clear" size="small" (click)="addEntry()">
              <ion-icon slot="start" name="add-outline"></ion-icon>
              Add Entry
            </ion-button>
          </div>
    
          <!-- Filter by type -->
          @if (entries.length > 0) {
            <div class="type-filter">
              <span class="mb-chip" [class.active]="filterType === null" (click)="filterType = null">All</span>
              @for (lt of loreTypes; track lt) {
                <span class="mb-chip" [class.active]="filterType === lt"
                  (click)="filterType = lt">
                  {{ getLoreTypeMeta(lt).label }}
                </span>
              }
            </div>
          }
    
          <!-- Entry List -->
          @if (filteredEntries.length === 0 && entries.length === 0) {
            <div class="mb-empty-state" style="padding: 24px">
              <ion-icon name="book-outline"></ion-icon>
              <h3>No Entries Yet</h3>
              <p>Add lore entries with trigger words, descriptions, and links</p>
            </div>
          }
    
          <div class="entries-list">
            @for (entry of filteredEntries; track entry; let i = $index) {
              <div
                class="entry-card mb-card mb-fade-in"
                [style.animation-delay]="(i * 0.03) + 's'"
                [class.disabled]="!entry.isEnabled">
                <!-- Entry Header (collapsed view) -->
                @if (expandedEntryId !== entry.id) {
                  <div class="entry-header" (click)="expandedEntryId = entry.id">
                    <span class="mb-badge mb-badge-{{ entry.loreType }}">{{ getLoreTypeMeta(entry.loreType).label }}</span>
                    <span class="entry-title">{{ entry.title || 'Untitled' }}</span>
                    <span class="entry-trigger-count">{{ entry.triggerWords.length }} triggers</span>
                    @if (entry.linkedLoreEntryIds.length + entry.linkedCharacterIds.length > 0) {
                      <span class="entry-links">
                        <ion-icon name="link-outline"></ion-icon>
                        {{ entry.linkedLoreEntryIds.length + entry.linkedCharacterIds.length }}
                      </span>
                    }
                    <ion-button fill="clear" size="small" (click)="toggleEntry(entry, $event)">
                      <ion-icon slot="icon-only" [name]="entry.isEnabled ? 'eye-outline' : 'eye-off-outline'"></ion-icon>
                    </ion-button>
                  </div>
                }
                <!-- Entry Expanded (edit view) -->
                @if (expandedEntryId === entry.id) {
                  <div class="entry-expanded">
                    <div class="entry-expanded-header">
                      <span class="entry-title-edit">{{ entry.title || 'Untitled Entry' }}</span>
                      <ion-button fill="clear" size="small" (click)="expandedEntryId = null">
                        <ion-icon slot="icon-only" name="close-outline"></ion-icon>
                      </ion-button>
                    </div>
                    <div class="form-field">
                      <label>Title</label>
                      <ion-input [(ngModel)]="entry.title" placeholder="Entry title..." class="mb-input"></ion-input>
                    </div>
                    <div class="form-field">
                      <label>Lore Type</label>
                      <div class="type-selector">
                        @for (lt of loreTypes; track lt) {
                          <span class="mb-chip"
                            [class.active]="entry.loreType === lt"
                            [style.border-color]="entry.loreType === lt ? getLoreTypeMeta(lt).color : ''"
                            (click)="entry.loreType = lt">
                            {{ getLoreTypeMeta(lt).label }}
                          </span>
                        }
                      </div>
                    </div>
                    <div class="form-field">
                      <label>Lore Description (for AI)</label>
                      <ion-textarea [(ngModel)]="entry.loreDescription" placeholder="Describe this lore for the AI..." rows="4" class="mb-input"></ion-textarea>
                    </div>
                    <div class="form-field">
                      <label>Trigger Words</label>
                      <div class="tags-input-row">
                        <ion-input [(ngModel)]="newTriggerWord" placeholder="Add trigger word..." class="mb-input" (keyup.enter)="addTriggerWord(entry)"></ion-input>
                        <ion-button fill="clear" (click)="addTriggerWord(entry)">
                          <ion-icon slot="icon-only" name="add-outline"></ion-icon>
                        </ion-button>
                      </div>
                      <div class="tags-list">
                        @for (tw of entry.triggerWords; track tw) {
                          <ion-chip (click)="removeTriggerWord(entry, tw)">
                            {{ tw }} <ion-icon name="close-outline"></ion-icon>
                          </ion-chip>
                        }
                      </div>
                    </div>
                    <!-- Linked Entries -->
                    <div class="form-field">
                      <label>Linked Lore Entries</label>
                      <div class="linked-items">
                        @for (linkedId of entry.linkedLoreEntryIds; track linkedId) {
                          <div class="linked-item">
                            <ion-icon name="link-outline"></ion-icon>
                            <span>{{ getEntryTitle(linkedId) }}</span>
                            <ion-button fill="clear" size="small" color="danger" (click)="unlinkEntry(entry, linkedId)">
                              <ion-icon slot="icon-only" name="close-outline"></ion-icon>
                            </ion-button>
                          </div>
                        }
                      </div>
                      <ion-button fill="clear" size="small" (click)="showLinkEntryPicker(entry)">
                        <ion-icon slot="start" name="add-outline"></ion-icon>
                        Link Entry
                      </ion-button>
                    </div>
                    <!-- Linked Characters -->
                    <div class="form-field">
                      <label>Linked Characters</label>
                      <div class="linked-items">
                        @for (charId of entry.linkedCharacterIds; track charId) {
                          <div class="linked-item">
                            <ion-icon name="people-outline"></ion-icon>
                            <span>{{ getCharacterName(charId) }}</span>
                            <ion-button fill="clear" size="small" color="danger" (click)="unlinkCharacter(entry, charId)">
                              <ion-icon slot="icon-only" name="close-outline"></ion-icon>
                            </ion-button>
                          </div>
                        }
                      </div>
                      <ion-button fill="clear" size="small" (click)="showLinkCharacterPicker(entry)">
                        <ion-icon slot="start" name="add-outline"></ion-icon>
                        Link Character
                      </ion-button>
                    </div>
                    <!-- Advanced Settings -->
                    <div class="advanced-section">
                      <div class="mb-section-header">
                        <span class="mb-section-title">Advanced</span>
                      </div>
                      <div class="advanced-grid">
                        <div class="form-field">
                          <label>Insertion Position</label>
                          <select [(ngModel)]="entry.insertionPosition" class="native-select">
                            <option value="before-context">Before Context</option>
                            <option value="after-context">After Context</option>
                            <option value="in-context">In Context</option>
                          </select>
                        </div>
                        <div class="form-field">
                          <label>Scan Depth</label>
                          <ion-input type="number" [(ngModel)]="entry.scanDepth" class="mb-input"></ion-input>
                        </div>
                        <div class="form-field">
                          <label>Probability (%)</label>
                          <ion-input type="number" [ngModel]="entry.probability * 100"
                            (ngModelChange)="entry.probability = $event / 100"
                          min="0" max="100" class="mb-input"></ion-input>
                        </div>
                      </div>
                      <ion-item lines="none" class="toggle-item">
                        <ion-label>Recursive</ion-label>
                        <ion-toggle [(ngModel)]="entry.isRecursive" slot="end"></ion-toggle>
                      </ion-item>
                      <ion-item lines="none" class="toggle-item">
                        <ion-label>Enabled</ion-label>
                        <ion-toggle [(ngModel)]="entry.isEnabled" slot="end"></ion-toggle>
                      </ion-item>
                    </div>
                    <!-- Entry Actions -->
                    <div class="entry-footer">
                      <ion-button fill="clear" color="danger" size="small" (click)="confirmDeleteEntry(entry)">
                        <ion-icon slot="start" name="trash-outline"></ion-icon>
                        Delete Entry
                      </ion-button>
                      <ion-button class="mb-btn-primary" size="small" (click)="saveEntry(entry)">
                        <ion-icon slot="start" name="save-outline"></ion-icon>
                        Save Entry
                      </ion-button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
    
        <!-- Save Lorebook -->
        <ion-button expand="block" class="mb-btn-primary save-btn" (click)="saveLorebook()">
          <ion-icon slot="start" name="save-outline"></ion-icon>
          {{ isEditing ? 'Update Lorebook' : 'Create Lorebook' }}
        </ion-button>
      </div>
    </ion-content>
    `,
  styles: [`
    .editor-form { max-width: 700px; margin: 0 auto; }

    .form-section { margin-bottom: 24px; }
    .form-field { margin-bottom: 14px; }
    .form-field label {
      display: block; font-size: 13px; font-weight: 600;
      color: var(--mb-text-secondary); margin-bottom: 6px;
    }

    .tags-input-row { display: flex; gap: 8px; margin-bottom: 8px; }
    .tags-input-row ion-input { flex: 1; }
    .tags-list { display: flex; flex-wrap: wrap; gap: 6px; }

    .type-filter {
      display: flex; flex-wrap: wrap; gap: 6px;
      margin-bottom: 16px; padding: 4px 0;
    }

    .entries-list { display: flex; flex-direction: column; gap: 8px; }

    .entry-card { padding: 12px 14px; }
    .entry-card.disabled { opacity: 0.5; }

    .entry-header {
      display: flex; align-items: center; gap: 10px;
      cursor: pointer; flex-wrap: wrap;
    }

    .entry-title {
      font-weight: 600; font-size: 15px; color: var(--mb-text-primary);
      flex: 1; min-width: 0;
    }

    .entry-trigger-count {
      font-size: 12px; color: var(--mb-text-muted);
    }

    .entry-links {
      display: flex; align-items: center; gap: 3px;
      font-size: 12px; color: var(--mb-text-muted);
    }

    .entry-expanded { padding-top: 8px; }

    .entry-expanded-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--mb-border);
    }

    .entry-title-edit {
      font-weight: 700; font-size: 16px; color: var(--mb-primary);
    }

    .type-selector { display: flex; flex-wrap: wrap; gap: 6px; }

    .linked-items { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }

    .linked-item {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px; background: var(--mb-bg-elevated);
      border-radius: var(--mb-radius-sm); font-size: 13px;
      color: var(--mb-text-secondary);
    }

    .linked-item ion-icon { font-size: 16px; color: var(--mb-primary); }
    .linked-item span { flex: 1; }

    .advanced-section { margin-top: 16px; }

    .advanced-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px; margin-bottom: 12px;
    }

    .native-select {
      width: 100%; padding: 10px 14px;
      background: var(--mb-bg-input); color: var(--mb-text-primary);
      border: 1px solid var(--mb-border); border-radius: var(--mb-radius-md);
      font-size: 14px; appearance: auto;
    }

    .toggle-item {
      --background: var(--mb-bg-elevated);
      border-radius: var(--mb-radius-md);
      border: 1px solid var(--mb-border);
      margin-bottom: 8px;
    }

    .entry-footer {
      display: flex; justify-content: space-between;
      margin-top: 16px; padding-top: 12px;
      border-top: 1px solid var(--mb-border);
    }

    .save-btn {
      margin-top: 24px;
      --padding-top: 14px; --padding-bottom: 14px;
    }
  `],
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonInput,
    IonTextarea,
    IonBackButton,
    IonButtons,
    IonChip,
    IonLabel,
    IonItem,
    IonToggle
],
})
export class LorebookEditorPage implements OnInit {
  lorebook: Partial<Lorebook> = createDefaultLorebook();
  entries: LoreEntry[] = [];
  isEditing = false;
  expandedEntryId: string | null = null;
  filterType: LoreType | null = null;
  newTag = '';
  newTriggerWord = '';
  characters: Character[] = [];

  loreTypes = Object.values(LoreType);
  private lorebookId?: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private lorebookService: LorebookService,
    private characterService: CharacterService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
  ) {
    addIcons({
      saveOutline, addOutline, trashOutline, createOutline, closeOutline,
      eyeOutline, eyeOffOutline, arrowBackOutline, bookOutline, timeOutline,
      cloudOutline, peopleOutline, locationOutline, pawOutline, linkOutline
    });
  }

  async ngOnInit(): Promise<void> {
    this.characters = await this.characterService.getAllCharacters();
    this.lorebookId = this.route.snapshot.paramMap.get('id') || undefined;
    if (this.lorebookId) {
      this.isEditing = true;
      const lb = await this.lorebookService.getLorebook(this.lorebookId);
      if (lb) {
        this.lorebook = { ...lb };
        this.entries = lb.entries || [];
      }
    }
  }

  get filteredEntries(): LoreEntry[] {
    if (!this.filterType) return this.entries;
    return this.entries.filter(e => e.loreType === this.filterType);
  }

  getLoreTypeMeta(type: LoreType) {
    return LORE_TYPE_META[type];
  }

  // ── Tag Management ──
  addTag(): void {
    if (this.newTag.trim()) {
      if (!this.lorebook.tags) this.lorebook.tags = [];
      if (!this.lorebook.tags.includes(this.newTag.trim())) {
        this.lorebook.tags.push(this.newTag.trim());
      }
      this.newTag = '';
    }
  }

  removeTag(tag: string): void {
    this.lorebook.tags = this.lorebook.tags?.filter(t => t !== tag) || [];
  }

  // ── Entry Management ──
  async addEntry(): Promise<void> {
    if (!this.lorebookId) {
      // Save lorebook first if it's new
      await this.saveLorebook(true);
    }
    if (this.lorebookId) {
      const entry = await this.lorebookService.createEntry(createDefaultLoreEntry(this.lorebookId));
      this.entries.push(entry);
      this.expandedEntryId = entry.id;
    }
  }

  async saveEntry(entry: LoreEntry): Promise<void> {
    await this.lorebookService.updateEntry(entry.id, entry);
    const toast = await this.toastCtrl.create({ message: 'Entry saved!', duration: 1500, color: 'success' });
    await toast.present();
  }

  async toggleEntry(entry: LoreEntry, event: Event): Promise<void> {
    event.stopPropagation();
    entry.isEnabled = !entry.isEnabled;
    await this.lorebookService.toggleEntry(entry.id);
  }

  async confirmDeleteEntry(entry: LoreEntry): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Delete Entry',
      message: `Delete "${entry.title || 'Untitled'}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: async () => {
            await this.lorebookService.deleteEntry(entry.id);
            this.entries = this.entries.filter(e => e.id !== entry.id);
            this.expandedEntryId = null;
          },
        },
      ],
    });
    await alert.present();
  }

  // ── Trigger Words ──
  addTriggerWord(entry: LoreEntry): void {
    if (this.newTriggerWord.trim()) {
      if (!entry.triggerWords.includes(this.newTriggerWord.trim())) {
        entry.triggerWords.push(this.newTriggerWord.trim());
      }
      this.newTriggerWord = '';
    }
  }

  removeTriggerWord(entry: LoreEntry, word: string): void {
    entry.triggerWords = entry.triggerWords.filter(w => w !== word);
  }

  // ── Links ──
  getEntryTitle(id: string): string {
    return this.entries.find(e => e.id === id)?.title || 'Unknown Entry';
  }

  getCharacterName(id: string): string {
    return this.characters.find(c => c.id === id)?.name || 'Unknown Character';
  }

  async showLinkEntryPicker(entry: LoreEntry): Promise<void> {
    const availableEntries = this.entries.filter(e => e.id !== entry.id && !entry.linkedLoreEntryIds.includes(e.id));
    if (availableEntries.length === 0) {
      const toast = await this.toastCtrl.create({ message: 'No other entries to link', duration: 2000 });
      await toast.present();
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Link Entry',
      inputs: availableEntries.map(e => ({
        type: 'checkbox' as const,
        label: e.title || 'Untitled',
        value: e.id,
      })),
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Link',
          handler: (selectedIds: string[]) => {
            entry.linkedLoreEntryIds.push(...selectedIds);
          },
        },
      ],
    });
    await alert.present();
  }

  async showLinkCharacterPicker(entry: LoreEntry): Promise<void> {
    const available = this.characters.filter(c => !entry.linkedCharacterIds.includes(c.id));
    if (available.length === 0) {
      const toast = await this.toastCtrl.create({ message: 'No characters to link', duration: 2000 });
      await toast.present();
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Link Character',
      inputs: available.map(c => ({
        type: 'checkbox' as const,
        label: c.name,
        value: c.id,
      })),
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Link',
          handler: (selectedIds: string[]) => {
            entry.linkedCharacterIds.push(...selectedIds);
          },
        },
      ],
    });
    await alert.present();
  }

  unlinkEntry(entry: LoreEntry, linkedId: string): void {
    entry.linkedLoreEntryIds = entry.linkedLoreEntryIds.filter(id => id !== linkedId);
  }

  unlinkCharacter(entry: LoreEntry, charId: string): void {
    entry.linkedCharacterIds = entry.linkedCharacterIds.filter(id => id !== charId);
  }

  // ── Save Lorebook ──
  async saveLorebook(silent = false): Promise<void> {
    if (!this.lorebook.title?.trim()) {
      if (!silent) {
        const toast = await this.toastCtrl.create({ message: 'Lorebook title is required', duration: 2000, color: 'danger' });
        await toast.present();
      }
      return;
    }

    if (this.isEditing && this.lorebookId) {
      await this.lorebookService.updateLorebook(this.lorebookId, this.lorebook);
    } else {
      const created = await this.lorebookService.createLorebook(this.lorebook);
      this.lorebookId = created.id;
      this.isEditing = true;
    }

    if (!silent) {
      const toast = await this.toastCtrl.create({
        message: this.isEditing ? 'Lorebook updated!' : 'Lorebook created!',
        duration: 2000, color: 'success',
      });
      await toast.present();
      this.router.navigateByUrl('/lorebooks');
    }
  }
}
