import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonButtons, IonInput, IonChip,
  AlertController, ToastController, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, imageOutline, sparklesOutline, copyOutline,
  trashOutline, addOutline, closeOutline, settingsOutline,
  downloadOutline, refreshOutline, checkmarkOutline,
  chevronDownOutline, chevronUpOutline, colorPaletteOutline
} from 'ionicons/icons';
import { ImageProviderService, ImageGenParams, TagExtractionResult } from '../../core/services/image-provider.service';
import { ConnectionService } from '../../core/services/connection.service';
import { ChatSessionService } from '../../core/services/chat-session.service';
import { ImageGenSessionConfig, createDefaultImageGenSessionConfig, GeneratedImage } from '../../core/models/image-gen-config.model';
import { ImageGenConfig } from '../../core/models/connection-profile.model';
import { Message } from '../../core/models/chat-session.model';

@Component({
  selector: 'app-image-gen',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="dismiss()">
            <ion-icon slot="icon-only" name="arrow-back-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>
          <span class="ig-title">
            <ion-icon name="image-outline" class="title-icon"></ion-icon>
            Generate Image
          </span>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="ig-container mb-fade-in">

        <!-- No Provider Warning -->
        <div *ngIf="!activeConfig && !isLoading" class="no-provider-banner mb-fade-in">
          <ion-icon name="color-palette-outline"></ion-icon>
          <span>No image provider configured.</span>
          <ion-button fill="clear" size="small" (click)="showProviderSetup()">
            Set Up Provider
          </ion-button>
        </div>

        <!-- Step 1: Scene Description -->
        <div class="ig-section" *ngIf="step === 'extract'">
          <div class="ig-section-header">
            <div class="step-badge">1</div>
            <span>Extract Scene Tags</span>
          </div>
          <p class="ig-section-desc">Analyze recent messages to auto-generate image tags</p>

          <div class="extract-actions">
            <ion-button class="mb-btn-primary" (click)="extractTags()" [disabled]="isExtracting">
              <ion-icon slot="start" name="sparkles-outline"></ion-icon>
              {{ isExtracting ? 'Extracting...' : 'Auto-Extract Tags' }}
            </ion-button>
            <ion-button class="mb-btn-secondary" (click)="skipToManual()">
              Write Tags Manually
            </ion-button>
          </div>

          <div *ngIf="sceneDescription" class="scene-description mb-fade-in">
            <ion-icon name="sparkles-outline"></ion-icon>
            <span>{{ sceneDescription }}</span>
          </div>
        </div>

        <!-- Step 2: Edit Tags -->
        <div class="ig-section" *ngIf="step === 'edit'">
          <div class="ig-section-header">
            <div class="step-badge">2</div>
            <span>Edit Tags</span>
          </div>

          <!-- Positive Tags -->
          <div class="tag-section">
            <label class="tag-label positive-label">
              <ion-icon name="checkmark-outline"></ion-icon> Positive Tags
            </label>
            <div class="tag-chips">
              <ion-chip *ngFor="let tag of positiveTags; let i = index"
                        class="tag-chip positive"
                        (click)="editTag('positive', i)">
                {{ tag }}
                <ion-icon name="close-outline" (click)="removeTag('positive', i, $event)"></ion-icon>
              </ion-chip>
              <ion-chip class="tag-chip add-chip" (click)="addTag('positive')">
                <ion-icon name="add-outline"></ion-icon> Add
              </ion-chip>
            </div>
          </div>

          <!-- Negative Tags -->
          <div class="tag-section">
            <label class="tag-label negative-label">
              <ion-icon name="close-outline"></ion-icon> Negative Tags
            </label>
            <div class="tag-chips">
              <ion-chip *ngFor="let tag of negativeTags; let i = index"
                        class="tag-chip negative"
                        (click)="editTag('negative', i)">
                {{ tag }}
                <ion-icon name="close-outline" (click)="removeTag('negative', i, $event)"></ion-icon>
              </ion-chip>
              <ion-chip class="tag-chip add-chip" (click)="addTag('negative')">
                <ion-icon name="add-outline"></ion-icon> Add
              </ion-chip>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="quick-actions">
            <ion-button fill="clear" size="small" (click)="copyTagsToClipboard()">
              <ion-icon slot="start" name="copy-outline"></ion-icon>
              Copy Tags
            </ion-button>
            <ion-button fill="clear" size="small" (click)="reextractTags()">
              <ion-icon slot="start" name="refresh-outline"></ion-icon>
              Re-extract
            </ion-button>
          </div>
        </div>

        <!-- Step 3: Generation Settings -->
        <div class="ig-section" *ngIf="step === 'edit'">
          <div class="ig-section-header">
            <div class="step-badge">3</div>
            <span>Settings</span>
            <ion-button fill="clear" size="small" (click)="showAdvanced = !showAdvanced">
              <ion-icon slot="icon-only" [name]="showAdvanced ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
            </ion-button>
          </div>

          <div class="settings-grid">
            <div class="setting-item">
              <label>Resolution</label>
              <select [(ngModel)]="selectedResolution" (ngModelChange)="onResolutionChange()" class="native-select">
                <option value="512x512">512 × 512</option>
                <option value="512x768">512 × 768</option>
                <option value="768x512">768 × 512</option>
                <option value="768x768">768 × 768</option>
                <option value="1024x1024">1024 × 1024</option>
                <option value="1024x1792">1024 × 1792</option>
                <option value="1792x1024">1792 × 1024</option>
              </select>
            </div>
            <div class="setting-item">
              <label>Count</label>
              <select [(ngModel)]="sessionConfig.imageCount" class="native-select">
                <option [ngValue]="1">1 image</option>
                <option [ngValue]="2">2 images</option>
                <option [ngValue]="4">4 images</option>
              </select>
            </div>
          </div>

          <div class="settings-grid" *ngIf="showAdvanced">
            <div class="setting-item">
              <label>Steps</label>
              <ion-input type="number" [(ngModel)]="sessionConfig.steps" min="1" max="150" class="mb-input compact"></ion-input>
            </div>
            <div class="setting-item">
              <label>CFG Scale</label>
              <ion-input type="number" [(ngModel)]="sessionConfig.cfgScale" min="1" max="30" step="0.5" class="mb-input compact"></ion-input>
            </div>
            <div class="setting-item full-width" *ngIf="activeConfig?.providerType !== 'openai'">
              <label>Model / Checkpoint</label>
              <ion-input [(ngModel)]="sessionConfig.lastModel" placeholder="e.g. sd_xl_base_1.0" class="mb-input compact"></ion-input>
            </div>
          </div>

          <!-- Provider Info -->
          <div class="provider-info" *ngIf="activeConfig">
            <ion-icon [name]="getProviderIcon()"></ion-icon>
            <span>{{ getProviderName() }}</span>
            <span class="provider-url" *ngIf="activeConfig.endpointUrl">{{ activeConfig.endpointUrl }}</span>
          </div>
        </div>

        <!-- Generate Button -->
        <div class="generate-section" *ngIf="step === 'edit'">
          <ion-button class="mb-btn-primary generate-btn"
                      [disabled]="positiveTags.length === 0 || isGenerating"
                      (click)="generateImages()">
            <ion-icon slot="start" name="sparkles-outline"></ion-icon>
            {{ isGenerating ? 'Generating...' : (activeConfig?.providerType === 'copy-tags' ? 'Copy Tags to Clipboard' : 'Generate Image') }}
          </ion-button>
        </div>

        <!-- Step 4: Results -->
        <div class="ig-section" *ngIf="generatedImages.length > 0">
          <div class="ig-section-header">
            <div class="step-badge done">✓</div>
            <span>Generated Images</span>
          </div>

          <div class="image-results">
            <div *ngFor="let img of generatedImages; let i = index"
                 class="image-result-card mb-glass-card mb-fade-in"
                 [style.animation-delay]="(i * 0.1) + 's'">
              <img [src]="img.imageUrl" alt="Generated image" class="result-image" />
              <div class="result-actions">
                <ion-button fill="clear" size="small" (click)="downloadImage(img)">
                  <ion-icon slot="icon-only" name="download-outline"></ion-icon>
                </ion-button>
                <ion-button fill="clear" size="small" (click)="attachToMessage(img)">
                  <ion-icon slot="icon-only" name="checkmark-outline"></ion-icon>
                </ion-button>
              </div>
              <div class="result-meta">
                {{ img.width }}×{{ img.height }} · {{ img.steps }} steps · CFG {{ img.cfgScale }}
              </div>
            </div>
          </div>
        </div>

        <!-- Tags Copied Confirmation (for copy-tags mode) -->
        <div *ngIf="tagsCopied" class="tags-copied-banner mb-fade-in">
          <ion-icon name="checkmark-outline"></ion-icon>
          Tags copied to clipboard! Paste them into your preferred image generation tool.
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .ig-container { max-width: 600px; margin: 0 auto; }

    .ig-title {
      display: flex; align-items: center; gap: 8px;
      font-weight: 700;
    }
    .title-icon { color: var(--mb-accent); font-size: 20px; }

    .no-provider-banner {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px; margin-bottom: 16px;
      border-radius: var(--mb-radius-md);
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.2);
      font-size: 13px; color: var(--mb-text-secondary);
    }
    .no-provider-banner ion-icon { color: var(--mb-accent); font-size: 20px; }

    .ig-section {
      background: var(--mb-bg-card);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius-lg);
      padding: 16px 18px;
      margin-bottom: 14px;
    }

    .ig-section-header {
      display: flex; align-items: center; gap: 10px;
      font-weight: 700; font-size: 15px;
      color: var(--mb-text-primary);
      margin-bottom: 8px;
    }

    .step-badge {
      width: 24px; height: 24px;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, var(--mb-primary), var(--mb-primary-dark));
      color: white; font-size: 12px; font-weight: 800;
      border-radius: 50%;
    }
    .step-badge.done {
      background: linear-gradient(135deg, var(--mb-success), #059669);
    }

    .ig-section-desc {
      font-size: 13px; color: var(--mb-text-muted);
      margin: 0 0 12px 34px;
    }

    .extract-actions {
      display: flex; flex-direction: column; gap: 8px;
      align-items: center; padding: 12px 0;
    }

    .mb-btn-secondary {
      --background: var(--mb-bg-elevated);
      --border-radius: var(--mb-radius-md);
      --color: var(--mb-text-primary);
      border: 1px solid var(--mb-border);
    }

    .scene-description {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 14px; margin-top: 12px;
      background: rgba(167, 139, 250, 0.06);
      border: 1px solid rgba(167, 139, 250, 0.15);
      border-radius: var(--mb-radius-md);
      font-size: 13px; color: var(--mb-text-secondary);
      font-style: italic;
    }
    .scene-description ion-icon { color: var(--mb-primary); font-size: 16px; flex-shrink: 0; margin-top: 2px; }

    /* Tags */
    .tag-section { margin-bottom: 14px; }

    .tag-label {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .tag-label ion-icon { font-size: 14px; }
    .positive-label { color: var(--mb-success); }
    .negative-label { color: var(--mb-danger); }

    .tag-chips {
      display: flex; flex-wrap: wrap; gap: 6px;
    }

    .tag-chip {
      font-size: 12px; height: auto;
      padding: 3px 10px;
      border-radius: var(--mb-radius-full);
      cursor: pointer;
      transition: all 150ms ease;
    }
    .tag-chip:hover { transform: translateY(-1px); }

    .tag-chip.positive {
      background: rgba(52, 211, 153, 0.1);
      color: var(--mb-success);
      border: 1px solid rgba(52, 211, 153, 0.3);
    }
    .tag-chip.negative {
      background: rgba(248, 113, 113, 0.1);
      color: var(--mb-danger);
      border: 1px solid rgba(248, 113, 113, 0.3);
    }
    .tag-chip ion-icon {
      font-size: 12px; margin-left: 4px;
      cursor: pointer; opacity: 0.6;
    }
    .tag-chip ion-icon:hover { opacity: 1; }

    .add-chip {
      background: var(--mb-bg-elevated);
      color: var(--mb-text-muted);
      border: 1px dashed var(--mb-border);
    }
    .add-chip ion-icon { font-size: 14px; margin: 0; }

    .quick-actions {
      display: flex; gap: 4px; justify-content: flex-end;
    }

    /* Settings */
    .settings-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 10px; margin-bottom: 10px;
    }
    .setting-item { display: flex; flex-direction: column; gap: 4px; }
    .setting-item label {
      font-size: 11px; font-weight: 600;
      color: var(--mb-text-muted); text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .setting-item.full-width { grid-column: 1 / -1; }

    .native-select {
      width: 100%; padding: 8px 10px;
      background: var(--mb-bg-input); color: var(--mb-text-primary);
      border: 1px solid var(--mb-border); border-radius: var(--mb-radius-sm);
      font-size: 13px; appearance: auto;
    }

    .compact { --padding-start: 10px; --padding-end: 10px; font-size: 13px; }

    .provider-info {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: var(--mb-text-muted);
      padding: 6px 10px; margin-top: 8px;
      background: var(--mb-bg-elevated);
      border-radius: var(--mb-radius-sm);
    }
    .provider-info ion-icon { color: var(--mb-primary); font-size: 16px; }
    .provider-url { font-family: monospace; font-size: 11px; color: var(--mb-primary); margin-left: auto; }

    /* Generate */
    .generate-section {
      text-align: center; margin: 8px 0 16px;
    }
    .generate-btn {
      --padding-start: 32px; --padding-end: 32px;
      font-weight: 700; font-size: 15px;
    }

    /* Results */
    .image-results {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }

    .image-result-card {
      overflow: hidden; padding: 0; cursor: pointer;
    }

    .result-image {
      width: 100%; aspect-ratio: 1; object-fit: cover;
      display: block;
    }

    .result-actions {
      display: flex; justify-content: center; gap: 4px;
      padding: 6px 8px;
      border-top: 1px solid var(--mb-border);
    }

    .result-meta {
      text-align: center; font-size: 10px;
      color: var(--mb-text-muted); padding: 0 8px 8px;
    }

    .tags-copied-banner {
      display: flex; align-items: center; gap: 8px;
      padding: 14px 16px;
      background: rgba(52, 211, 153, 0.08);
      border: 1px solid rgba(52, 211, 153, 0.3);
      border-radius: var(--mb-radius-md);
      font-size: 14px; color: var(--mb-success);
      font-weight: 500;
    }
    .tags-copied-banner ion-icon { font-size: 20px; }

    @media (max-width: 400px) {
      .settings-grid { grid-template-columns: 1fr; }
      .image-results { grid-template-columns: 1fr; }
    }
  `],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonButtons, IonInput, IonChip
  ],
})
export class ImageGenPage implements OnInit {
  // Input props — set by parent when used as a modal
  @Input() messages: Message[] = [];
  @Input() sessionId?: string;
  @Input() linkedMessageId?: string;

  step: 'extract' | 'edit' = 'extract';
  isLoading = true;
  isExtracting = false;
  isGenerating = false;
  showAdvanced = false;
  tagsCopied = false;

  activeConfig?: ImageGenConfig;
  sessionConfig: ImageGenSessionConfig = createDefaultImageGenSessionConfig();
  selectedResolution = '512x512';

  positiveTags: string[] = [];
  negativeTags: string[] = [];
  sceneDescription = '';
  generatedImages: GeneratedImage[] = [];

  constructor(
    private imageProvider: ImageProviderService,
    private connectionService: ConnectionService,
    private chatSessionService: ChatSessionService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private router: Router,
  ) {
    addIcons({
      arrowBackOutline, imageOutline, sparklesOutline, copyOutline,
      trashOutline, addOutline, closeOutline, settingsOutline,
      downloadOutline, refreshOutline, checkmarkOutline,
      chevronDownOutline, chevronUpOutline, colorPaletteOutline
    });
  }

  async ngOnInit(): Promise<void> {
    this.isLoading = true;

    // Load config
    this.activeConfig = await this.imageProvider.getDefaultConfig();
    this.sessionConfig = this.imageProvider.getDefaultSessionConfig();
    this.selectedResolution = `${this.sessionConfig.width}x${this.sessionConfig.height}`;

    // Apply negative prompt defaults
    if (this.activeConfig?.negativePromptDefaults) {
      this.negativeTags = this.activeConfig.negativePromptDefaults.split(',').map(t => t.trim()).filter(t => t);
    } else {
      this.negativeTags = this.sessionConfig.negativePrompt.split(',').map(t => t.trim()).filter(t => t);
    }

    this.isLoading = false;
  }

  // ── STEP 1: TAG EXTRACTION ──

  async extractTags(): Promise<void> {
    if (this.messages.length === 0) {
      const toast = await this.toastCtrl.create({
        message: 'No messages to extract tags from',
        duration: 2000,
        color: 'warning',
      });
      await toast.present();
      this.skipToManual();
      return;
    }

    this.isExtracting = true;

    try {
      const result = await this.imageProvider.extractTags(this.messages);
      this.positiveTags = result.tags;
      if (result.negativeTags.length > 0) {
        this.negativeTags = result.negativeTags;
      }
      this.sceneDescription = result.description;
      this.step = 'edit';
    } catch (err: any) {
      const toast = await this.toastCtrl.create({
        message: `Extraction failed: ${err.message}`,
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.isExtracting = false;
    }
  }

  skipToManual(): void {
    this.step = 'edit';
    if (this.positiveTags.length === 0) {
      this.positiveTags = ['1person', 'detailed'];
    }
  }

  async reextractTags(): Promise<void> {
    this.step = 'extract';
    await this.extractTags();
  }

  // ── STEP 2: TAG EDITING ──

  async addTag(type: 'positive' | 'negative'): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: `Add ${type} tag`,
      inputs: [{ name: 'tag', type: 'text', placeholder: 'e.g. anime_style, forest' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (data) => {
            if (data.tag?.trim()) {
              const tags = data.tag.trim().split(',').map((t: string) => t.trim()).filter((t: string) => t);
              if (type === 'positive') {
                this.positiveTags.push(...tags);
              } else {
                this.negativeTags.push(...tags);
              }
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async editTag(type: 'positive' | 'negative', index: number): Promise<void> {
    const currentTag = type === 'positive' ? this.positiveTags[index] : this.negativeTags[index];

    const alert = await this.alertCtrl.create({
      header: 'Edit Tag',
      inputs: [{ name: 'tag', type: 'text', value: currentTag }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (data) => {
            if (data.tag?.trim()) {
              if (type === 'positive') {
                this.positiveTags[index] = data.tag.trim();
              } else {
                this.negativeTags[index] = data.tag.trim();
              }
            }
          },
        },
      ],
    });
    await alert.present();
  }

  removeTag(type: 'positive' | 'negative', index: number, event: Event): void {
    event.stopPropagation();
    if (type === 'positive') {
      this.positiveTags.splice(index, 1);
    } else {
      this.negativeTags.splice(index, 1);
    }
  }

  async copyTagsToClipboard(): Promise<void> {
    await this.imageProvider.copyTagsToClipboard(this.positiveTags, this.negativeTags);
    const toast = await this.toastCtrl.create({
      message: '📋 Tags copied to clipboard!',
      duration: 2000,
      color: 'success',
    });
    await toast.present();
  }

  // ── STEP 3: SETTINGS ──

  onResolutionChange(): void {
    const [w, h] = this.selectedResolution.split('x').map(Number);
    this.sessionConfig.width = w;
    this.sessionConfig.height = h;
  }

  getProviderIcon(): string {
    switch (this.activeConfig?.providerType) {
      case 'openai': return 'sparkles-outline';
      case 'stability': return 'image-outline';
      case 'a1111':
      case 'comfyui': return 'settings-outline';
      case 'copy-tags': return 'copy-outline';
      default: return 'color-palette-outline';
    }
  }

  getProviderName(): string {
    switch (this.activeConfig?.providerType) {
      case 'openai': return 'OpenAI (DALL·E)';
      case 'stability': return 'Stability AI';
      case 'a1111': return 'Automatic1111';
      case 'comfyui': return 'ComfyUI';
      case 'copy-tags': return 'Copy Tags Only';
      default: return 'Unknown';
    }
  }

  // ── STEP 4: GENERATION ──

  async generateImages(): Promise<void> {
    if (this.positiveTags.length === 0) return;

    // For copy-tags mode, just copy and show confirmation
    if (this.activeConfig?.providerType === 'copy-tags') {
      await this.copyTagsToClipboard();
      this.tagsCopied = true;
      this.imageProvider.saveSessionConfig(this.sessionConfig);
      return;
    }

    if (!this.activeConfig) {
      const toast = await this.toastCtrl.create({
        message: 'No image provider configured',
        duration: 2000,
        color: 'danger',
      });
      await toast.present();
      return;
    }

    this.isGenerating = true;
    this.tagsCopied = false;

    try {
      const params: ImageGenParams = {
        width: this.sessionConfig.width,
        height: this.sessionConfig.height,
        steps: this.sessionConfig.steps,
        cfgScale: this.sessionConfig.cfgScale,
        count: this.sessionConfig.imageCount,
        model: this.sessionConfig.lastModel,
        loras: this.sessionConfig.lastLoras,
        stylePreset: this.sessionConfig.stylePreset,
      };

      const images = await this.imageProvider.generate(
        this.positiveTags,
        this.negativeTags,
        params,
        this.activeConfig
      );

      this.generatedImages = images;

      // Save session config for persistence
      this.imageProvider.saveSessionConfig(this.sessionConfig);

      if (images.length > 0) {
        const toast = await this.toastCtrl.create({
          message: `🎨 ${images.length} image${images.length > 1 ? 's' : ''} generated!`,
          duration: 2000,
          color: 'success',
        });
        await toast.present();
      }
    } catch (err: any) {
      const toast = await this.toastCtrl.create({
        message: `Generation failed: ${err.message}`,
        duration: 4000,
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.isGenerating = false;
    }
  }

  // ── IMAGE ACTIONS ──

  downloadImage(img: GeneratedImage): void {
    const a = document.createElement('a');
    a.href = img.imageUrl;
    a.download = `masterbook_${img.id.substring(0, 8)}.png`;
    a.click();
  }

  async attachToMessage(img: GeneratedImage): Promise<void> {
    if (!this.sessionId || !this.linkedMessageId) {
      const toast = await this.toastCtrl.create({
        message: 'Image generated! You can download it.',
        duration: 2000,
      });
      await toast.present();
      return;
    }

    // Attach image reference to the message
    img.linkedMessageId = this.linkedMessageId;
    img.linkedSessionId = this.sessionId;

    try {
      const session = await this.chatSessionService.getSession(this.sessionId);
      if (session) {
        const msg = session.messages.find(m => m.id === this.linkedMessageId);
        if (msg) {
          msg.generatedImageRefs.push(img.imageUrl);
          await this.chatSessionService.updateSession(this.sessionId, {
            messages: session.messages,
          });
        }
      }

      const toast = await this.toastCtrl.create({
        message: '🖼️ Image attached to message!',
        duration: 2000,
        color: 'success',
      });
      await toast.present();
    } catch (err: any) {
      const toast = await this.toastCtrl.create({
        message: `Attach failed: ${err.message}`,
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
    }
  }

  // ── NAVIGATION ──

  showProviderSetup(): void {
    this.router.navigateByUrl('/settings');
    this.dismiss();
  }

  dismiss(): void {
    this.modalCtrl.dismiss().catch(() => {
      // If not in a modal, navigate back
      this.router.navigateByUrl('/gallery');
    });
  }
}
