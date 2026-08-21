import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonButtons, IonToggle, IonFooter,
  AlertController, ToastController, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, imageOutline, sparklesOutline, copyOutline,
  trashOutline, addOutline, closeOutline, settingsOutline,
  downloadOutline, refreshOutline, checkmarkOutline,
  chevronDownOutline, chevronUpOutline, colorPaletteOutline,
  helpCircleOutline, happyOutline, chevronForwardOutline
} from 'ionicons/icons';
import { ImageProviderService, ImageGenParams, TagExtractionResult } from '../../core/services/image-provider.service';
import { ConnectionService } from '../../core/services/connection.service';
import { ChatSessionService } from '../../core/services/chat-session.service';
import { ImageGenSessionConfig, createDefaultImageGenSessionConfig, GeneratedImage } from '../../core/models/image-gen-config.model';
import { ImageGenConfig } from '../../core/models/connection-profile.model';
import { Message } from '../../core/models/chat-session.model';
import { ImageGenMoreSettingsComponent } from './image-gen-more-settings.component';

@Component({
  selector: 'app-image-gen',
  template: `
    <ion-header class="ion-no-border ig-header">
      <ion-toolbar class="transparent-toolbar">
        <ion-buttons slot="start">
          <ion-button (click)="dismiss()" class="close-btn">
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title class="ig-title">Image Generation</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ig-content ion-padding">
      <div class="ig-form">

        <!-- Reference last prompt -->
        <div class="ig-row align-center">
          <div class="ig-label">Reference last prompt <ion-icon name="help-circle-outline"></ion-icon></div>
          <ion-toggle [(ngModel)]="referenceLastPrompt" class="mb-toggle"></ion-toggle>
        </div>

        <!-- Prompt -->
        <div class="ig-row header-row mt-4">
          <div class="ig-label">Prompt</div>
          <div class="ig-action" (click)="reextractTags()">Regenerate</div>
        </div>
        <div class="ig-textarea-box mt-2">
          <textarea [(ngModel)]="promptText" rows="7" class="ig-textarea" placeholder="Describe the image you want..."></textarea>
        </div>

        <!-- Negative Prompt -->
        <div class="ig-accordion mt-4" (click)="isNegativePromptOpen = !isNegativePromptOpen">
          <div class="ig-label">Negative Prompt</div>
          <ion-icon [name]="isNegativePromptOpen ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
        </div>
        <div class="ig-textarea-box mt-2" *ngIf="isNegativePromptOpen">
          <textarea [(ngModel)]="negativePromptText" rows="3" class="ig-textarea" placeholder="What you don't want in the image..."></textarea>
        </div>

        <!-- Model -->
        <div class="ig-row header-row mt-4">
          <div class="ig-label">Model</div>
          <div class="ig-action" (click)="showProviderSetup()">Change</div>
        </div>
        <div class="ig-model-card mt-2">
          <div class="model-thumb placeholder-thumb">
            <ion-icon name="image-outline"></ion-icon>
          </div>
          <div class="model-info">
            <div class="model-name">{{ sessionConfig.lastModel || activeConfig?.modelOrCheckpoint || 'Default Model' }}</div>
            <div class="model-sub">{{ getProviderName() }}</div>
          </div>
        </div>

        <!-- Spells -->
        <div class="ig-row header-row mt-4">
          <div class="ig-label">Spells <span class="sub-text">(Selected 0/5)</span></div>
          <div class="ig-action">Add more</div>
        </div>
        <div class="ig-spells-empty mt-2">
          <div class="add-spell-btn">
            <ion-icon name="add-outline"></ion-icon> Select spells
          </div>
        </div>

        <!-- ADetailer -->
        <div class="ig-row align-center mt-4">
          <div class="ig-label">ADetailer <ion-icon name="help-circle-outline"></ion-icon></div>
          <ion-toggle [(ngModel)]="aDetailerEnabled" class="mb-toggle"></ion-toggle>
        </div>

        <!-- Canvas Size -->
        <div class="ig-row flex-col mt-4">
          <div class="ig-label mb-2">Canvas Size</div>
          <div class="ig-select-wrapper">
            <select [(ngModel)]="selectedResolution" (ngModelChange)="onResolutionChange()" class="ig-select">
              <option value="512x512">Square (512 × 512)</option>
              <option value="512x768">Portrait (512 × 768)</option>
              <option value="768x512">Landscape (768 × 512)</option>
              <option value="768x768">Square (768 × 768)</option>
              <option value="1024x1024">Square (1024 × 1024)</option>
              <option value="1024x1792">Portrait (1024 × 1792)</option>
              <option value="1792x1024">Landscape (1792 × 1024)</option>
            </select>
            <ion-icon name="chevron-down-outline" class="select-icon"></ion-icon>
          </div>
        </div>

        <!-- Number of Images -->
        <div class="ig-row flex-col mt-4">
          <div class="ig-label mb-2">Number of Images</div>
          <div class="ig-segments">
            <div class="ig-segment" [class.active]="sessionConfig.imageCount === 1" (click)="sessionConfig.imageCount = 1">1</div>
            <div class="ig-segment" [class.active]="sessionConfig.imageCount === 2" (click)="sessionConfig.imageCount = 2">2</div>
            <div class="ig-segment" [class.active]="sessionConfig.imageCount === 4" (click)="sessionConfig.imageCount = 4">4</div>
          </div>
        </div>

        <!-- More Settings -->
        <div class="ig-accordion mt-4" (click)="openMoreSettings()">
          <div class="ig-label">More Settings</div>
          <ion-icon name="chevron-forward-outline"></ion-icon>
        </div>

        <!-- Results -->
        <div class="ig-results mt-5" *ngIf="generatedImages.length > 0">
          <div class="ig-row header-row mb-2">
            <div class="ig-label">Generated Images</div>
          </div>
          <div class="image-results">
            <div *ngFor="let img of generatedImages; let i = index"
                 class="image-result-card mb-fade-in"
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
            </div>
          </div>
        </div>

      </div>
    </ion-content>

    <ion-footer class="ig-footer ion-no-border">
      <div class="show-next-time">
        <div class="snt-text">
          <div class="snt-title">Show Next Time</div>
          <div class="snt-desc">You can always get access to these settings in the chat menu.</div>
        </div>
        <ion-toggle [(ngModel)]="showNextTime" color="success" class="mb-toggle success-toggle"></ion-toggle>
      </div>
      
      <button class="ig-generate-btn" (click)="generateImages()" [disabled]="isGenerating || !promptText.trim()">
        <span>{{ isGenerating ? 'Generating...' : 'Generate' }}</span>
        <span class="cost-badge" *ngIf="!isGenerating"><ion-icon name="happy-outline"></ion-icon> 12</span>
      </button>
    </ion-footer>
  `,
  styles: [`
    .ig-header { background: #1c1c1e; }
    .transparent-toolbar { --background: transparent; color: white; }
    .close-btn { --color: white; margin-left: 8px; width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.1); }
    .ig-title { text-align: center; font-weight: 600; font-size: 17px; margin-right: 48px; }

    .ig-content { --background: #1c1c1e; }
    .ig-form { max-width: 600px; margin: 0 auto; color: white; padding-bottom: 24px; }

    /* Layout Utils */
    .mt-2 { margin-top: 8px; }
    .mt-4 { margin-top: 24px; }
    .mt-5 { margin-top: 32px; }
    .mb-2 { margin-bottom: 8px; }
    
    .ig-row { display: flex; justify-content: space-between; }
    .align-center { align-items: center; }
    .flex-col { flex-direction: column; }
    .header-row { align-items: flex-end; margin-bottom: 4px; }

    .ig-label { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
    .ig-label ion-icon { font-size: 18px; color: #a1a1aa; }
    .ig-action { font-size: 13px; color: #a1a1aa; cursor: pointer; }
    .sub-text { font-weight: 400; color: #a1a1aa; font-size: 13px; }

    /* Toggle overrides */
    .mb-toggle { --handle-background: white; --track-background-checked: #eab308; padding-right: 2px; }
    .success-toggle { --track-background-checked: #22c55e; }

    /* Textareas */
    .ig-textarea-box {
      background: #27272a; border-radius: 12px; padding: 12px;
    }
    .ig-textarea {
      width: 100%; background: transparent; border: none; color: white; 
      font-size: 15px; line-height: 1.5; outline: none; resize: none;
    }
    .ig-textarea::placeholder { color: #71717a; }

    /* Accordion headers */
    .ig-accordion {
      display: flex; justify-content: space-between; align-items: center;
      padding: 4px 0; cursor: pointer;
    }
    .ig-accordion ion-icon { color: #a1a1aa; font-size: 20px; }

    /* Model Card */
    .ig-model-card {
      background: #27272a; border-radius: 12px; padding: 12px;
      display: flex; align-items: center; gap: 12px;
    }
    .placeholder-thumb {
      width: 48px; height: 48px; border-radius: 8px;
      background: #3f3f46; display: flex; align-items: center; justify-content: center;
    }
    .placeholder-thumb ion-icon { color: #a1a1aa; font-size: 24px; }
    .model-info { display: flex; flex-direction: column; gap: 2px; }
    .model-name { font-size: 14px; font-weight: 500; }
    .model-sub { font-size: 12px; color: #a1a1aa; }

    /* Spells */
    .ig-spells-empty { display: flex; align-items: center; justify-content: flex-start; }
    .add-spell-btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 10px 16px; background: #27272a; border-radius: 8px;
      font-size: 13px; color: #a1a1aa; cursor: pointer;
    }

    /* Select Dropdown */
    .ig-select-wrapper { position: relative; }
    .ig-select {
      width: 100%; appearance: none; background: #27272a; color: white;
      border: 1px solid #3f3f46; border-radius: 12px; padding: 14px 16px;
      font-size: 15px; outline: none; cursor: pointer;
    }
    .select-icon {
      position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
      color: #a1a1aa; pointer-events: none;
    }

    /* Segments */
    .ig-segments {
      display: flex; background: transparent; gap: 12px;
    }
    .ig-segment {
      flex: 1; text-align: center; padding: 14px 0;
      background: #27272a; border: 1px solid #3f3f46; border-radius: 12px;
      font-size: 15px; font-weight: 500; cursor: pointer; transition: all 0.2s;
    }
    .ig-segment.active {
      background: transparent; border-color: #eab308; color: #eab308;
    }

    /* Settings Grid */
    .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .setting-item { display: flex; flex-direction: column; gap: 6px; }
    .setting-item label { font-size: 12px; color: #a1a1aa; }
    .ig-input {
      --background: #27272a; --color: white; border-radius: 8px;
      --padding-start: 12px; --padding-end: 12px;
    }
    .full-width { grid-column: 1 / -1; }

    /* Results */
    .image-results { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .image-result-card { background: #27272a; border-radius: 12px; overflow: hidden; }
    .result-image { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
    .result-actions { display: flex; justify-content: center; padding: 6px; border-top: 1px solid #3f3f46; }

    /* Footer */
    .ig-footer { background: #1c1c1e; padding: 16px; border-top: 1px solid #27272a; }
    .show-next-time { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .snt-title { font-size: 15px; font-weight: 600; color: white; margin-bottom: 2px; }
    .snt-desc { font-size: 12px; color: #a1a1aa; }
    
    .ig-generate-btn {
      width: 100%; background: #eab308; color: black; border: none; border-radius: 24px;
      padding: 16px; font-size: 16px; font-weight: 700; display: flex; justify-content: center;
      align-items: center; gap: 8px; position: relative; cursor: pointer;
    }
    .ig-generate-btn:disabled { opacity: 0.6; }
    .cost-badge {
      position: absolute; right: 16px; display: flex; align-items: center; gap: 4px;
      font-weight: 600; font-size: 14px;
    }
  `],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonButtons, IonToggle, IonFooter
  ],
})
export class ImageGenPage implements OnInit {
  @Input() messages: Message[] = [];
  @Input() sessionId?: string;
  @Input() linkedMessageId?: string;

  isLoading = true;
  isExtracting = false;
  isGenerating = false;
  
  // UI States
  referenceLastPrompt = true;
  isNegativePromptOpen = false;
  aDetailerEnabled = false;
  showNextTime = true;
  tagsCopied = false;

  activeConfig?: ImageGenConfig;
  sessionConfig: ImageGenSessionConfig = createDefaultImageGenSessionConfig();
  selectedResolution = '1024x1024';

  // Form Data
  promptText = '';
  negativePromptText = '';
  generatedImages: GeneratedImage[] = [];

  constructor(
    private imageProvider: ImageProviderService,
    private chatSessionService: ChatSessionService,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private router: Router,
  ) {
    addIcons({
      arrowBackOutline, imageOutline, sparklesOutline, copyOutline,
      trashOutline, addOutline, closeOutline, settingsOutline,
      downloadOutline, refreshOutline, checkmarkOutline,
      chevronDownOutline, chevronUpOutline, colorPaletteOutline,
      helpCircleOutline, happyOutline, chevronForwardOutline
    });
  }

  async ngOnInit(): Promise<void> {
    this.isLoading = true;
    this.activeConfig = await this.imageProvider.getDefaultConfig();
    this.sessionConfig = this.imageProvider.getDefaultSessionConfig();
    this.selectedResolution = `${this.sessionConfig.width}x${this.sessionConfig.height}`;

    // Initialize Negative Prompt
    if (this.activeConfig?.negativePromptDefaults) {
      this.negativePromptText = this.activeConfig.negativePromptDefaults;
    } else {
      this.negativePromptText = this.sessionConfig.negativePrompt;
    }

    // Auto-extract tags if messages exist and we don't have a prompt yet
    if (this.messages.length > 0 && !this.promptText) {
      await this.extractTags();
    }

    this.isLoading = false;
  }

  async extractTags(): Promise<void> {
    this.isExtracting = true;
    try {
      const result = await this.imageProvider.extractTags(this.messages);
      this.promptText = result.tags.join(', ');
      if (result.negativeTags.length > 0) {
        this.negativePromptText = result.negativeTags.join(', ');
      }
    } catch (err: any) {
      console.warn('Tag extraction failed', err);
    } finally {
      this.isExtracting = false;
    }
  }

  async reextractTags(): Promise<void> {
    if (this.messages.length === 0) {
      const toast = await this.toastCtrl.create({
        message: 'No messages to extract tags from.',
        duration: 2000, color: 'warning',
      });
      await toast.present();
      return;
    }
    await this.extractTags();
  }

  async openMoreSettings() {
    const modal = await this.modalCtrl.create({
      component: ImageGenMoreSettingsComponent,
      componentProps: { config: this.sessionConfig }
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data?.config) {
      this.sessionConfig = data.config;
      this.imageProvider.saveSessionConfig(this.sessionConfig);
    }
  }

  onResolutionChange(): void {
    const [w, h] = this.selectedResolution.split('x').map(Number);
    this.sessionConfig.width = w;
    this.sessionConfig.height = h;
  }

  getProviderName(): string {
    switch (this.activeConfig?.providerType) {
      case 'openai': return 'OpenAI (DALL·E)';
      case 'stability': return 'Stability AI';
      case 'a1111': return 'Automatic1111';
      case 'comfyui': return 'ComfyUI';
      case 'copy-tags': return 'Copy Tags Only';
      default: return 'No Provider Setup';
    }
  }

  async generateImages(): Promise<void> {
    const positiveTags = this.promptText.split(',').map(t => t.trim()).filter(t => t);
    const negativeTags = this.negativePromptText.split(',').map(t => t.trim()).filter(t => t);

    if (positiveTags.length === 0) return;

    if (this.activeConfig?.providerType === 'copy-tags') {
      await this.imageProvider.copyTagsToClipboard(positiveTags, negativeTags);
      this.tagsCopied = true;
      this.imageProvider.saveSessionConfig(this.sessionConfig);
      const toast = await this.toastCtrl.create({ message: 'Tags copied to clipboard!', duration: 2000, color: 'success' });
      await toast.present();
      return;
    }

    if (!this.activeConfig) {
      const toast = await this.toastCtrl.create({ message: 'No image provider configured.', duration: 2000, color: 'danger' });
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

      const images = await this.imageProvider.generate(positiveTags, negativeTags, params, this.activeConfig);
      this.generatedImages = images;
      this.imageProvider.saveSessionConfig(this.sessionConfig);

      if (images.length > 0) {
        const toast = await this.toastCtrl.create({ message: `🎨 ${images.length} image(s) generated!`, duration: 2000, color: 'success' });
        await toast.present();
      }
    } catch (err: any) {
      const toast = await this.toastCtrl.create({ message: `Generation failed: ${err.message}`, duration: 4000, color: 'danger' });
      await toast.present();
    } finally {
      this.isGenerating = false;
    }
  }

  downloadImage(img: GeneratedImage): void {
    const a = document.createElement('a');
    a.href = img.imageUrl;
    a.download = `masterbook_${img.id.substring(0, 8)}.png`;
    a.click();
  }

  async attachToMessage(img: GeneratedImage): Promise<void> {
    if (!this.sessionId || !this.linkedMessageId) {
      const toast = await this.toastCtrl.create({ message: 'Image generated! You can download it.', duration: 2000 });
      await toast.present();
      return;
    }

    img.linkedMessageId = this.linkedMessageId;
    img.linkedSessionId = this.sessionId;

    try {
      const session = await this.chatSessionService.getSession(this.sessionId);
      if (session) {
        const msg = session.messages.find(m => m.id === this.linkedMessageId);
        if (msg) {
          msg.generatedImageRefs = msg.generatedImageRefs || [];
          msg.generatedImageRefs.push(img.imageUrl);
          await this.chatSessionService.updateSession(this.sessionId, { messages: session.messages });
        }
      }
      const toast = await this.toastCtrl.create({ message: '🖼️ Image attached to message!', duration: 2000, color: 'success' });
      await toast.present();
    } catch (err: any) {
      const toast = await this.toastCtrl.create({ message: `Attach failed: ${err.message}`, duration: 3000, color: 'danger' });
      await toast.present();
    }
  }

  showProviderSetup(): void {
    this.router.navigateByUrl('/settings');
    this.dismiss();
  }

  dismiss(): void {
    this.modalCtrl.dismiss().catch(() => {
      this.router.navigateByUrl('/gallery');
    });
  }
}
