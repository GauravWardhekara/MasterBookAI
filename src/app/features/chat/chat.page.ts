import { Component, inject, signal, viewChild, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonButtons, IonMenuButton, IonBackButton,
  IonList, IonItem, IonLabel, IonIcon,
  IonFooter, IonTextarea, IonFab, IonFabButton,
  IonActionSheet, IonRefresher, IonRefresherContent,
  IonSelect, IonSelectOption, IonSpinner,
  ToastController, ModalController, ActionSheetController,
} from '@ionic/angular/standalone';
import { ChatEngineService } from '../../core/services/chat-engine.service';
import { StorageService } from '../../core/services/storage.service';
import { LlmProviderService } from '../../core/services/llm-provider.service';
import { ChatSession, ChatMessage } from '../../core/models/chat-session.model';
import { ConnectionProfile } from '../../core/models/connection-profile.model';
import { Character } from '../../core/models/character.model';
import { Persona } from '../../core/models/persona.model';
import { MarkdownRendererComponent } from '../../shared/components/markdown-renderer.component';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonButtons, IonMenuButton, IonBackButton,
    IonList, IonItem, IonLabel, IonIcon,
    IonFooter, IonTextarea, IonFab, IonFabButton,
    IonActionSheet, IonRefresher, IonRefresherContent,
    IonSelect, IonSelectOption, IonSpinner,
    MarkdownRendererComponent,
  ],
})
export class ChatPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private chatEngine = inject(ChatEngineService);
  private storage = inject(StorageService);
  private llmProvider = inject(LlmProviderService);
  private toastCtrl = inject(ToastController);
  private actionSheetCtrl = inject(ActionSheetController);

  session = signal<ChatSession | null>(null);
  messages = signal<ChatMessage[]>([]);
  inputText = signal('');
  isGenerating = signal(false);
  streamingContent = signal('');

  profiles = signal<ConnectionProfile[]>([]);
  selectedProfile = signal<ConnectionProfile | null>(null);
  characters = signal<Character[]>([]);
  personas = signal<Persona[]>([]);

  showActionSheet = signal(false);
  actionSheetButtons: any[] = [];

  private sessionId: string | null = null;

  async ionViewWillEnter() {
    this.sessionId = this.route.snapshot.paramMap.get('id');
    this.profiles.set(await this.storage.getConnectionProfiles());
    this.characters.set(await this.storage.getCharacters());
    this.personas.set(await this.storage.getPersonas());

    if (this.sessionId) {
      await this.chatEngine.loadSession(this.sessionId);
      const s = this.chatEngine.activeSession();
      if (s) {
        this.session.set(s);
        this.messages.set(s.messages);
        const profile = await this.storage.getConnectionProfile(s.connectionProfileId);
        if (profile) this.selectedProfile.set(profile);
      }
    } else {
      // New chat - need to select a profile first
      if (this.profiles().length === 0) {
        const toast = await this.toastCtrl.create({
          message: 'Please set up a connection profile first in Settings > Connections',
          duration: 4000,
          color: 'warning',
        });
        await toast.present();
        this.router.navigate(['/connections']);
        return;
      }
      this.selectedProfile.set(this.profiles()[0]);
    }

    // Subscribe to engine signals
    this.isGenerating.set(this.chatEngine.isGenerating());
    this.streamingContent.set(this.chatEngine.currentStreamingContent());
  }

  async sendMessage() {
    const text = this.inputText().trim();
    if (!text || this.isGenerating()) return;
    if (!this.selectedProfile()) {
      const toast = await this.toastCtrl.create({
        message: 'Please select a connection profile',
        duration: 2000,
        color: 'warning',
      });
      await toast.present();
      return;
    }

    this.inputText.set('');

    // Create session if new
    if (!this.session()) {
      const persona = this.personas().find(p => p.isDefault) || this.personas()[0];
      const newSession = await this.chatEngine.createSession({
        title: 'New Chat',
        connectionProfileId: this.selectedProfile()!.id,
        personaId: persona?.id,
        characterIds: this.characters().slice(0, 1).map(c => c.id),
      });
      this.session.set(newSession);
      this.router.navigate(['/chat', newSession.id], { replaceUrl: true });
    }

    const activeChars = this.characters().filter(c =>
      this.session()?.activeCharacterIds?.includes(c.id)
    );
    const persona = this.personas().find(p => p.id === this.session()?.personaId);

    await this.chatEngine.sendMessage(text, this.selectedProfile()!, {
      characters: activeChars,
      persona,
    });

    // Refresh state
    const s = this.chatEngine.activeSession();
    if (s) {
      this.messages.set([...s.messages]);
      this.session.set({ ...s });
    }
  }

  async regenerate() {
    if (!this.selectedProfile() || this.isGenerating()) return;
    const activeChars = this.characters().filter(c =>
      this.session()?.activeCharacterIds?.includes(c.id)
    );
    const persona = this.personas().find(p => p.id === this.session()?.personaId);

    await this.chatEngine.regenerateLastMessage(this.selectedProfile()!, {
      characters: activeChars,
      persona,
    });

    const s = this.chatEngine.activeSession();
    if (s) {
      this.messages.set([...s.messages]);
      this.session.set({ ...s });
    }
  }

  async onMessageContextMenu(msg: ChatMessage) {
    const buttons = [
      {
        text: 'Copy',
        icon: 'copy-outline',
        handler: () => this.copyToClipboard(msg.content),
      },
      {
        text: msg.isPinnedMemory ? 'Unpin Memory' : 'Pin as Memory',
        icon: 'bookmark-outline',
        handler: () => this.pinMessage(msg),
      },
      {
        text: 'Delete',
        role: 'destructive',
        icon: 'trash-outline',
        handler: () => this.deleteMessage(msg),
      },
      {
        text: 'Cancel',
        role: 'cancel',
      },
    ];

    const sheet = await this.actionSheetCtrl.create({ header: 'Message Options', buttons });
    await sheet.present();
  }

  private async copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    const toast = await this.toastCtrl.create({ message: 'Copied!', duration: 1500 });
    await toast.present();
  }

  private async pinMessage(msg: ChatMessage) {
    if (!this.session()) return;
    await this.chatEngine.pinAsMemory(this.session()!.id, msg.id);
    msg.isPinnedMemory = !msg.isPinnedMemory;
    this.messages.set([...this.messages()]);
  }

  private async deleteMessage(msg: ChatMessage) {
    if (!this.session()) return;
    await this.chatEngine.deleteMessage(this.session()!.id, msg.id);
    this.messages.set(this.messages().filter(m => m.id !== msg.id));
  }

  onProfileChange(profileId: string) {
    const profile = this.profiles().find(p => p.id === profileId);
    this.selectedProfile.set(profile || null);
  }

  trackByMessageId(index: number, msg: ChatMessage): string {
    return msg.id;
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      this.sendMessage();
      event.preventDefault();
    }
  }
}
