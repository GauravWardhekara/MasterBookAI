import { Component, OnInit, OnDestroy, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonButtons, IonFooter,
  AlertController, ToastController, ActionSheetController, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, sendOutline, settingsOutline, refreshOutline,
  createOutline, trashOutline, copyOutline, stopCircleOutline,
  ellipsisVerticalOutline, chatbubblesOutline, bookOutline,
  personOutline, chevronDownOutline, sparklesOutline,
  bookmarkOutline, bulbOutline, imageOutline,
  chevronBackOutline, chevronForwardOutline, cloudUploadOutline
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
import { MemoryService } from '../../core/services/memory.service';
import { ChatSetupModalComponent } from '../../shared/components/chat-setup-modal/chat-setup-modal.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="goBack()">
            <ion-icon slot="icon-only" name="arrow-back-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ session?.title || 'Chat' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="openChatSettings()">
            <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="showChatMenu()">
            <ion-icon slot="icon-only" name="ellipsis-vertical-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    
      <!-- Connection indicator -->
      @if (connectionProfile) {
        <ion-toolbar class="connection-bar">
          <div class="connection-indicator">
            <div class="conn-dot" [class.connected]="!!connectionProfile"></div>
            <span class="conn-label">{{ connectionProfile.name }}</span>
            @if (activeModel) {
              <span class="conn-model">{{ activeModel }}</span>
            }
            @if (injectedMemoryCount > 0) {
              <span class="memory-indicator">
                <ion-icon name="bulb-outline"></ion-icon>
                {{ injectedMemoryCount }} memories
              </span>
            }
          </div>
        </ion-toolbar>
      }
    </ion-header>
    
    <ion-content #chatContent class="chat-content">
      <div class="chat-container">
        <!-- No connection warning -->
        @if (!connectionProfile) {
          <div class="no-connection-banner mb-fade-in">
            <ion-icon name="settings-outline"></ion-icon>
            <span>No LLM connection configured.</span>
            <ion-button fill="clear" size="small" (click)="goToSettings()">
              <ion-icon slot="start" name="settings-outline"></ion-icon>
              Set Up Connection
            </ion-button>
          </div>
        }
    
        <!-- Session not found -->
        @if (!session) {
          <div class="mb-empty-state">
            <h3>Session Not Found</h3>
            <p>This chat session may have been deleted</p>
          </div>
        }
    
        <!-- Messages area -->
        @if (session) {
          <div class="messages-area">
            <!-- Scenario header card -->
            @if (scenario) {
              <div class="scenario-header mb-glass-card mb-fade-in">
                <div class="sc-header-icon">{{ scenario.defaultMode === 'chat' ? '💬' : '📖' }}</div>
                <div class="sc-header-info">
                  <div class="sc-header-title">{{ scenario.title }}</div>
                  <div class="sc-header-meta">
                    {{ activeCharacters.length }} character{{ activeCharacters.length !== 1 ? 's' : '' }}
                    · {{ scenario.defaultMode | titlecase }} mode
                  </div>
                </div>
              </div>
            }

            <!-- Message Bubbles -->
            @for (msg of session.messages; track trackByMsgId(i, msg); let i = $index) {
              <div
                class="message-row mb-fade-in"
                [class.user-msg]="msg.role === 'user'"
                [class.assistant-msg]="msg.role === 'assistant'"
                [class.system-msg]="msg.role === 'system' || msg.role === 'narrator'">
                <!-- Avatar (assistant/system only) -->
                @if (msg.role !== 'user') {
                  <div class="msg-avatar-col">
                    @if (getCharacterAvatar(msg.senderId)) {
                      <div class="msg-avatar">
                        <img [src]="getCharacterAvatar(msg.senderId)" alt="" />
                      </div>
                    }
                    @if (!getCharacterAvatar(msg.senderId)) {
                      <div class="msg-avatar placeholder-avatar">
                        {{ (msg.senderName || '?').charAt(0) }}
                      </div>
                    }
                  </div>
                }
                <div class="msg-bubble-col" [class.right]="msg.role === 'user'">
                  @if (msg.role !== 'user') {
                    <div class="msg-sender">{{ msg.senderName }}</div>
                  }
                  <div class="msg-bubble" [class.user-bubble]="msg.role === 'user'"
                    [class.ai-bubble]="msg.role === 'assistant'"
                    [class.sys-bubble]="msg.role === 'system' || msg.role === 'narrator'">
                    <div class="msg-text" [innerHTML]="formatMessage(msg.content)"></div>
                    @if (msg.alternates && msg.alternates.length > 1) {
                      <div class="msg-swipe-controls">
                        <ion-button fill="clear" size="small" (click)="prevAlternate(msg)">
                          <ion-icon name="chevron-back-outline" slot="icon-only"></ion-icon>
                        </ion-button>
                        <span class="swipe-counter">{{ (msg.activeAlternateIndex || 0) + 1 }} / {{ msg.alternates.length }}</span>
                        <ion-button fill="clear" size="small" (click)="nextAlternate(msg)">
                          <ion-icon name="chevron-forward-outline" slot="icon-only"></ion-icon>
                        </ion-button>
                      </div>
                    }
                    @if (msg.generatedImageRefs && msg.generatedImageRefs.length > 0) {
                      <div class="msg-images">
                        @for (imgUrl of msg.generatedImageRefs; track imgUrl) {
                          <img [src]="imgUrl" alt="Generated" class="msg-gen-image" />
                        }
                      </div>
                    }
                  </div>
                  <div class="msg-meta">
                    <span class="msg-time">{{ formatTime(msg.timestamp) }}</span>
                    @if (!isStreaming) {
                      <div class="msg-actions">
                        <ion-button fill="clear" size="small" (click)="copyMessage(msg)">
                          <ion-icon slot="icon-only" name="copy-outline"></ion-icon>
                        </ion-button>
                        <ion-button fill="clear" size="small" (click)="pinAsMemory(msg)" title="Pin as Memory"
                          [color]="msg.isPinnedAsMemory ? 'warning' : undefined">
                          <ion-icon slot="icon-only" name="bookmark-outline"></ion-icon>
                        </ion-button>
                        <ion-button fill="clear" size="small" (click)="openImageGen(msg)" title="Generate Image">
                          <ion-icon slot="icon-only" name="image-outline"></ion-icon>
                        </ion-button>
                        @if (msg.role === 'assistant') {
                          <ion-button
                            fill="clear" size="small" (click)="regenerateMessage(msg, i)" title="Regenerate/Swipe">
                            <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
                          </ion-button>
                          <ion-button
                            fill="clear" size="small" (click)="continueMessage(msg, i)" title="Continue Message">
                            <ion-icon slot="icon-only" name="chevron-forward-outline"></ion-icon>
                          </ion-button>
                        }
                        <ion-button fill="clear" size="small" color="danger" (click)="deleteMessage(i)">
                          <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                        </ion-button>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
            <!-- Streaming indicator -->
            @if (isStreaming) {
              <div class="message-row assistant-msg streaming-row mb-fade-in">
                <div class="msg-avatar-col">
                  <div class="msg-avatar placeholder-avatar streaming-avatar">
                    <ion-icon name="sparkles-outline"></ion-icon>
                  </div>
                </div>
                <div class="msg-bubble-col">
                  <div class="msg-sender">{{ streamingSenderName }}</div>
                  <div class="msg-bubble ai-bubble">
                    <div class="msg-text" [innerHTML]="formatMessage(streamingContent)"></div>
                    <span class="typing-cursor">▊</span>
                  </div>
                </div>
              </div>
            }
            <!-- Scroll anchor -->
            <div #scrollAnchor></div>
          </div>
        }
      </div>
    </ion-content>
    
    @if (session) {
      <ion-footer>
        <ion-toolbar class="chat-input-toolbar">
          <div class="chat-input-row">
            <textarea #messageInput
              class="chat-input"
              [placeholder]="isStreaming ? 'AI is typing...' : 'Type a message...'"
              [(ngModel)]="inputText"
              (keydown)="onKeyDown($event)"
              [disabled]="isStreaming"
              rows="1"
            ></textarea>
            @if (!isStreaming) {
              <ion-button class="action-btn" fill="clear" (click)="impersonate()" title="Impersonate (AI speaks as you)">
                <ion-icon slot="icon-only" name="person-outline"></ion-icon>
              </ion-button>
              <ion-button class="send-btn"
                [disabled]="!inputText.trim() || !connectionProfile"
                fill="clear" (click)="sendMessage()">
                <ion-icon slot="icon-only" name="send-outline"></ion-icon>
              </ion-button>
            }
            @if (isStreaming) {
              <ion-button class="stop-btn" fill="clear" (click)="stopStreaming()">
                <ion-icon slot="icon-only" name="stop-circle-outline"></ion-icon>
              </ion-button>
            }
          </div>
        </ion-toolbar>
      </ion-footer>
    }
    `,
  styles: [`
    .chat-content { --background: var(--mb-bg-deep); }

    .connection-bar {
      --min-height: 28px; --padding-top: 0; --padding-bottom: 0;
      --background: var(--mb-bg-secondary);
    }
    .connection-indicator {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 16px; font-size: 11px; color: var(--mb-text-muted);
    }
    .conn-dot {
      width: 6px; height: 6px; border-radius: 50%; background: var(--mb-text-muted);
    }
    .conn-dot.connected { background: var(--mb-success); box-shadow: 0 0 4px rgba(52, 211, 153, 0.4); }
    .conn-label { font-weight: 500; }
    .conn-model { font-family: monospace; font-size: 10px; color: var(--mb-primary); }
    .memory-indicator {
      display: flex; align-items: center; gap: 3px;
      font-size: 10px; color: var(--mb-accent);
      margin-left: auto;
    }
    .memory-indicator ion-icon { font-size: 12px; }

    .no-connection-banner {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 16px; margin: 12px; border-radius: var(--mb-radius-md);
      background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.2);
      font-size: 13px; color: var(--mb-text-secondary);
    }
    .no-connection-banner ion-icon { color: var(--mb-danger); font-size: 18px; }

    .chat-container { min-height: 100%; display: flex; flex-direction: column; }
    .messages-area { flex: 1; padding: 12px 16px 24px; }

    .scenario-header {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px; margin-bottom: 20px;
    }
    .sc-header-icon { font-size: 28px; }
    .sc-header-info { flex: 1; }
    .sc-header-title { font-weight: 700; font-size: 16px; color: var(--mb-text-primary); }
    .sc-header-meta { font-size: 12px; color: var(--mb-text-muted); }

    /* Greeting */
    .greeting-card {
      text-align: center; padding: 24px;
      background: var(--mb-bg-card); border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius-lg); margin-bottom: 20px;
    }
    .greeting-avatar { display: flex; justify-content: center; margin-bottom: 12px; }
    .greeting-name { font-weight: 700; font-size: 15px; color: var(--mb-text-primary); margin-bottom: 8px; }
    .greeting-text { font-size: 14px; color: var(--mb-text-secondary); line-height: 1.5; white-space: pre-wrap; }
    .use-greeting-btn { margin-top: 12px; font-size: 12px; }

    /* Messages */
    .message-row {
      display: flex; gap: 10px; margin-bottom: 16px;
      max-width: 85%; animation: mb-fade-in 0.2s ease forwards;
    }
    .message-row.user-msg { margin-left: auto; flex-direction: row-reverse; }
    .message-row.system-msg { max-width: 100%; justify-content: center; }

    .msg-swipe-controls {
      display: flex; align-items: center; justify-content: flex-end; gap: 4px;
      margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(128, 128, 128, 0.15);
    }
    .msg-swipe-controls ion-button {
      --padding-start: 4px; --padding-end: 4px; height: 24px; min-height: 24px; font-size: 16px; color: var(--mb-text-muted);
    }
    .swipe-counter { font-size: 11px; color: var(--mb-text-muted); min-width: 32px; text-align: center; font-weight: 500; }

    .msg-avatar-col { flex-shrink: 0; padding-top: 2px; }
    .msg-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      overflow: hidden; border: 2px solid var(--mb-border);
    }
    .msg-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .placeholder-avatar {
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, var(--mb-primary-dark), var(--mb-primary));
      color: white; font-weight: 700; font-size: 14px;
    }
    .streaming-avatar {
      background: linear-gradient(135deg, var(--mb-accent), var(--mb-primary));
      animation: pulse-glow 1.5s ease-in-out infinite;
    }
    .streaming-avatar ion-icon { font-size: 18px; }

    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 4px rgba(167, 139, 250, 0.3); }
      50% { box-shadow: 0 0 12px rgba(167, 139, 250, 0.6); }
    }

    .msg-bubble-col { flex: 1; min-width: 0; }
    .msg-bubble-col.right { display: flex; flex-direction: column; align-items: flex-end; }

    .msg-sender {
      font-size: 12px; font-weight: 600; color: var(--mb-primary);
      margin-bottom: 4px; padding-left: 2px;
    }

    .msg-bubble {
      padding: 10px 14px; border-radius: 16px;
      font-size: 14px; line-height: 1.55; word-break: break-word;
      position: relative;
    }

    .user-bubble {
      background: linear-gradient(135deg, var(--mb-primary), var(--mb-primary-dark));
      color: white; border-bottom-right-radius: 4px;
    }

    .ai-bubble {
      background: var(--mb-bg-card); color: var(--mb-text-primary);
      border: 1px solid var(--mb-border); border-bottom-left-radius: 4px;
    }

    .sys-bubble {
      background: rgba(245, 158, 11, 0.08); color: var(--mb-text-secondary);
      border: 1px solid rgba(245, 158, 11, 0.15); border-radius: 12px;
      font-size: 13px; font-style: italic; text-align: center;
    }

    .msg-text { white-space: pre-wrap; }

    .msg-images { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .msg-gen-image {
      max-width: 200px; max-height: 200px; border-radius: var(--mb-radius-md);
      border: 1px solid var(--mb-border); cursor: pointer;
      transition: transform 150ms ease;
    }
    .msg-gen-image:hover { transform: scale(1.05); }

    .typing-cursor {
      display: inline-block; animation: blink 0.8s step-end infinite;
      color: var(--mb-primary); font-size: 14px; vertical-align: text-bottom;
    }
    @keyframes blink { 50% { opacity: 0; } }

    .msg-meta {
      display: flex; align-items: center; gap: 4px; margin-top: 3px;
      padding: 0 2px;
    }
    .msg-time { font-size: 11px; color: var(--mb-text-muted); }
    .msg-actions { display: flex; gap: 0; }
    .msg-actions ion-button {
      --padding-start: 4px; --padding-end: 4px;
      font-size: 12px; height: 24px;
    }

    .streaming-row { opacity: 1; }

    /* Input */
    .chat-input-toolbar {
      --background: var(--mb-bg-secondary);
      --border-color: var(--mb-border);
    }
    .chat-input-row {
      display: flex; align-items: flex-end; gap: 8px;
      padding: 8px 12px;
    }
    .chat-input {
      flex: 1; background: var(--mb-bg-input);
      border: 1px solid var(--mb-border); border-radius: 20px;
      padding: 10px 16px; color: var(--mb-text-primary);
      font-size: 14px; outline: none; resize: none;
      font-family: inherit; max-height: 120px; line-height: 1.4;
    }
    .chat-input:focus { border-color: var(--mb-border-focus); }
    .chat-input:disabled { opacity: 0.5; }
    .send-btn { --color: var(--mb-primary); }
    .send-btn[disabled] { --color: var(--mb-text-muted); opacity: 0.4; }
    .stop-btn { --color: var(--mb-danger); }
  `],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonButtons, IonFooter
  ],
})
export class ChatPage implements OnInit, OnDestroy {
  session?: ChatSession;
  scenario?: Scenario;
  persona?: Persona;
  activeCharacters: Character[] = [];
  lorebooks: Lorebook[] = [];
  connectionProfile?: ConnectionProfile;
  activeModel?: string;
  private connectionSub?: Subscription;

  inputText = '';
  isStreaming = false;
  streamingContent = '';
  streamingSenderName = 'AI';
  greeting?: string;
  injectedMemoryCount = 0;

  /** Auto-extraction triggers every N messages */
  private readonly AUTO_EXTRACT_INTERVAL = 10;

  @ViewChild('scrollAnchor') scrollAnchor!: ElementRef;
  @ViewChild('chatContent') chatContent!: IonContent;

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
    private memoryService: MemoryService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private modalCtrl: ModalController,
  ) {
    addIcons({
      arrowBackOutline, sendOutline, settingsOutline, refreshOutline,
      createOutline, trashOutline, copyOutline, stopCircleOutline,
      ellipsisVerticalOutline, chatbubblesOutline, bookOutline,
      personOutline, chevronDownOutline, sparklesOutline,
      bookmarkOutline, bulbOutline, imageOutline,
      chevronBackOutline, chevronForwardOutline, cloudUploadOutline
    });
  }

  async ngOnInit(): Promise<void> {
    const sessionId = this.route.snapshot.paramMap.get('sessionId');
    if (!sessionId) return;

    // Load session
    this.session = await this.chatSessionService.getSession(sessionId);
    if (!this.session) return;

    // Load scenario, characters, lorebooks
    this.scenario = await this.scenarioService.getScenario(this.session.scenarioId);
    if (this.scenario) {
      this.activeCharacters = await this.characterService.getCharactersByIds(this.scenario.characterIds);
      this.lorebooks = await this.lorebookService.getLorebooksByIds(this.scenario.lorebookIds);
    }

    // Load persona
    const persona = await this.characterService.getDefaultPersona();
    this.persona = persona || { id: 'default-persona', name: 'User', description: '', isDefault: true, createdAt: now(), updatedAt: now() };

    // Subscribe to connection updates
    this.connectionSub = this.connectionService.activeProfile$.subscribe(profile => {
      this.connectionProfile = profile;
      if (this.connectionProfile && this.connectionProfile.modelList && this.connectionProfile.modelList.length > 0) {
        if (!this.activeModel || !this.connectionProfile.modelList.includes(this.activeModel)) {
          this.activeModel = this.connectionProfile.defaultModel || this.connectionProfile.modelList[0];
          if (this.activeModel && !this.connectionProfile.modelList.includes(this.activeModel)) {
            this.activeModel = this.connectionProfile.modelList[0];
          }
        }
      } else {
        this.activeModel = undefined;
      }
    });

    // Set greeting from first character
    if (this.activeCharacters.length > 0 && this.session.messages.length === 0) {
      const firstChar = this.activeCharacters[0];
      if (firstChar.greetingMessages?.length > 0 && firstChar.greetingMessages[0].trim()) {
        this.greeting = firstChar.greetingMessages[0];
      }
    }

    // Scroll to bottom
    setTimeout(() => this.scrollToBottom(), 100);
  }

  ngOnDestroy(): void {
    if (this.connectionSub) this.connectionSub.unsubscribe();
  }

  // ── Messaging ──

  async sendMessage(): Promise<void> {
    if (!this.inputText.trim() || !this.session || !this.connectionProfile) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      senderId: this.persona?.id || 'user',
      senderName: this.persona?.name || 'User',
      content: this.inputText.trim(),
      timestamp: now(),
      generatedImageRefs: [],
      isPinnedAsMemory: false,
      tokenCount: Math.ceil(this.inputText.trim().length / 4),
    };

    this.session.messages.push(userMessage);
    this.inputText = '';
    await this.saveSession();
    this.scrollToBottom();

    // Generate AI response
    await this.generateResponse();
  }

  async generateResponse(isImpersonating = false, continueTarget?: Message): Promise<void> {
    if (!this.session || !this.scenario || !this.persona || !this.connectionProfile) return;

    this.isStreaming = true;
    this.streamingContent = '';

    // Determine which character is responding
    let respondingChar: any;
    
    if (isImpersonating) {
      this.streamingSenderName = this.persona?.name || 'User';
      respondingChar = this.persona;
    } else if (continueTarget) {
      this.streamingSenderName = continueTarget.senderName;
      respondingChar = { id: continueTarget.senderId, name: continueTarget.senderName };
    } else {
      respondingChar = this.activeCharacters.find(c =>
        this.scenario!.characterRoles[c.id] === 'npc'
      ) || this.activeCharacters[0];
      this.streamingSenderName = respondingChar?.name || 'AI';
    }

    try {
      // Assemble prompt
      const assembled = await this.promptAssembly.assemble(
        this.scenario,
        this.persona,
        this.activeCharacters,
        this.session.messages,
        this.lorebooks,
        this.connectionProfile.contextSize
      );

      // Update memory injection indicator
      this.injectedMemoryCount = assembled.injectedMemories.length;

      // Convert to LLM format
      const llmMessages = this.llmProvider.convertMessages(
        assembled.messages,
        assembled.systemPrompt,
        this.connectionProfile.promptTemplate
      );

      if (this.connectionProfile.streamingEnabled) {
        // Streaming mode
        for await (const chunk of this.llmProvider.stream(llmMessages, {
          model: this.activeModel,
          temperature: this.connectionProfile.defaultSampling?.temperature,
          maxTokens: this.connectionProfile.defaultSampling?.maxTokens,
        }, this.connectionProfile)) {
          if (chunk.done) break;
          this.ngZone.run(() => {
            this.streamingContent += chunk.content;
          });
          this.scrollToBottom();
        }
      } else {
        // Non-streaming mode
        this.streamingContent = await this.llmProvider.complete(llmMessages, {
          model: this.activeModel,
          temperature: this.connectionProfile.defaultSampling?.temperature,
          maxTokens: this.connectionProfile.defaultSampling?.maxTokens,
        }, this.connectionProfile);
      }

      // Handle the completed response
      const finalContent = this.streamingContent.trim();
      if (finalContent) {
        if (continueTarget) {
          // Remove the temporary system message
          this.session.messages.pop();
          // Append to the target message
          continueTarget.content = (continueTarget.content + ' ' + finalContent).trim();
          continueTarget.tokenCount = Math.ceil(continueTarget.content.length / 4);
        } else {
          // If we were impersonating, remove the temporary system message
          if (isImpersonating) {
             this.session.messages.pop();
          }
          
          const newMessage: Message = {
            id: generateId(),
            role: isImpersonating ? 'user' : 'assistant',
            senderId: respondingChar?.id || 'ai',
            senderName: respondingChar?.name || 'AI',
            content: finalContent,
            timestamp: now(),
            generatedImageRefs: [],
            isPinnedAsMemory: false,
            tokenCount: Math.ceil(finalContent.length / 4),
          };
          this.session.messages.push(newMessage);
        }
        await this.saveSession();
      }
    } catch (error: any) {
      const toast = await this.toastCtrl.create({
        message: `Error: ${error.message}`,
        duration: 4000,
        color: 'danger',
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

  async regenerateMessage(msg: Message, index: number): Promise<void> {
    if (!this.session || !this.scenario || !this.persona || !this.connectionProfile || this.isStreaming) return;

    this.isStreaming = true;
    this.streamingContent = '';

    // Determine which character is responding
    const respondingChar = this.activeCharacters.find(c =>
      this.scenario!.characterRoles[c.id] === 'npc'
    ) || this.activeCharacters[0];
    this.streamingSenderName = respondingChar?.name || 'AI';

    try {
      // Assemble prompt using messages ONLY up to (but not including) the target message
      const messagesUpToIndex = this.session.messages.slice(0, index);
      const assembled = await this.promptAssembly.assemble(
        this.scenario,
        this.persona,
        this.activeCharacters,
        messagesUpToIndex,
        this.lorebooks,
        this.connectionProfile.contextSize
      );

      // Convert to LLM format
      const llmMessages = this.llmProvider.convertMessages(
        assembled.messages,
        assembled.systemPrompt,
        this.connectionProfile.promptTemplate
      );

      let newContent = '';

      if (this.connectionProfile.streamingEnabled) {
        for await (const chunk of this.llmProvider.stream(llmMessages, {
          model: this.activeModel,
          temperature: this.connectionProfile.defaultSampling?.temperature,
          maxTokens: this.connectionProfile.defaultSampling?.maxTokens,
        }, this.connectionProfile)) {
          if (chunk.done) break;
          this.ngZone.run(() => {
            newContent += chunk.content;
            this.streamingContent = newContent;
          });
          this.scrollToBottom();
        }
      } else {
        newContent = await this.llmProvider.complete(llmMessages, {
          model: this.activeModel,
          temperature: this.connectionProfile.defaultSampling?.temperature,
          maxTokens: this.connectionProfile.defaultSampling?.maxTokens,
        }, this.connectionProfile);
      }

      if (newContent.trim()) {
        // Initialize alternates if needed
        if (!msg.alternates) {
          msg.alternates = [msg.content];
        }
        
        // Ensure the current content is in the alternates array
        if (!msg.alternates.includes(msg.content)) {
            msg.alternates.push(msg.content);
        }

        // Add the new generation
        const cleanContent = newContent.trim();
        if (!msg.alternates.includes(cleanContent)) {
          msg.alternates.push(cleanContent);
        }

        msg.content = cleanContent;
        msg.activeAlternateIndex = msg.alternates.indexOf(cleanContent);
        msg.tokenCount = Math.ceil(cleanContent.length / 4);

        await this.saveSession();
      }
    } catch (error: any) {
      const toast = await this.toastCtrl.create({
        message: `Error: ${error.message}`,
        duration: 4000,
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.isStreaming = false;
      this.streamingContent = '';
    }
  }

  async deleteMessage(index: number): Promise<void> {
    if (!this.session) return;

    const alert = await this.alertCtrl.create({
      header: 'Delete Message',
      message: 'Delete this message?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: async () => {
            this.session!.messages.splice(index, 1);
            await this.saveSession();
          },
        },
      ],
    });
    await alert.present();
  }

  async copyMessage(msg: Message): Promise<void> {
    try {
      await navigator.clipboard.writeText(msg.content);
      const toast = await this.toastCtrl.create({ message: 'Copied!', duration: 1500, color: 'success' });
      await toast.present();
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = msg.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  stopStreaming(): void {
    this.llmProvider.abort();
    // Finalize whatever was streamed so far
    if (this.streamingContent.trim() && this.session) {
      const respondingChar = this.activeCharacters.find(c =>
        this.scenario?.characterRoles[c.id] === 'npc'
      ) || this.activeCharacters[0];

      const aiMessage: Message = {
        id: generateId(),
        role: 'assistant',
        senderId: respondingChar?.id || 'ai',
        senderName: respondingChar?.name || 'AI',
        content: this.streamingContent.trim(),
        timestamp: now(),
        generatedImageRefs: [],
        isPinnedAsMemory: false,
        tokenCount: Math.ceil(this.streamingContent.trim().length / 4),
      };
      this.session.messages.push(aiMessage);
      this.saveSession();
    }
    this.isStreaming = false;
    this.streamingContent = '';
  }

  prevAlternate(msg: Message): void {
    if (!msg.alternates || msg.alternates.length <= 1) return;
    let idx = msg.activeAlternateIndex || 0;
    idx = (idx - 1 + msg.alternates.length) % msg.alternates.length;
    msg.activeAlternateIndex = idx;
    msg.content = msg.alternates[idx];
    this.saveSession();
  }

  nextAlternate(msg: Message): void {
    if (!msg.alternates || msg.alternates.length <= 1) return;
    let idx = msg.activeAlternateIndex || 0;
    idx = (idx + 1) % msg.alternates.length;
    msg.activeAlternateIndex = idx;
    msg.content = msg.alternates[idx];
    this.saveSession();
  }

  // ── Advanced Chat Actions ──

  async impersonate(): Promise<void> {
    if (!this.session || this.isStreaming) return;
    
    // Set a temporary input text that tells the system to impersonate
    const impersonateInstruction = `[System Note: Write the next response strictly from the perspective of ${this.persona?.name || 'the User'}. Do not write as the AI character.]`;
    
    // Add a temporary system message to force impersonation
    this.session.messages.push({
      id: generateId(),
      role: 'system',
      senderId: 'system',
      senderName: 'System',
      content: impersonateInstruction,
      timestamp: now(),
      generatedImageRefs: [],
      isPinnedAsMemory: false,
      tokenCount: Math.ceil(impersonateInstruction.length / 4)
    });

    await this.generateResponse(true); // pass flag if needed, but the system message does the work
  }

  async continueMessage(msg: Message, index: number): Promise<void> {
    if (!this.session || this.isStreaming) return;

    // To continue a message with a Chat API, we typically append a system instruction
    // telling the AI to seamlessly continue the exact last message.
    const continueInstruction = `[System Note: Seamlessly continue the previous message from where it left off. Do not add any introductory text, just append the next sentence.]`;
    
    this.session.messages.push({
      id: generateId(),
      role: 'system',
      senderId: 'system',
      senderName: 'System',
      content: continueInstruction,
      timestamp: now(),
      generatedImageRefs: [],
      isPinnedAsMemory: false,
      tokenCount: Math.ceil(continueInstruction.length / 4)
    });

    await this.generateResponse(false, msg); 
  }

  // ── Chat Menu ──

  async showChatMenu(): Promise<void> {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Chat Options',
      buttons: [
        {
          text: 'Rename Chat',
          icon: 'create-outline',
          handler: () => this.renameChat(),
        },
        {
          text: 'Import SillyTavern Chat (.jsonl)',
          icon: 'cloud-upload-outline',
          handler: () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.jsonl';
            input.onchange = (e) => this.importSillyTavernChat(e);
            input.click();
          },
        },
        {
          text: 'Clear Messages',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => this.clearMessages(),
        },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await actionSheet.present();
  }

  async importSillyTavernChat(event: Event): Promise<void> {
    if (!this.session) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      const newMessages: Message[] = [];
      for (const line of lines) {
        try {
          const msgData = JSON.parse(line);
          const isUser = msgData.is_user || msgData.is_system === false && msgData.name === this.persona?.name;
          
          let role: 'user' | 'assistant' | 'system' = 'assistant';
          if (msgData.is_user) role = 'user';
          if (msgData.is_system) role = 'system';
          
          let alternates = [msgData.mes];
          if (msgData.extra && msgData.extra.swipes) {
            alternates = msgData.extra.swipes;
          }
          
          newMessages.push({
            id: generateId(),
            role,
            senderId: role === 'user' ? (this.persona?.id || 'user') : (msgData.name || 'ai'),
            senderName: msgData.name || (role === 'user' ? 'User' : 'AI'),
            content: msgData.mes || '',
            timestamp: msgData.send_date ? new Date(msgData.send_date).toISOString() : now(),
            generatedImageRefs: [],
            isPinnedAsMemory: false,
            tokenCount: Math.ceil((msgData.mes || '').length / 4),
            alternates: alternates,
            activeAlternateIndex: msgData.extra?.active_swipe_id || 0
          });
        } catch (e) {
          console.warn('Failed to parse chat line', e);
        }
      }

      if (newMessages.length > 0) {
        this.session.messages = [...this.session.messages, ...newMessages];
        await this.saveSession();
        const toast = await this.toastCtrl.create({ message: `Imported ${newMessages.length} messages!`, duration: 2000, color: 'success' });
        await toast.present();
        this.scrollToBottom();
      }
    } catch (e) {
      const toast = await this.toastCtrl.create({ message: 'Failed to import chat', duration: 3000, color: 'danger' });
      await toast.present();
    }
    input.value = '';
  }

  async openChatSettings(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ChatSetupModalComponent,
      componentProps: { 
        isEditMode: true,
        session: this.session
      }
    });
    
    await modal.present();
    const { data } = await modal.onWillDismiss();
    
    if (data && this.session) {
      this.session.activeModel = data.model;
      this.session.activePresetId = data.presetId;
      this.session.activeSystemPrompt = data.systemPrompt;
      this.session.activeSamplingOverrides = data.params;
      this.activeModel = data.model;
      await this.saveSession();
      
      const toast = await this.toastCtrl.create({
        message: 'Chat settings updated.',
        duration: 2000, color: 'success'
      });
      await toast.present();
    }
  }

  async renameChat(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Rename Chat',
      inputs: [{ name: 'title', type: 'text', value: this.session?.title, placeholder: 'Chat title' }],
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

  async clearMessages(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Clear Messages',
      message: 'Delete all messages in this chat? This cannot be undone.',
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

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  getCharacterAvatar(senderId: string): string | undefined {
    return this.activeCharacters.find(c => c.id === senderId)?.avatar;
  }

  formatMessage(content: string): string {
    if (!content) return '';
    // Basic markdown-like formatting
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  formatTime(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  trackByMsgId(index: number, msg: Message): string {
    return msg.id;
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
      this.chatContent?.scrollToBottom(200);
    }, 50);
  }

  goBack(): void {
    this.router.navigateByUrl('/gallery');
  }

  goToSettings(): void {
    this.router.navigateByUrl('/settings');
  }

  // ── Memory Methods ──

  async pinAsMemory(msg: Message): Promise<void> {
    if (!this.session || !this.scenario) return;

    if (msg.isPinnedAsMemory) {
      const toast = await this.toastCtrl.create({
        message: 'This message is already pinned as a memory',
        duration: 2000,
      });
      await toast.present();
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Pin as Memory',
      message: 'Save this message as a memory entry? You can optionally edit the summary.',
      inputs: [{
        name: 'summary',
        type: 'textarea',
        value: msg.content.length > 200
          ? msg.content.substring(0, 200) + '...'
          : msg.content,
        placeholder: 'Memory summary...',
      }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Pin',
          handler: async (data) => {
            if (data.summary?.trim()) {
              await this.memoryService.pinMessageAsMemory(
                msg,
                this.session!.id,
                this.scenario!.id,
                data.summary.trim()
              );

              // Mark the message as pinned
              msg.isPinnedAsMemory = true;
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

  // ── Image Generation ──

  async openImageGen(msg: Message): Promise<void> {
    const { ImageGenPage } = await import('../image-gen/image-gen.page');
    const modal = await this.modalCtrl.create({
      component: ImageGenPage,
      componentProps: {
        messages: this.session?.messages || [],
        sessionId: this.session?.id,
        linkedMessageId: msg.id,
      },
    });
    await modal.present();

    // Reload session after modal closes to pick up attached images
    await modal.onDidDismiss();
    if (this.session) {
      const updated = await this.chatSessionService.getSession(this.session.id);
      if (updated) {
        this.session = updated;
      }
    }
  }
}
