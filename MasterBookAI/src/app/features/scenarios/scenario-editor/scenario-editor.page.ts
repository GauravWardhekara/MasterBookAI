import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent, IonIcon,
  IonInput, IonTextarea, IonToggle,
  ToastController, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  saveOutline, arrowBackOutline, cloudUploadOutline, imageOutline,
  sparklesOutline, closeOutline, documentTextOutline
} from 'ionicons/icons';
import { ScenarioService } from '../../../core/services/scenario.service';
import { Scenario, createDefaultScenario } from '../../../core/models/scenario.model';
import { GENRE_PRESETS } from '../../../core/data/genre-presets.data';

@Component({
  selector: 'app-scenario-editor',
  template: `
    <ion-content class="ion-padding">
      <div class="editor-shell mb-fade-in">
        <!-- Back -->
        <button class="back-btn" (click)="goBack()">
          <ion-icon name="arrow-back-outline"></ion-icon> Back
        </button>

        <!-- Title & Description -->
        <h1 class="page-title">Make a solo character</h1>
        <p class="page-subtitle">
          Define a single character for a one-on-one roleplay.
          Their greeting becomes the opening message, and
          players define their own self-insert before starting.
        </p>

        <!-- Tip Box -->
        <div class="tip-box">
          <span class="tip-icon">💡</span>
          <p class="tip-text">
            While this is possible to play as is, we
            strongly encourage you to explore the
            additional world building options once
            you're more comfortable, or find
            community worlds to play.
            Imagina shines best at complex worlds with multiple
            characters.
          </p>
        </div>

        <!-- Import Section -->
        <div class="import-section">
          <button class="import-link" (click)="toggleImportSection()">
            <ion-icon name="cloud-upload-outline"></ion-icon>
            Import from a character card (Character.AI / Tavern / Polybu)
          </button>

          @if (showImport) {
            <div class="import-body">
              <textarea
                class="import-textarea"
                [(ngModel)]="importJson"
                placeholder="Paste character card JSON here..."
                rows="4"
              ></textarea>
              <div class="import-actions">
                <button class="btn-import" (click)="importFromJson()">Import JSON</button>
                <button class="btn-upload" (click)="triggerCardUpload()">Upload card (PNG or JSON)</button>
              </div>
              <input
                type="file"
                #cardInput
                accept=".json,.png,image/png,application/json"
                (change)="onCardFileSelected($event)"
                style="display:none"
              />
            </div>
          }
        </div>

        <!-- ═══════════════ FORM FIELDS ═══════════════ -->

        <!-- Character Name -->
        <div class="form-field">
          <div class="field-header">
            <label>Character name <span class="required">*</span></label>
            <span class="char-count">{{ (scenario.characterName || '').length }}/100</span>
          </div>
          <p class="field-desc">Defaults to the character name. Give it a distinct title when you
            have several scenarios with the same character (like "Luna at
            the Café" and "Luna on the Night Train"), so they do not all
            show up named the same. The character keeps its own name for
            the story and images.</p>
          <ion-input
            [(ngModel)]="scenario.characterName"
            placeholder="e.g. Luna"
            class="mb-input"
            [maxlength]="100"
          ></ion-input>
        </div>

        <!-- Title -->
        <div class="form-field">
          <div class="field-header">
            <label>Title</label>
            <span class="char-count">{{ (scenario.characterTitle || '').length }}/100</span>
          </div>
          <p class="field-desc">Defaults to the character name. Give it a distinct title when you
            have several scenarios with the same character (like "Luna at
            the Café" and "Luna on the Night Train"), so they do not all
            show up named the same.</p>
          <ion-input
            [(ngModel)]="scenario.characterTitle"
            placeholder="e.g. Luna at the Café"
            class="mb-input"
            [maxlength]="100"
          ></ion-input>
        </div>

        <!-- Character Image -->
        <div class="form-field">
          <div class="field-header">
            <label>Character image</label>
          </div>
          <p class="field-desc">Enter a character name to upload or generate an image.</p>
          <div class="image-upload-area" (click)="triggerImageUpload()">
            @if (scenario.characterImage) {
              <div class="image-preview">
                <img [src]="scenario.characterImage" alt="Character" />
                <div class="image-overlay">
                  <ion-icon name="image-outline"></ion-icon>
                  <span>Change Image</span>
                </div>
              </div>
            }
            @if (!scenario.characterImage) {
              <div class="image-placeholder">
                <ion-icon name="image-outline"></ion-icon>
                <span>Click to upload character image</span>
              </div>
            }
          </div>
          <input
            type="file"
            #imageInput
            accept="image/*"
            (change)="onImageSelected($event)"
            style="display:none"
          />
        </div>

        <!-- Character Intro -->
        <div class="form-field">
          <div class="field-header">
            <label>Character intro</label>
            <span class="char-count">{{ (scenario.characterIntro || '').length }}/500</span>
          </div>
          <p class="field-desc">Shown on the character's card. Describe the character, and the
            setting if you like.</p>
          <ion-textarea
            [(ngModel)]="scenario.characterIntro"
            placeholder="A brief introduction to the character..."
            rows="3"
            class="mb-input"
            [maxlength]="500"
          ></ion-textarea>
        </div>

        <!-- Personality & Background -->
        <div class="form-field">
          <div class="field-header">
            <label>Personality &amp; background</label>
            <span class="char-count">{{ (scenario.personalityBackground || '').length }}/4000</span>
          </div>
          <p class="field-desc">Who they are: personality, voice, backstory, how they treat the
            player.</p>
          <ion-textarea
            [(ngModel)]="scenario.personalityBackground"
            placeholder="Describe the character's personality, voice, and backstory..."
            rows="5"
            class="mb-input"
            [maxlength]="4000"
          ></ion-textarea>
        </div>

        <!-- Appearance -->
        <div class="form-field">
          <div class="field-header">
            <label>Appearance</label>
            <span class="char-count">{{ (scenario.appearance || '').length }}/2000</span>
          </div>
          <p class="field-desc">What the character looks like. Plain English is fine; if you know
            Stable Diffusion, booru tags work too and will be recognized
            when generating images.</p>
          <ion-textarea
            [(ngModel)]="scenario.appearance"
            placeholder="Describe the character's physical appearance..."
            rows="4"
            class="mb-input"
            [maxlength]="2000"
          ></ion-textarea>
        </div>

        <!-- Greeting (first message) -->
        <div class="form-field">
          <div class="field-header">
            <label>Greeting (first message)</label>
            <span class="char-count">{{ (scenario.greeting || '').length }}/4000</span>
          </div>
          <p class="field-desc">The character's opening message. Shown verbatim as the first
            turn.</p>
          <ion-textarea
            [(ngModel)]="scenario.greeting"
            placeholder="The character's first message to the player..."
            rows="5"
            class="mb-input"
            [maxlength]="4000"
          ></ion-textarea>
        </div>

        <!-- Scenario -->
        <div class="form-field">
          <div class="field-header">
            <label>Scenario</label>
            <span class="char-count">{{ (scenario.scenarioText || '').length }}/2000</span>
          </div>
          <p class="field-desc">What is happening as the story opens, and what is already true.
            This is treated as already happening from the first turn, not
            something the characters decide on or build up to later. Include
            any premise the story should take for granted.</p>
          <ion-textarea
            [(ngModel)]="scenario.scenarioText"
            placeholder="e.g. She is your roommate and just found out she is pregnant with your child. The story opens on her breaking the news, and she is keeping it. (In this world, her species is fertile with anyone, treated as ordinary fact.)"
            rows="5"
            class="mb-input"
            [maxlength]="2000"
          ></ion-textarea>
        </div>

        <!-- Example Dialogue (optional) -->
        <div class="form-field">
          <div class="field-header">
            <label>Example dialogue (optional)</label>
            <span class="char-count">{{ (scenario.exampleDialogue || '').length }}/1000</span>
          </div>
          <p class="field-desc">A few lines the character would actually say, one per line. Nails
            their voice (cadence, vocabulary, attitude) better than prose.
            The AI matches the style without copying the lines.</p>
          <ion-textarea
            [(ngModel)]="scenario.exampleDialogue"
            [placeholder]="exampleDialoguePlaceholder"
            rows="5"
            class="mb-input"
            [maxlength]="1000"
          ></ion-textarea>
        </div>

        <!-- Genre / Role -->
        <div class="form-field">
          <div class="field-header">
            <label>Genre</label>
          </div>
          <p class="field-desc">Select the primary genre for this scenario to guide the AI's narrative style.</p>
          <select [(ngModel)]="scenario.genre" class="mb-select" (change)="onGenreChange()">
            <option value="" disabled>Select a genre...</option>
            @for (genre of genres; track genre.id) {
              <option [value]="genre.id">{{ genre.name }}</option>
            }
          </select>
        </div>

        @if (selectedGenreObj) {
          <div class="form-field">
            <div class="field-header">
              <label>Your Role</label>
            </div>
            <p class="field-desc">Select a preset role for yourself, or leave it blank to define your own.</p>
            <select [(ngModel)]="scenario.userRole" class="mb-select">
              <option value="">Custom Role...</option>
              @for (role of selectedGenreObj.roles; track role) {
                <option [value]="role">{{ role }}</option>
              }
            </select>
          </div>
        }

        <!-- ── RPG Mechanics ── -->
        <div class="form-field">
          <div class="field-header">
            <label>Enable RPG Mechanics</label>
            <ion-toggle [(ngModel)]="scenario.isRpgModeEnabled"></ion-toggle>
          </div>
          <p class="field-desc">When enabled, unlocks dice rolls, stats, inventory, and structured RPG elements for this scenario.</p>
        </div>

        @if (scenario.isRpgModeEnabled) {
          <div class="form-field">
            <div class="field-header">
              <label>RPG System</label>
            </div>
            <p class="field-desc">Select the rule system to use. This determines the available stats and mechanics.</p>
            <select [(ngModel)]="scenario.rpgSystem" class="mb-select">
              <option value="D&D">Standard D&D</option>
              <option value="Cultivation">Cultivation (Xianxia)</option>
              <option value="None">None / Freeform</option>
            </select>
          </div>
        }

        <!-- NSFW Toggle -->
        <div class="nsfw-section">
          <div class="nsfw-toggle-row">
            <ion-toggle [(ngModel)]="scenario.isNsfw" class="nsfw-toggle"></ion-toggle>
            <span class="nsfw-label">NSFW character</span>
          </div>
          <p class="nsfw-desc">Check this if your character is intrinsically NSFW. Even if you
            leave it off, players can still enable NSFW chats with it. Marking
            it NSFW only hides the character from logged-out visitors.</p>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button class="btn-cancel" (click)="goBack()">Cancel</button>
          <button class="btn-create" (click)="save()">
            <ion-icon name="sparkles-outline"></ion-icon>
            {{ isEditing ? 'Update character' : 'Create character' }}
          </button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    /* ── Shell ── */
    .editor-shell {
      max-width: 560px;
      margin: 0 auto;
      padding-bottom: 40px;
    }

    /* ── Back Button ── */
    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: none;
      color: var(--mb-secondary);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      padding: 8px 0;
      margin-bottom: 16px;
      transition: color var(--mb-transition-fast);
    }

    .back-btn:hover { color: var(--mb-primary-light); }

    .back-btn ion-icon { font-size: 18px; }

    /* ── Page Title ── */
    .page-title {
      font-size: 26px;
      font-weight: 800;
      color: var(--mb-text-primary);
      margin: 0 0 10px 0;
      letter-spacing: -0.5px;
    }

    .page-subtitle {
      font-size: 14px;
      color: var(--mb-text-muted);
      line-height: 1.55;
      margin: 0 0 20px 0;
    }

    /* ── Tip Box ── */
    .tip-box {
      display: flex;
      gap: 14px;
      padding: 18px;
      background: rgba(245, 158, 11, 0.06);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: var(--mb-radius-lg);
      margin-bottom: 28px;
    }

    .tip-icon {
      font-size: 22px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .tip-text {
      font-size: 13.5px;
      color: var(--mb-text-secondary);
      line-height: 1.6;
      margin: 0;
    }

    /* ── Import Section ── */
    .import-section {
      margin-bottom: 28px;
    }

    .import-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: none;
      border: none;
      color: var(--mb-secondary);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      padding: 0;
      margin-bottom: 14px;
      transition: color var(--mb-transition-fast);
    }

    .import-link:hover { color: var(--mb-primary-light); }

    .import-link ion-icon { font-size: 16px; }

    .import-body {
      animation: mb-fade-in 0.2s ease forwards;
    }

    .import-textarea {
      width: 100%;
      background: var(--mb-bg-input);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius-md);
      color: var(--mb-text-primary);
      font-family: 'Inter', monospace;
      font-size: 13px;
      padding: 12px 14px;
      resize: vertical;
      min-height: 80px;
      outline: none;
      transition: border-color var(--mb-transition-fast);
      box-sizing: border-box;
    }

    .import-textarea::placeholder { color: var(--mb-text-muted); }
    .import-textarea:focus {
      border-color: var(--mb-border-focus);
      box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.12);
    }

    .import-actions {
      display: flex;
      gap: 10px;
      margin-top: 12px;
    }

    .btn-import, .btn-upload {
      padding: 8px 18px;
      border-radius: var(--mb-radius-md);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--mb-transition-fast);
      border: none;
    }

    .btn-import {
      background: var(--mb-bg-elevated);
      color: var(--mb-text-secondary);
      border: 1px solid var(--mb-border);
    }

    .btn-import:hover {
      background: var(--mb-bg-card-hover);
      border-color: var(--mb-border-light);
      color: var(--mb-text-primary);
    }

    .btn-upload {
      background: linear-gradient(135deg, var(--mb-secondary), #3b82f6);
      color: white;
    }

    .btn-upload:hover {
      box-shadow: 0 4px 14px rgba(96, 165, 250, 0.35);
      transform: translateY(-1px);
    }

    /* ── Form Fields ── */
    .form-field {
      margin-bottom: 22px;
    }

    .field-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .field-header label {
      font-size: 14px;
      font-weight: 600;
      color: var(--mb-text-primary);
    }

    .required {
      color: var(--mb-danger);
      margin-left: 2px;
    }

    .char-count {
      font-size: 12px;
      color: var(--mb-text-muted);
      font-weight: 500;
      font-variant-numeric: tabular-nums;
    }

    .field-desc {
      font-size: 12.5px;
      color: var(--mb-text-muted);
      line-height: 1.5;
      margin: 2px 0 8px 0;
    }

    /* ── Image Upload ── */
    .image-upload-area {
      cursor: pointer;
      border-radius: var(--mb-radius-md);
      overflow: hidden;
      border: 1px dashed var(--mb-border);
      transition: border-color var(--mb-transition-fast);
    }

    .image-upload-area:hover {
      border-color: var(--mb-primary);
    }

    .image-preview {
      position: relative;
      height: 180px;
    }

    .image-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .image-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 200ms;
      color: white;
      gap: 6px;
    }

    .image-preview:hover .image-overlay { opacity: 1; }

    .image-overlay ion-icon { font-size: 28px; }
    .image-overlay span { font-size: 13px; font-weight: 500; }

    .image-placeholder {
      height: 120px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--mb-bg-input);
      color: var(--mb-text-muted);
      gap: 8px;
    }

    .image-placeholder ion-icon { font-size: 30px; }
    .image-placeholder span { font-size: 13px; }

    /* ── NSFW Section ── */
    .nsfw-section {
      margin: 28px 0;
      padding: 18px;
      background: var(--mb-bg-card);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius-lg);
    }

    .nsfw-toggle-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .nsfw-label {
      font-size: 15px;
      font-weight: 600;
      color: var(--mb-text-primary);
    }

    .nsfw-desc {
      font-size: 12.5px;
      color: var(--mb-text-muted);
      line-height: 1.5;
      margin: 10px 0 0 0;
    }

    /* ── Action Buttons ── */
    .action-buttons {
      display: flex;
      gap: 12px;
      margin-top: 8px;
      padding-bottom: 24px;
    }

    .btn-cancel {
      padding: 12px 28px;
      border-radius: var(--mb-radius-md);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      background: var(--mb-bg-elevated);
      color: var(--mb-text-primary);
      border: 1px solid var(--mb-border);
      transition: all var(--mb-transition-fast);
    }

    .btn-cancel:hover {
      background: var(--mb-bg-card-hover);
      border-color: var(--mb-border-light);
    }

    .btn-create {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 28px;
      border-radius: var(--mb-radius-md);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      background: linear-gradient(135deg, var(--mb-primary), var(--mb-primary-dark));
      color: white;
      border: none;
      box-shadow: 0 4px 14px rgba(167, 139, 250, 0.3);
      transition: all var(--mb-transition-fast);
    }

    .btn-create:hover {
      box-shadow: 0 6px 22px rgba(167, 139, 250, 0.45);
      transform: translateY(-1px);
    }

    .btn-create ion-icon { font-size: 16px; }

    /* ── Ionic Overrides ── */
    ion-input.mb-input, ion-textarea.mb-input {
      margin-top: 0;
    }
    
    .mb-select {
      width: 100%; padding: 12px 14px;
      background: var(--mb-bg-input); color: var(--mb-text-primary);
      border: 1px solid var(--mb-border); border-radius: var(--mb-radius-md);
      font-size: 14px; outline: none; margin-top: 4px;
    }
    .mb-select:focus { border-color: var(--mb-border-focus); }
  `],
  imports: [
    CommonModule, FormsModule,
    IonContent, IonIcon,
    IonInput, IonTextarea, IonToggle
  ],
})
export class ScenarioEditorPage implements OnInit {
  scenario: Partial<Scenario> = createDefaultScenario();
  isEditing = false;
  showImport = false;
  importJson = '';
  
  genres = GENRE_PRESETS;

  get selectedGenreObj() {
     return this.genres.find(g => g.id === this.scenario.genre);
  }

  exampleDialoguePlaceholder =
    `"You really think you can just walk in here and ask me that?"\n*leans back, smirking* "Fine. But you owe me, and I always collect."\n"Don't. Don't you dare say her name to me."`;

  private scenarioId?: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private scenarioService: ScenarioService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
  ) {
    addIcons({
      saveOutline, arrowBackOutline, cloudUploadOutline, imageOutline,
      sparklesOutline, closeOutline, documentTextOutline
    });
  }

  async ngOnInit(): Promise<void> {
    this.scenarioId = this.route.snapshot.paramMap.get('id') || undefined;
    if (this.scenarioId) {
      this.isEditing = true;
      const sc = await this.scenarioService.getScenario(this.scenarioId);
      if (sc) {
        this.scenario = { ...sc };
      }
    }
  }

  goBack(): void {
    this.router.navigateByUrl('/scenarios');
  }

  toggleImportSection(): void {
    this.showImport = !this.showImport;
  }
  
  onGenreChange(): void {
     // Optional: reset role if genre changes
     this.scenario.userRole = '';
  }

  // ── Image Upload ──
  triggerImageUpload(): void {
    const input = document.querySelector('#imageInput, input[accept="image/*"]') as HTMLInputElement;
    input?.click();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => { this.scenario.characterImage = reader.result as string; };
      reader.readAsDataURL(file);
    }
  }

  // ── Card Import ──
  triggerCardUpload(): void {
    const input = document.querySelector('input[accept*=".json"]') as HTMLInputElement;
    input?.click();
  }

  onCardFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const json = JSON.parse(reader.result as string);
          this.applyCharacterCard(json);
          this.showToast('Character card imported from JSON!', 'success');
        } catch {
          this.showToast('Invalid JSON file', 'danger');
        }
      };
      reader.readAsText(file);
    } else if (file.type === 'image/png' || file.name.endsWith('.png')) {
      // Read as ArrayBuffer to extract Tavern card tEXt chunk
      const bufferReader = new FileReader();
      bufferReader.onload = () => {
        const buffer = bufferReader.result as ArrayBuffer;
        const tavernData = this.extractTavernCardFromPng(buffer);

        // Also set the image
        const imgReader = new FileReader();
        imgReader.onload = () => {
          this.scenario.characterImage = imgReader.result as string;
        };
        imgReader.readAsDataURL(file);

        if (tavernData) {
          try {
            const json = JSON.parse(tavernData);
            this.applyCharacterCard(json);
            this.showToast('Tavern card imported successfully!', 'success');
          } catch {
            this.showToast('Image loaded but could not parse embedded card data.', 'warning');
          }
        } else {
          this.showToast('Image loaded. No embedded Tavern card data found.', 'warning');
        }
      };
      bufferReader.readAsArrayBuffer(file);
    }
  }

  /**
   * Extract character data from Tavern card PNG tEXt chunk.
   * Tavern cards store base64-encoded JSON in a tEXt chunk with keyword "chara".
   */
  private extractTavernCardFromPng(buffer: ArrayBuffer): string | null {
    const data = new Uint8Array(buffer);
    // PNG signature is 8 bytes, then chunks follow
    let offset = 8;

    while (offset < data.length) {
      // Each chunk: 4 bytes length, 4 bytes type, [length] bytes data, 4 bytes CRC
      if (offset + 8 > data.length) break;

      const chunkLength = (data[offset] << 24) | (data[offset + 1] << 16) |
                          (data[offset + 2] << 8) | data[offset + 3];
      const chunkType = String.fromCharCode(
        data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]
      );

      if (chunkType === 'tEXt') {
        const chunkData = data.slice(offset + 8, offset + 8 + chunkLength);
        // tEXt format: keyword (null-terminated) + text
        const nullIndex = chunkData.indexOf(0);
        if (nullIndex >= 0) {
          const keyword = String.fromCharCode(...chunkData.slice(0, nullIndex));
          if (keyword === 'chara') {
            const base64Text = String.fromCharCode(...chunkData.slice(nullIndex + 1));
            try {
              return atob(base64Text);
            } catch {
              return null;
            }
          }
        }
      }

      // Move to next chunk: 4 (length) + 4 (type) + chunkLength (data) + 4 (CRC)
      offset += 12 + chunkLength;

      // Stop at IEND
      if (chunkType === 'IEND') break;
    }

    return null;
  }

  importFromJson(): void {
    if (!this.importJson.trim()) {
      this.showToast('Please paste character card JSON first', 'warning');
      return;
    }
    try {
      const json = JSON.parse(this.importJson);
      this.applyCharacterCard(json);
      this.showToast('Character card imported!', 'success');
      this.importJson = '';
      this.showImport = false;
    } catch {
      this.showToast('Invalid JSON format', 'danger');
    }
  }

  /**
   * Parse Character.AI / TavernAI / Polybu V2 character card JSON and fill fields.
   */
  private applyCharacterCard(json: any): void {
    // TavernAI V2 format (spec.chara)
    const data = json.data || json;

    if (data.name) this.scenario.characterName = (data.name as string).substring(0, 100);
    if (data.description) this.scenario.personalityBackground = (data.description as string).substring(0, 4000);
    if (data.personality) {
      // Append personality to background if description already exists
      const existing = this.scenario.personalityBackground || '';
      const personality = data.personality as string;
      this.scenario.personalityBackground = (existing ? existing + '\n\n' + personality : personality).substring(0, 4000);
    }
    if (data.first_mes || data.greeting) {
      this.scenario.greeting = ((data.first_mes || data.greeting) as string).substring(0, 4000);
    }
    if (data.scenario) this.scenario.scenarioText = (data.scenario as string).substring(0, 2000);
    if (data.mes_example || data.example_dialogue) {
      this.scenario.exampleDialogue = ((data.mes_example || data.example_dialogue) as string).substring(0, 1000);
    }
    if (data.creator_notes || data.char_intro) {
      this.scenario.characterIntro = ((data.creator_notes || data.char_intro) as string).substring(0, 500);
    }
    // Title
    if (data.post_history_instructions) {
      this.scenario.specialInstructions = data.post_history_instructions;
    }
    // Also set the scenario title from character name
    if (data.name && !this.scenario.title) {
      this.scenario.title = data.name;
    }
  }

  // ── Save ──
  async save(): Promise<void> {
    if (!this.scenario.characterName?.trim()) {
      this.showToast('Character name is required', 'danger');
      return;
    }

    // Auto-set title from character name if empty
    if (!this.scenario.title?.trim()) {
      this.scenario.title = this.scenario.characterName;
    }

    if (this.isEditing && this.scenarioId) {
      await this.scenarioService.updateScenario(this.scenarioId, this.scenario);
    } else {
      await this.scenarioService.createScenario(this.scenario);
    }

    this.showToast(
      this.isEditing ? 'Character updated!' : 'Character created!',
      'success'
    );
    this.router.navigateByUrl('/scenarios');
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 2500, color });
    await toast.present();
  }
}
