import { Injectable } from '@angular/core';
import { LorebookService } from './lorebook.service';
import { CharacterService } from './character.service';
import { MemoryService } from './memory.service';
import { Message, Memory } from '../models/chat-session.model';
import { Character, Persona } from '../models/character.model';
import { Scenario } from '../models/scenario.model';
import { Lorebook, LoreEntry } from '../models/lorebook.model';
import { MacroService, MacroContext } from './macro.service';

/**
 * The assembled prompt context ready to send to the LLM.
 */
export interface AssembledPrompt {
  systemPrompt: string;
  messages: Message[];
  injectedLoreEntries: LoreEntry[];
  injectedMemories: Memory[];
  totalEstimatedTokens: number;
}

/**
 * Service for assembling prompts from scenario configuration, characters,
 * lorebook entries, memories, and chat history.
 *
 * Pipeline order (priority):
 *   1. System Instructions (scenario special instructions)
 *   2. Character descriptions + persona
 *   3. Active lore entries (triggered by keywords in recent messages)
 *   4. Retrieved memories (future)
 *   5. Recent message history (truncated to fit token budget)
 */
@Injectable({ providedIn: 'root' })
export class PromptAssemblyService {
  constructor(
    private lorebookService: LorebookService,
    private characterService: CharacterService,
    private memoryService: MemoryService,
    private macroService: MacroService,
  ) {}

  /**
   * Assemble the full prompt for the LLM given the current scenario and chat state.
   */
  async assemble(
    scenario: Scenario,
    persona: Persona,
    activeCharacters: Character[],
    messages: Message[],
    lorebooks: Lorebook[],
    contextSize: number = 4096,
    sessionId?: string
  ): Promise<AssembledPrompt> {
    // 1. Build system prompt
    const systemParts: string[] = [];

    // Check for Character System Prompt Override
    let customSystemPrompt = '';
    if (activeCharacters.length > 0 && (activeCharacters[0] as any).systemPrompt?.trim()) {
      customSystemPrompt = (activeCharacters[0] as any).systemPrompt.trim();
    }

    if (customSystemPrompt) {
      systemParts.push(customSystemPrompt);
    } else if (scenario.specialInstructions?.trim()) {
      systemParts.push(scenario.specialInstructions.trim());
    }

    // Mode-specific instructions
    if (scenario.defaultMode === 'story') {
      systemParts.push(this.buildStoryModeInstructions(scenario));
    }

    // 2. Character descriptions
    const characterBlock = this.buildCharacterBlock(activeCharacters, scenario);
    if (characterBlock) {
      systemParts.push(characterBlock);
    }

    // Persona description
    if (persona.description?.trim()) {
      systemParts.push(`[User Persona - ${persona.name}]: ${persona.description.trim()}`);
    }

    // ── Macro Expansion Context ──
    const macroContext: MacroContext = {
      userName: persona.name,
      charName: activeCharacters.length > 0 ? activeCharacters[0].name : undefined,
      messages: messages,
      lastMessageTimestamp: messages.length > 0 ? messages[messages.length - 1].timestamp : undefined
    };

    // Expand macros in the base system parts
    for (let i = 0; i < systemParts.length; i++) {
      systemParts[i] = this.macroService.expand(systemParts[i], macroContext);
    }

    // 3. Lorebook trigger scanning
    const triggeredEntries = this.scanForTriggers(messages, lorebooks, contextSize);
    if (triggeredEntries.length > 0) {
      const loreBlock = this.buildLoreBlock(triggeredEntries);
      systemParts.push(this.macroService.expand(loreBlock, macroContext));
    }

    // 4. Memory retrieval (RAG-style semantic search)
    let injectedMemories: Memory[] = [];
    try {
      const recentContext = messages.slice(-5).map(m => m.content).join(' ');
      const memoryResults = await this.memoryService.retrieveRelevantMemories(
        recentContext,
        scenario.id,
        5,  // top-K
        0.2 // min relevance score
      );

      if (memoryResults.length > 0) {
        injectedMemories = memoryResults.map(r => r.memory);
        const memoryBlock = this.buildMemoryBlock(injectedMemories);
        systemParts.push(memoryBlock);

        // Boost retrieved memories (they become more important when used)
        for (const result of memoryResults) {
          await this.memoryService.boostMemory(result.memory.id, 0.02);
        }
      }
    } catch (err) {
      console.warn('Memory retrieval failed (non-fatal):', err);
    }

    // Add Post-History Instructions (Jailbreak) if present
    let postHistoryInstructions = '';
    if (activeCharacters.length > 0 && (activeCharacters[0] as any).postHistoryInstructions?.trim()) {
      postHistoryInstructions = this.macroService.expand((activeCharacters[0] as any).postHistoryInstructions.trim(), macroContext);
    }
    
    // Add Scenario Author's Note if present
    let authorNoteStr = '';
    if (scenario.authorNotes?.trim()) {
      authorNoteStr = this.macroService.expand(scenario.authorNotes.trim(), macroContext);
    }

    const systemPrompt = systemParts.join('\n\n');

    // 5. Trim message history to fit token budget
    // Rough estimate: 1 token ≈ 4 characters
    const systemTokens = this.estimateTokens(systemPrompt) + this.estimateTokens(postHistoryInstructions) + this.estimateTokens(authorNoteStr);
    const availableTokens = contextSize - systemTokens - 200; // Reserve 200 for response
    const trimResult = this.trimMessages(messages, Math.max(availableTokens, 500));
    const trimmedMessages = trimResult.trimmed;
    const droppedMessages = trimResult.dropped;

    // Trigger background scene compression if a significant chunk of messages were dropped and haven't been summarized
    if (droppedMessages.length > 5 && scenario) {
      // In a real implementation, you'd trigger a background task here to summarize droppedMessages
      // We trigger memory auto-extraction in the background so it doesn't block assembly
      this.memoryService.autoExtractMemories(
        droppedMessages,
        sessionId || scenario.id,
        scenario.id,
        droppedMessages.length
      ).catch(err => console.warn('Background compression failed:', err));
    }

    // Inject Author's Note into the context (usually 2-3 messages deep, but appending to last message or as system is reliable)
    // We'll bundle Author's Note and Post History Instructions together at the end.
    let finalSystemNote = '';
    if (authorNoteStr) finalSystemNote += `[Author's Note: ${authorNoteStr}]\n\n`;
    if (postHistoryInstructions) finalSystemNote += `[System Note: ${postHistoryInstructions}]`;
    finalSystemNote = finalSystemNote.trim();

    if (finalSystemNote && trimmedMessages.length > 0) {
      // Append to the last message if it's a user message, otherwise create a new system message
      const lastMsg = trimmedMessages[trimmedMessages.length - 1];
      if (lastMsg.role === 'user') {
        lastMsg.content = `${lastMsg.content}\n\n${finalSystemNote}`;
      } else {
        trimmedMessages.push({
          id: 'jailbreak', role: 'system', senderId: 'system', senderName: 'System', content: finalSystemNote, timestamp: new Date().toISOString(), generatedImageRefs: [], isPinnedAsMemory: false, tokenCount: 0
        });
      }
    }

    const totalEstimatedTokens = systemTokens + this.estimateTokens(
      trimmedMessages.map(m => m.content).join(' ')
    );

    return {
      systemPrompt,
      messages: trimmedMessages,
      injectedLoreEntries: triggeredEntries,
      injectedMemories,
      totalEstimatedTokens,
    };
  }

  /**
   * Scan recent messages for trigger words from lorebook entries.
   * Returns entries that should be injected into the context.
   */
  private scanForTriggers(
    messages: Message[],
    lorebooks: Lorebook[],
    contextSize: number
  ): LoreEntry[] {
    const triggeredEntries: LoreEntry[] = [];
    const seenEntryIds = new Set<string>();

    // Collect all enabled entries from all lorebooks (in priority order)
    const allEntries: LoreEntry[] = [];
    for (const lb of lorebooks) {
      if (lb.entries) {
        for (const entry of lb.entries) {
          if (entry.isEnabled) {
            allEntries.push(entry);
          }
        }
      }
    }

    // Build the text to scan from recent messages (limited by scan depth)
    for (const entry of allEntries) {
      if (seenEntryIds.has(entry.id)) continue;

      const scanDepth = entry.scanDepth || 5;
      const recentMessages = messages.slice(-scanDepth);
      const scanText = recentMessages.map(m => m.content).join(' ').toLowerCase();

      // Check primary trigger words
      const hasPrimaryKeys = entry.triggerWords && entry.triggerWords.length > 0;
      const primaryTriggered = !hasPrimaryKeys || entry.triggerWords.some(trigger =>
        scanText.includes(trigger.toLowerCase())
      );

      let isTriggered = primaryTriggered;

      // Check secondary trigger words with selective logic
      if (isTriggered && entry.keySecondary && entry.keySecondary.length > 0) {
        const secondaryLogic = entry.selectiveLogic || 'AND_ANY';
        const matchAny = entry.keySecondary.some(k => scanText.includes(k.toLowerCase()));
        const matchAll = entry.keySecondary.every(k => scanText.includes(k.toLowerCase()));

        switch (secondaryLogic) {
          case 'AND_ANY':
            isTriggered = matchAny;
            break;
          case 'AND_ALL':
            isTriggered = matchAll;
            break;
          case 'NOT_ANY':
            isTriggered = !matchAny;
            break;
          case 'NOT_ALL':
            isTriggered = !matchAll;
            break;
        }
      }

      if (isTriggered) {
        // Apply probability check
        if (entry.probability >= 1.0 || Math.random() < entry.probability) {
          triggeredEntries.push(entry);
          seenEntryIds.add(entry.id);

          // Recursive: also activate linked entries
          if (entry.isRecursive && entry.linkedLoreEntryIds.length > 0) {
            for (const linkedId of entry.linkedLoreEntryIds) {
              if (!seenEntryIds.has(linkedId)) {
                const linkedEntry = allEntries.find(e => e.id === linkedId);
                if (linkedEntry && linkedEntry.isEnabled) {
                  triggeredEntries.push(linkedEntry);
                  seenEntryIds.add(linkedId);
                }
              }
            }
          }
        }
      }
    }

    return triggeredEntries;
  }

  /**
   * Build character description block for the system prompt.
   */
  private buildCharacterBlock(characters: Character[], scenario: Scenario): string {
    if (characters.length === 0) return '';

    const parts: string[] = ['[Characters in this scenario]:'];
    for (const char of characters) {
      const role = scenario.characterRoles[char.id] || 'npc';
      const lines = [`- ${char.name} (${role.toUpperCase()})`];
      if (char.description) lines.push(`  Description: ${char.description}`);
      if (char.personality) lines.push(`  Personality: ${char.personality}`);
      if (char.speechStyle) lines.push(`  Speech style: ${char.speechStyle}`);
      parts.push(lines.join('\n'));
    }

    return parts.join('\n');
  }

  /**
   * Build lore injection block.
   */
  private buildLoreBlock(entries: LoreEntry[]): string {
    const parts: string[] = ['[World Lore - Active Entries]:'];
    for (const entry of entries) {
      parts.push(`[${entry.loreType.toUpperCase()} — ${entry.title}]: ${entry.loreDescription}`);
    }
    return parts.join('\n');
  }

  /**
   * Build memory injection block from retrieved memories.
   */
  private buildMemoryBlock(memories: Memory[]): string {
    const parts: string[] = ['[Important Context - Retrieved Memories]:'];
    for (const memory of memories) {
      const source = memory.source === 'auto' ? 'observed' : 'noted';
      parts.push(`- (${source}) ${memory.summaryText}`);
    }
    return parts.join('\n');
  }

  /**
   * Build story mode specific instructions.
   */
  private buildStoryModeInstructions(scenario: Scenario): string {
    const pov = scenario.defaultPOV === '1st-person' ? 'first person' : 'third person';
    const tense = scenario.defaultTense;
    return `[Story Mode]: Write in ${pov} ${tense} tense. Continue the narrative as prose. Do not break character. Maintain continuity with previous events.`;
  }

  /**
   * Trim messages to fit within a token budget, keeping the most recent ones.
   */
  private trimMessages(messages: Message[], maxTokens: number): { trimmed: Message[], dropped: Message[] } {
    const trimmed: Message[] = [];
    const dropped: Message[] = [];
    let totalTokens = 0;

    // Work backwards from the most recent messages
    let cutoffIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msgTokens = this.estimateTokens(messages[i].content);
      if (totalTokens + msgTokens > maxTokens && trimmed.length > 0) {
        cutoffIndex = i;
        break;
      }
      totalTokens += msgTokens;
      trimmed.unshift(messages[i]);
    }

    if (cutoffIndex >= 0) {
      for (let i = 0; i <= cutoffIndex; i++) {
        dropped.push(messages[i]);
      }
    }

    return { trimmed, dropped };
  }

  /**
   * Rough token estimation: ~4 characters per token.
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
