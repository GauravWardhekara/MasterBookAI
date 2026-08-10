import { Component, OnInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonButtons, IonFooter, IonTextarea,
  AlertController, ToastController, ActionSheetController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, sendOutline, settingsOutline, refreshOutline,
  createOutline, trashOutline, arrowUndoOutline, playForwardOutline,
  ellipsisVerticalOutline, bookOutline, sparklesOutline,
  chevronUpOutline, chevronDownOutline, saveOutline, documentTextOutline,
  bookmarkOutline, bulbOutline
} from 'ionicons/icons';
import { ChatSessionService } from '../../core/services/chat-session.service';
import { ScenarioService } from '../../core/services/scenario.service';
import { CharacterService } from '../../core/services/character.service';
import { LorebookService } from '../../core/services/lorebook.service';
import { ConnectionService } from '../../core/services/connection.service';
import { LLMProviderService } from '../../core/services/llm-provider.service';
import { PromptAssemblyService } from '../../core/services/prompt-assembly.service';
import { ChatSession, Message } from '../../core/models/chat-session.model';
import { Scenario } from '../../core/models/scenario.model';
import { Character, Persona } from '../../core/models/character.model';
import { Lorebook } from '../../core/models/lorebook.model';
import { ConnectionProfile } from '../../core/models/connection-profile.model';
import { generateId, now } from '../../core/models/base.model';
import { FileIOService } from '../../core/services/file-io.service';
import { MemoryService } from '../../core/services/memory.service';

@Component({
  selector: 'app-story-mode',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="goBack()">
            <ion-icon slot="icon-only" name="arrow-back-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>
          <span class="story-title-bar">
            <ion-icon name="book-outline" class="title-icon"></ion-icon>
            {{ session?.title || 'Story' }}
          </span>
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="showStoryMenu()">
            <ion-icon slot="icon-only" name="ellipsis-vertical-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Story Controls Bar -->
      <ion-toolbar class="controls-bar">
        <div class="controls-row">
          <div class="pov-controls">
            <span class="mb-chip" [class.active]="pov === '1st-person'" (click)="setPOV('1st-person')">1st</span>
            <span class="mb-chip" [class.active]="pov === '3rd-person'" (click)="setPOV('3rd-person')">3rd</span>
          </div>
          <div class="tense-controls">
            <span class="mb-chip" [class.active]="tense === 'past'" (click)="setTense('past')">Past</span>
            <span class="mb-chip" [class.active]="tense === 'present'" (click)="setTense('present')">Present</span>
          </div>
          <div class="word-count">{{ totalWordCount }} words</div>
        </div>
      </ion-toolbar>

      <!-- Connection indicator -->
      <ion-toolbar class="connection-bar" *ngIf="connectionProfile">
        <div class="connection-indicator">
          <div class="conn-dot connected"></div>
          <span class="conn-label">{{ connectionProfile?.name }}</span>
          <span class="conn-model" *ngIf="activeModel">{{ activeModel }}</span>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content #storyContentRef class="story-content">
      <div class="story-container">
        <!-- No connection warning -->
        <div *ngIf="!connectionProfile" class="no-connection-banner mb-fade-in">
          <ion-icon name="settings-outline"></ion-icon>
          <span>No LLM connection configured.</span>
          <ion-button fill="clear" size="small" (click)="goToSettings()">
            Set Up Connection
          </ion-button>
        </div>

        <!-- Story Area -->
        <div *ngIf="session" class="story-area mb-fade-in">
          <!-- Story Header -->
          <div class="story-header" *ngIf="scenario">
            <div class="story-header-icon">📖</div>
            <div class="story-header-info">
              <div class="story-header-title">{{ scenario.title }}</div>
              <div class="story-header-meta">
                {{ pov === '1st-person' ? 'First Person' : 'Third Person' }} ·
                {{ tense | titlecase }} Tense
              </div>
            </div>
          </div>

          <!-- Author's Note Toggle -->
          <div class="authors-note-section" *ngIf="showAuthorsNote">
            <div class="authors-note-header">
              <ion-icon name="create-outline"></ion-icon>
              <span>Author's Note</span>
              <ion-button fill="clear" size="small" (click)="showAuthorsNote = false">
                <ion-icon slot="icon-only" name="chevron-up-outline"></ion-icon>
              </ion-button>
            </div>
            <ion-textarea
              [(ngModel)]="authorsNote"
              placeholder="Add guidance for the AI... (e.g., 'Focus on dialogue', 'Build tension')"
              rows="2"
              class="authors-note-input"
            ></ion-textarea>
          </div>
          <ion-button *ngIf="!showAuthorsNote" fill="clear" size="small" class="toggle-note-btn"
                      (click)="showAuthorsNote = true">
            <ion-icon slot="start" name="create-outline"></ion-icon>
            Author's Note
          </ion-button>

          <!-- Story Prose Content -->
          <div class="prose-container">
            <div *ngIf="storyBlocks.length === 0 && !isStreaming" class="story-empty">
              <div class="empty-icon">✍️</div>
              <h3>Begin Your Story</h3>
              <p>Write the opening or let the AI start the narrative</p>
              <div class="start-actions">
                <ion-button class="mb-btn-primary" (click)="generateContinuation()">
                  <ion-icon slot="start" name="sparkles-outline"></ion-icon>
                  AI Writes Opening
                </ion-button>
                <ion-button class="mb-btn-secondary" (click)="focusInput()">
                  <ion-icon slot="start" name="create-outline"></ion-icon>
                  You Write Opening
                </ion-button>
              </div>
            </div>

            <!-- Story blocks -->
            <div *ngFor="let block of storyBlocks; let i = index; trackBy: trackByBlockIndex"
                 class="story-block"
                 [class.user-written]="block.role === 'user'"
                 [class.ai-generated]="block.role === 'assistant'"
                 [class.system-note]="block.role === 'system'">
              <div class="block-content" [innerHTML]="formatProse(block.content)"></div>
              <div class="block-actions" *ngIf="!isStreaming">
                <ion-button fill="clear" size="small" (click)="editBlock(i)" title="Edit">
                  <ion-icon slot="icon-only" name="create-outline"></ion-icon>
                </ion-button>
                <ion-button *ngIf="i === storyBlocks.length - 1 && block.role === 'assistant'"
                            fill="clear" size="small" (click)="regenerateLastBlock()" title="Regenerate">
                  <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
                </ion-button>
                <ion-button fill="clear" size="small" (click)="pinBlockAsMemory(block)" title="Pin as Memory"
                            [color]="block.isPinnedAsMemory ? 'warning' : undefined">
                  <ion-icon slot="icon-only" name="bookmark-outline"></ion-icon>
                </ion-button>
                <ion-button *ngIf="i === storyBlocks.length - 1"
                            fill="clear" size="small" color="danger"
                            (click)="undoLastBlock()" title="Undo">
                  <ion-icon slot="icon-only" name="arrow-undo-outline"></ion-icon>
                </ion-button>
              </div>
            </div>

            <!-- Streaming indicator -->
            <div *ngIf="isStreaming" class="story-block ai-generated streaming-block">
              <div class="block-content" [innerHTML]="formatProse(streamingContent)"></div>
              <span class="typing-cursor">▊</span>
            </div>
          </div>

          <!-- Scroll anchor -->
          <div #scrollAnchor></div>
        </div>
      </div>
    </ion-content>

    <ion-footer *ngIf="session">
      <ion-toolbar class="story-input-toolbar">
        <div class="story-input-area">
          <textarea #storyInput
            class="story-input"
            [placeholder]="isStreaming ? 'AI is writing...' : 'Write or direct the story...'"
            [(ngModel)]="inputText"
            (keydown)="onKeyDown($event)"
            [disabled]="isStreaming"
            rows="2"
          ></textarea>
          <div class="story-input-actions">
            <ion-button *ngIf="!isStreaming" class="action-btn"
                        [disabled]="!connectionProfile"
                        fill="clear" (click)="submitUserText()" title="Add your text">
              <ion-icon slot="icon-only" name="send-outline"></ion-icon>
            </ion-button>
            <ion-button *ngIf="!isStreaming" class="action-btn continue-btn"
                        [disabled]="!connectionProfile"
                        fill="clear" (click)="generateContinuation()" title="AI continues">
              <ion-icon slot="icon-only" name="play-forward-outline"></ion-icon>
            </ion-button>
            <ion-button *ngIf="isStreaming" class="action-btn stop-btn"
                        fill="clear" (click)="stopStreaming()">
              Stop
            </ion-button>
          </div>
        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    .story-content { --background: var(--mb-bg-deep); }

    .story-title-bar {
      display: flex; align-items: center; gap: 6px;
    }
    .title-icon { font-size: 18px; color: var(--mb-accent); }

    .controls-bar {
      --min-height: 36px; --padding-top: 0; --padding-bottom: 0;
      --background: var(--mb-bg-secondary);
    }
    .controls-row {
      display: flex; align-items: center; gap: 12px;
      padding: 4px 16px; font-size: 11px;
    }
    .pov-controls, .tense-controls {
      display: flex; gap: 4px;
    }
    .pov-controls .mb-chip, .tense-controls .mb-chip {
      font-size: 11px; padding: 2px 8px;
    }
    .word-count {
      margin-left: auto; color: var(--mb-text-muted);
      font-size: 11px; font-weight: 500;
    }

    .connection-bar {
      --min-height: 24px; --padding-top: 0; --padding-bottom: 0;
      --background: var(--mb-bg-secondary);
    }
    .connection-indicator {
      display: flex; align-items: center; gap: 8px;
      padding: 2px 16px; font-size: 11px; color: var(--mb-text-muted);
    }
    .conn-dot {
      width: 6px; height: 6px; border-radius: 50%;
    }
    .conn-dot.connected {
      background: var(--mb-success);
      box-shadow: 0 0 4px rgba(52, 211, 153, 0.4);
    }
    .conn-label { font-weight: 500; }
    .conn-model { font-family: monospace; font-size: 10px; color: var(--mb-primary); }

    .no-connection-banner {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 16px; margin: 12px; border-radius: var(--mb-radius-md);
      background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.2);
      font-size: 13px; color: var(--mb-text-secondary);
    }
    .no-connection-banner ion-icon { color: var(--mb-danger); font-size: 18px; }

    .story-container { min-height: 100%; }
    .story-area { padding: 16px 20px 60px; max-width: 720px; margin: 0 auto; }

    .story-header {
      display: flex; align-items: center; gap: 12px;
      padding: 16px; margin-bottom: 20px;
      background: var(--mb-glass-bg); border: 1px solid var(--mb-glass-border);
      border-radius: var(--mb-radius-lg);
    }
    .story-header-icon { font-size: 28px; }
    .story-header-title { font-weight: 700; font-size: 16px; color: var(--mb-text-primary); }
    .story-header-meta { font-size: 12px; color: var(--mb-text-muted); }

    /* Author's Note */
    .authors-note-section {
      background: rgba(245, 158, 11, 0.06);
      border: 1px solid rgba(245, 158, 11, 0.15);
      border-radius: var(--mb-radius-md);
      padding: 10px 14px; margin-bottom: 20px;
    }
    .authors-note-header {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px; font-weight: 600; color: var(--mb-accent);
      margin-bottom: 6px;
    }
    .authors-note-header ion-icon { font-size: 14px; }
    .authors-note-header span { flex: 1; }
    .authors-note-input {
      --background: transparent; --color: var(--mb-text-secondary);
      --padding-start: 0; --padding-end: 0;
      font-size: 13px; font-style: italic; border: none;
    }
    .toggle-note-btn {
      font-size: 12px; --color: var(--mb-text-muted);
      margin-bottom: 12px;
    }

    /* Prose */
    .prose-container { line-height: 1.8; }

    .story-empty {
      text-align: center; padding: 48px 24px;
    }
    .empty-icon { font-size: 48px; margin-bottom: 16px; }
    .story-empty h3 {
      font-weight: 700; color: var(--mb-text-primary); margin-bottom: 8px;
    }
    .story-empty p { color: var(--mb-text-muted); margin-bottom: 24px; }
    .start-actions { display: flex; flex-direction: column; gap: 10px; align-items: center; }
    .mb-btn-secondary {
      --background: var(--mb-bg-elevated);
      --border-radius: var(--mb-radius-md);
      --color: var(--mb-text-primary);
      border: 1px solid var(--mb-border);
    }

    .story-block {
      position: relative; padding: 4px 0; margin-bottom: 2px;
    }
    .story-block .block-content {
      font-size: 15px; color: var(--mb-text-primary);
      line-height: 1.85; white-space: pre-wrap;
    }
    .story-block.user-written .block-content {
      border-left: 2px solid rgba(167, 139, 250, 0.3);
      padding-left: 12px;
    }
    .story-block.ai-generated .block-content {
      /* Seamless — no border for AI text */
    }
    .story-block.system-note .block-content {
      font-size: 13px; color: var(--mb-text-muted); font-style: italic;
      text-align: center; padding: 8px 0;
    }

    .block-actions {
      display: none; position: absolute; top: 0; right: -4px;
      background: var(--mb-bg-elevated); border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius-sm); padding: 2px;
      box-shadow: var(--mb-shadow-sm);
    }
    .story-block:hover .block-actions { display: flex; }
    .block-actions ion-button {
      --padding-start: 4px; --padding-end: 4px; height: 24px;
    }

    .streaming-block {
      opacity: 0.9;
    }
    .typing-cursor {
      display: inline-block; animation: blink 0.8s step-end infinite;
      color: var(--mb-primary); font-size: 14px;
    }
    @keyframes blink { 50% { opacity: 0; } }

    /* Input */
    .story-input-toolbar {
      --background: var(--mb-bg-secondary);
      --border-color: var(--mb-border);
    }
    .story-input-area {
      display: flex; align-items: flex-end; gap: 8px;
      padding: 8px 12px;
    }
    .story-input {
      flex: 1; background: var(--mb-bg-input);
      border: 1px solid var(--mb-border); border-radius: 12px;
      padding: 10px 14px; color: var(--mb-text-primary);
      font-size: 14px; outline: none; resize: none;
      font-family: inherit; max-height: 120px; line-height: 1.4;
    }
    .story-input:focus { border-color: var(--mb-border-focus); }
    .story-input:disabled { opacity: 0.5; }

    .story-input-actions { display: flex; flex-direction: column; gap: 2px; }
    .action-btn { --color: var(--mb-text-muted); }
    .action-btn[disabled] { opacity: 0.3; }
    .continue-btn { --color: var(--mb-primary); }
    .stop-btn { --color: var(--mb-danger); font-size: 12px; }
  `],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonButtons, IonFooter, IonTextarea
  ],
})
export class StoryModePage implements OnInit {
  session?: ChatSession;
  scenario?: Scenario;
  persona?: Persona;
  activeCharacters: Character[] = [];
  lorebooks: Lorebook[] = [];
  connectionProfile?: ConnectionProfile;
  activeModel?: string;

  inputText = '';
  isStreaming = false;
  streamingContent = '';
  authorsNote = '';
  showAuthorsNote = false;

  /** Auto-extraction triggers every N messages */
  private readonly AUTO_EXTRACT_INTERVAL = 10;

  pov: '1st-person' | '3rd-person' = '1st-person';
  tense: 'past' | 'present' = 'past';

  @ViewChild('scrollAnchor') scrollAnchor!: ElementRef;
  @ViewChild('storyContentRef') storyContentRef!: IonContent;
  @ViewChild('storyInput') storyInputEl!: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ngZone: NgZone,
    private chatSessionService: ChatSessionService,
    private scenarioService: ScenarioService,
    private characterService: CharacterService,
    private lorebookService: LorebookService,
    private connectionService: ConnectionService,
    private llmProvider: LLMProviderService,
    private promptAssembly: PromptAssemblyService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private fileIOService: FileIOService,
    private memoryService: MemoryService,
  ) {
    addIcons({
      arrowBackOutline, sendOutline, settingsOutline, refreshOutline,
      createOutline, trashOutline, arrowUndoOutline, playForwardOutline,
      ellipsisVerticalOutline, bookOutline, sparklesOutline,
      chevronUpOutline, chevronDownOutline, saveOutline, documentTextOutline,
      bookmarkOutline, bulbOutline
    });
  }

  async ngOnInit(): Promise<void> {
    const sessionId = this.route.snapshot.paramMap.get('sessionId');
    if (!sessionId) return;

    this.session = await this.chatSessionService.getSession(sessionId);
    if (!this.session) return;

    this.scenario = await this.scenarioService.getScenario(this.session.scenarioId);
    if (this.scenario) {
      this.activeCharacters = await this.characterService.getCharactersByIds(this.scenario.characterIds);
      this.lorebooks = await this.lorebookService.getLorebooksByIds(this.scenario.lorebookIds);
      this.pov = this.scenario.defaultPOV || '1st-person';
      this.tense = this.scenario.defaultTense || 'past';
    }

    const persona = await this.characterService.getDefaultPersona();
    this.persona = persona || { id: 'default-persona', name: 'User', description: '', isDefault: true, createdAt: now(), updatedAt: now() };

    this.connectionProfile = await this.connectionService.getDefaultProfile();
    if (this.connectionProfile && this.connectionProfile.modelList && this.connectionProfile.modelList.length > 0) {
      this.activeModel = this.connectionProfile.modelList[0];
    }

    setTimeout(() => this.scrollToBottom(), 100);
  }

  // ── Computed ──

  get storyBlocks(): Message[] {
    return this.session?.messages || [];
  }

  get totalWordCount(): number {
    return this.storyBlocks.reduce((sum, m) => sum + m.content.split(/\s+/).filter(w => w).length, 0);
  }

  // ── POV/Tense ──

  setPOV(pov: '1st-person' | '3rd-person'): void {
    this.pov = pov;
  }

  setTense(tense: 'past' | 'present'): void {
    this.tense = tense;
  }

  // ── User Input ──

  async submitUserText(): Promise<void> {
    if (!this.inputText.trim() || !this.session) return;

    const userBlock: Message = {
      id: generateId(),
      role: 'user',
      senderId: this.persona?.id || 'user',
      senderName: this.persona?.name || 'Author',
      content: this.inputText.trim(),
      timestamp: now(),
      generatedImageRefs: [],
      isPinnedAsMemory: false,
      tokenCount: Math.ceil(this.inputText.trim().length / 4),
    };

    this.session.messages.push(userBlock);
    this.inputText = '';
    await this.saveSession();
    this.scrollToBottom();
  }

  async generateContinuation(): Promise<void> {
    if (!this.session || !this.connectionProfile) return;

    // If there's user text in the input, submit it first as a direction
    if (this.inputText.trim()) {
      await this.submitUserText();
    }

    this.isStreaming = true;
    this.streamingContent = '';

    try {
      const storySystemPrompt = this.buildStorySystemPrompt();

      const assembled = await this.promptAssembly.assemble(
        this.scenario!,
        this.persona!,
        this.activeCharacters,
        this.session.messages,
        this.lorebooks,
        this.connectionProfile.contextSize
      );

      // Override the system prompt with story-specific instructions
      const llmMessages = this.llmProvider.convertMessages(
        assembled.messages,
        storySystemPrompt,
        this.connectionProfile.promptTemplate
      );

      if (this.connectionProfile.streamingEnabled) {
        for await (const chunk of this.llmProvider.stream(llmMessages, {
          model: this.activeModel,
          temperature: this.connectionProfile.defaultSampling?.temperature ?? 0.8,
          maxTokens: this.connectionProfile.defaultSampling?.maxTokens ?? 800,
        }, this.connectionProfile)) {
          if (chunk.done) break;
          this.ngZone.run(() => {
            this.streamingContent += chunk.content;
          });
          this.scrollToBottom();
        }
      } else {
        this.streamingContent = await this.llmProvider.complete(llmMessages, {
          model: this.activeModel,
          temperature: this.connectionProfile.defaultSampling?.temperature ?? 0.8,
          maxTokens: this.connectionProfile.defaultSampling?.maxTokens ?? 800,
        }, this.connectionProfile);
      }

      if (this.streamingContent.trim()) {
        const aiBlock: Message = {
          id: generateId(),
          role: 'assistant',
          senderId: 'narrator',
          senderName: 'Narrator',
          content: this.streamingContent.trim(),
          timestamp: now(),
          generatedImageRefs: [],
          isPinnedAsMemory: false,
          tokenCount: Math.ceil(this.streamingContent.trim().length / 4),
        };
        this.session.messages.push(aiBlock);
        await this.saveSession();
      }
    } catch (error: any) {
      const toast = await this.toastCtrl.create({
        message: `Error: ${error.message}`, duration: 4000, color: 'danger',
      });
      await toast.present();
    } finally {
      this.isStreaming = false;
      this.streamingContent = '';
      this.scrollToBottom();

      // Trigger auto-extraction every N messages
      if (this.session && this.scenario &&
          this.session.messages.length > 0 &&
          this.session.messages.length % this.AUTO_EXTRACT_INTERVAL === 0) {
        this.autoExtractMemories();
      }
    }
  }

  stopStreaming(): void {
    this.llmProvider.abort();
    if (this.streamingContent.trim() && this.session) {
      const aiBlock: Message = {
        id: generateId(),
        role: 'assistant',
        senderId: 'narrator',
        senderName: 'Narrator',
        content: this.streamingContent.trim(),
        timestamp: now(),
        generatedImageRefs: [],
        isPinnedAsMemory: false,
        tokenCount: Math.ceil(this.streamingContent.trim().length / 4),
      };
      this.session.messages.push(aiBlock);
      this.saveSession();
    }
    this.isStreaming = false;
    this.streamingContent = '';
  }

  // ── Block Actions ──

  async undoLastBlock(): Promise<void> {
    if (!this.session || this.session.messages.length === 0) return;

    const alert = await this.alertCtrl.create({
      header: 'Undo',
      message: 'Remove the last block of text?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Undo', role: 'destructive',
          handler: async () => {
            this.session!.messages.pop();
            await this.saveSession();
          },
        },
      ],
    });
    await alert.present();
  }

  async regenerateLastBlock(): Promise<void> {
    if (!this.session || this.session.messages.length === 0) return;

    const lastMsg = this.session.messages[this.session.messages.length - 1];
    if (lastMsg.role === 'assistant') {
      this.session.messages.pop();
      await this.saveSession();
      await this.generateContinuation();
    }
  }

  async editBlock(index: number): Promise<void> {
    if (!this.session) return;
    const block = this.session.messages[index];

    const alert = await this.alertCtrl.create({
      header: 'Edit Text',
      inputs: [{
        name: 'content',
        type: 'textarea',
        value: block.content,
        placeholder: 'Edit this block...',
      }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data) => {
            if (data.content?.trim()) {
              this.session!.messages[index].content = data.content.trim();
              await this.saveSession();
            }
          },
        },
      ],
    });
    await alert.present();
  }

  // ── Story Menu ──

  async showStoryMenu(): Promise<void> {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Story Options',
      buttons: [
        {
          text: 'Rename Story',
          icon: 'create-outline',
          handler: () => this.renameStory(),
        },
        {
          text: 'Export as Text',
          icon: 'document-text-outline',
          handler: () => this.exportStory(),
        },
        {
          text: 'Save as JSON File',
          icon: 'save-outline',
          handler: () => this.saveStoryAsFile(),
        },
        {
          text: 'Clear Story',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => this.clearStory(),
        },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await actionSheet.present();
  }

  async renameStory(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Rename Story',
      inputs: [{ name: 'title', type: 'text', value: this.session?.title, placeholder: 'Story title' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data) => {
            if (data.title?.trim() && this.session) {
              this.session.title = data.title.trim();
              await this.saveSession();
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async exportStory(): Promise<void> {
    if (!this.session) return;
    const fullText = this.session.messages.map(m => m.content).join('\n\n');
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(this.session.title || 'story').replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    const toast = await this.toastCtrl.create({ message: 'Story exported!', duration: 2000, color: 'success' });
    await toast.present();
  }

  async saveStoryAsFile(): Promise<void> {
    if (!this.session) return;
    try {
      const json = await this.fileIOService.exportSession(this.session.id);
      this.fileIOService.downloadFile(json, `${(this.session.title || 'story').replace(/\s+/g, '_')}_session.json`);
      const toast = await this.toastCtrl.create({ message: 'Story saved as JSON!', duration: 2000, color: 'success' });
      await toast.present();
    } catch (e: any) {
      const toast = await this.toastCtrl.create({ message: `Save failed: ${e.message}`, duration: 3000, color: 'danger' });
      await toast.present();
    }
  }

  async clearStory(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Clear Story',
      message: 'Delete all story content? This cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Clear', role: 'destructive',
          handler: async () => {
            if (this.session) {
              this.session.messages = [];
              await this.saveSession();
            }
          },
        },
      ],
    });
    await alert.present();
  }

  // ── Helpers ──

  private buildStorySystemPrompt(): string {
    const charDescriptions = this.activeCharacters
      .map(c => `${c.name}: ${c.description || ''} ${c.personality || ''}`.trim())
      .filter(d => d)
      .join('\n');

    const povText = this.pov === '1st-person'
      ? `Write in first person perspective from the viewpoint of ${this.persona?.name || 'the protagonist'}.`
      : `Write in third person perspective.`;

    const tenseText = this.tense === 'past'
      ? 'Use past tense.'
      : 'Use present tense.';

    let prompt = `You are a creative fiction writer collaborating on an interactive story.
${povText} ${tenseText}

Write prose fiction — descriptions, dialogue, actions, and inner thoughts. Do NOT break character or add meta-commentary.
Continue the story naturally, maintaining consistency with what came before.
Keep your writing vivid, engaging, and immersive. Vary sentence length and structure.
When writing dialogue, use quotation marks.`;

    if (this.scenario?.specialInstructions) {
      prompt += `\n\nScenario Instructions:\n${this.scenario.specialInstructions}`;
    }

    if (charDescriptions) {
      prompt += `\n\nCharacters:\n${charDescriptions}`;
    }

    if (this.authorsNote.trim()) {
      prompt += `\n\n[Author's Note: ${this.authorsNote.trim()}]`;
    }

    return prompt;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isStreaming) {
      event.preventDefault();
      this.stopStreaming();
      return;
    }
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      this.generateContinuation();
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitUserText();
    }
  }

  formatProse(content: string): string {
    if (!content) return '';
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  trackByBlockIndex(index: number): number {
    return index;
  }

  focusInput(): void {
    setTimeout(() => {
      this.storyInputEl?.nativeElement?.focus();
    }, 100);
  }

  private async saveSession(): Promise<void> {
    if (this.session) {
      await this.chatSessionService.updateSession(this.session.id, {
        messages: this.session.messages,
        title: this.session.title,
      });
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      this.storyContentRef?.scrollToBottom(200);
    }, 50);
  }

  goBack(): void {
    this.router.navigateByUrl('/gallery');
  }

  goToSettings(): void {
    this.router.navigateByUrl('/settings');
  }

  // ── Memory Methods ──

  async pinBlockAsMemory(block: Message): Promise<void> {
    if (!this.session || !this.scenario) return;

    if (block.isPinnedAsMemory) {
      const toast = await this.toastCtrl.create({
        message: 'This block is already pinned as a memory',
        duration: 2000,
      });
      await toast.present();
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Pin as Memory',
      message: 'Save this story segment as a memory entry?',
      inputs: [{
        name: 'summary',
        type: 'textarea',
        value: block.content.length > 200
          ? block.content.substring(0, 200) + '...'
          : block.content,
        placeholder: 'Memory summary...',
      }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Pin',
          handler: async (data) => {
            if (data.summary?.trim()) {
              await this.memoryService.pinMessageAsMemory(
                block,
                this.session!.id,
                this.scenario!.id,
                data.summary.trim()
              );

              block.isPinnedAsMemory = true;
              await this.saveSession();

              const toast = await this.toastCtrl.create({
                message: '📌 Memory saved!',
                duration: 2000,
                color: 'success',
              });
              await toast.present();
            }
          },
        },
      ],
    });
    await alert.present();
  }

  private async autoExtractMemories(): Promise<void> {
    if (!this.session || !this.scenario) return;

    try {
      const newMemories = await this.memoryService.autoExtractMemories(
        this.session.messages,
        this.session.id,
        this.scenario.id
      );

      if (newMemories.length > 0) {
        const toast = await this.toastCtrl.create({
          message: `🧠 ${newMemories.length} memor${newMemories.length === 1 ? 'y' : 'ies'} auto-extracted`,
          duration: 3000,
          color: 'tertiary',
        });
        await toast.present();
      }
    } catch (error) {
      console.warn('Auto-extraction failed (non-fatal):', error);
    }
  }
}
