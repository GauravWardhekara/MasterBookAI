import { Injectable, signal, computed } from '@angular/core';
import { StorageService } from './storage.service';
import { LlmProviderService, LLMChatMessage } from './llm-provider.service';
import { ChatSession, ChatMessage, ChatMode } from '../models/chat-session.model';
import { ConnectionProfile } from '../models/connection-profile.model';
import { Character } from '../models/character.model';
import { Persona } from '../models/persona.model';
import { Memory } from '../models/memory.model';

/**
 * Chat Engine Service
 * Manages prompt assembly, message history, streaming, and memory injection.
 */
@Injectable({ providedIn: 'root' })
export class ChatEngineService {
  // Active session state
  private readonly _activeSession = signal<ChatSession | null>(null);
  readonly activeSession = this._activeSession.asReadonly();

  private readonly _isGenerating = signal(false);
  readonly isGenerating = this._isGenerating.asReadonly();

  private readonly _currentStreamingContent = signal('');
  readonly currentStreamingContent = this._currentStreamingContent.asReadonly();

  readonly messageCount = computed(() => this._activeSession()?.messages.length ?? 0);

  constructor(
    private storage: StorageService,
    private llm: LlmProviderService
  ) {}

  /**
   * Load a chat session by ID
   */
  async loadSession(sessionId: string): Promise<void> {
    const session = await this.storage.getChatSession(sessionId);
    if (session) {
      this._activeSession.set(session);
    }
  }

  /**
   * Create a new chat session
   */
  async createSession(params: {
    title?: string;
    connectionProfileId: string;
    mode?: ChatMode;
    personaId?: string;
    characterIds?: string[];
    scenarioId?: string;
  }): Promise<ChatSession> {
    const now = new Date();
    const session: ChatSession = {
      id: this.generateId(),
      title: params.title || 'New Chat',
      connectionProfileId: params.connectionProfileId,
      mode: params.mode || 'chat',
      personaId: params.personaId,
      activeCharacterIds: params.characterIds || [],
      scenarioId: params.scenarioId,
      messages: [],
      linkedMemoryIds: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.storage.saveChatSession(session);
    this._activeSession.set(session);
    return session;
  }

  /**
   * Send a user message and stream the AI response
   */
  async sendMessage(
    content: string,
    profile: ConnectionProfile,
    options?: {
      characters?: Character[];
      persona?: Persona;
      memories?: Memory[];
      systemInstruction?: string;
    }
  ): Promise<void> {
    const session = this._activeSession();
    if (!session) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      senderName: options?.persona?.name || 'You',
      content,
      timestamp: new Date(),
      isPinnedMemory: false,
    };

    await this.storage.addMessage(session.id, userMsg);
    session.messages.push(userMsg);
    this._activeSession.set({ ...session });

    // Generate AI response
    await this.generateResponse(profile, options);
  }

  /**
   * Generate an AI response with streaming
   */
  async generateResponse(
    profile: ConnectionProfile,
    options?: {
      characters?: Character[];
      persona?: Persona;
      memories?: Memory[];
      systemInstruction?: string;
    }
  ): Promise<void> {
    const session = this._activeSession();
    if (!session) return;

    this._isGenerating.set(true);
    this._currentStreamingContent.set('');

    // Assemble prompt messages
    const messages = this.assemblePromptMessages(session, profile, options);

    // Create placeholder assistant message
    const assistantMsg: ChatMessage = {
      id: this.generateId(),
      role: 'assistant',
      senderName: options?.characters?.[0]?.name || 'Assistant',
      content: '',
      timestamp: new Date(),
      isPinnedMemory: false,
      isStreaming: true,
    };

    await this.storage.addMessage(session.id, assistantMsg);
    session.messages.push(assistantMsg);

    try {
      let fullContent = '';

      if (profile.streaming) {
        for await (const event of this.llm.streamChatCompletion(profile, messages)) {
          if (event.error) {
            assistantMsg.content = `Error: ${event.error}`;
            assistantMsg.isError = true;
            break;
          }
          if (event.content) {
            fullContent += event.content;
            this._currentStreamingContent.set(fullContent);
            assistantMsg.content = fullContent;
          }
          if (event.done) {
            break;
          }
          // Update in storage periodically (throttle in production)
          await this.storage.updateMessage(session.id, assistantMsg.id, { content: fullContent });
          this._activeSession.set({ ...session });
        }
      } else {
        fullContent = await this.llm.chatCompletion(profile, messages);
        assistantMsg.content = fullContent;
      }

      assistantMsg.isStreaming = false;
      await this.storage.updateMessage(session.id, assistantMsg.id, {
        content: fullContent,
        isStreaming: false,
        isError: assistantMsg.isError,
      });

      // Update session title on first response if default
      if (session.messages.length <= 3 && session.title === 'New Chat') {
        const shortTitle = fullContent.slice(0, 40).replace(/\n/g, ' ') + '...';
        session.title = shortTitle;
        await this.storage.saveChatSession(session);
      }

      this._activeSession.set({ ...session });
    } catch (err: any) {
      assistantMsg.content = `Error: ${err.message || 'Generation failed'}`;
      assistantMsg.isError = true;
      assistantMsg.isStreaming = false;
      await this.storage.updateMessage(session.id, assistantMsg.id, assistantMsg);
      this._activeSession.set({ ...session });
    } finally {
      this._isGenerating.set(false);
      this._currentStreamingContent.set('');
    }
  }

  /**
   * Regenerate the last assistant message
   */
  async regenerateLastMessage(
    profile: ConnectionProfile,
    options?: {
      characters?: Character[];
      persona?: Persona;
      memories?: Memory[];
      systemInstruction?: string;
    }
  ): Promise<void> {
    const session = this._activeSession();
    if (!session) return;

    // Find and remove last assistant message
    const lastIdx = session.messages.length - 1;
    if (lastIdx >= 0 && session.messages[lastIdx].role === 'assistant') {
      await this.storage.deleteMessage(session.id, session.messages[lastIdx].id);
      session.messages.pop();
      this._activeSession.set({ ...session });
    }

    await this.generateResponse(profile, options);
  }

  /**
   * Edit a message and regenerate from that point
   */
  async editMessage(sessionId: string, messageId: string, newContent: string): Promise<void> {
    await this.storage.updateMessage(sessionId, messageId, { content: newContent });
    const session = await this.storage.getChatSession(sessionId);
    if (session) {
      this._activeSession.set(session);
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(sessionId: string, messageId: string): Promise<void> {
    await this.storage.deleteMessage(sessionId, messageId);
    const session = await this.storage.getChatSession(sessionId);
    if (session) {
      this._activeSession.set(session);
    }
  }

  /**
   * Pin a message as a memory
   */
  async pinAsMemory(sessionId: string, messageId: string): Promise<void> {
    await this.storage.updateMessage(sessionId, messageId, { isPinnedMemory: true });
  }

  /**
   * Assemble the full prompt messages array for the LLM
   */
  private assemblePromptMessages(
    session: ChatSession,
    profile: ConnectionProfile,
    options?: {
      characters?: Character[];
      persona?: Persona;
      memories?: Memory[];
      systemInstruction?: string;
    }
  ): LLMChatMessage[] {
    const messages: LLMChatMessage[] = [];
    const parts: string[] = [];

    // 1. System instruction
    if (options?.systemInstruction) {
      parts.push(options.systemInstruction);
    }

    // 2. Character definitions
    if (options?.characters?.length) {
      for (const char of options.characters) {
        parts.push(`Character: ${char.name}\n${char.description}\nPersonality: ${char.personality}`);
        if (char.speechStyle) {
          parts.push(`Speech style: ${char.speechStyle}`);
        }
      }
    }

    // 3. Persona
    if (options?.persona) {
      parts.push(`User persona: ${options.persona.name}\n${options.persona.description}`);
    }

    // 4. Injected memories
    if (options?.memories?.length) {
      const memoryText = options.memories.map(m => `- ${m.summary}`).join('\n');
      parts.push(`Important memories:\n${memoryText}`);
    }

    if (parts.length > 0) {
      messages.push({ role: 'system', content: parts.join('\n\n') });
    }

    // 5. Recent chat history
    const recentMessages = session.messages.slice(-20); // last 20 messages
    for (const msg of recentMessages) {
      if (msg.isStreaming) continue;
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: `${msg.senderName}: ${msg.content}`,
      });
    }

    return messages;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}
