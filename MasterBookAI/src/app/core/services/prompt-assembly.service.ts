import { Injectable } from '@angular/core';
import { LorebookService } from './lorebook.service';
import { CharacterService } from './character.service';
import { MemoryService } from './memory.service';
import { Message, Memory } from '../models/chat-session.model';
import { Character, Persona } from '../models/character.model';
import { Scenario } from '../models/scenario.model';
import { Lorebook, LoreEntry } from '../models/lorebook.model';

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
    contextSize: number = 4096
  ): Promise<AssembledPrompt> {
    // 1. Build system prompt
    const systemParts: string[] = [];

    // Scenario special instructions
    if (scenario.specialInstructions?.trim()) {
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

    // 3. Lorebook trigger scanning
    const triggeredEntries = this.scanForTriggers(messages, lorebooks, contextSize);
    if (triggeredEntries.length > 0) {
      const loreBlock = this.buildLoreBlock(triggeredEntries);
      systemParts.push(loreBlock);
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

    const systemPrompt = systemParts.join('\n\n');

    // 5. Trim message history to fit token budget
    // Rough estimate: 1 token ≈ 4 characters
    const systemTokens = this.estimateTokens(systemPrompt);
    const availableTokens = contextSize - systemTokens - 200; // Reserve 200 for response
    const trimmedMessages = this.trimMessages(messages, Math.max(availableTokens, 500));

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

      // Check trigger words
      const isTriggered = entry.triggerWords.some(trigger =>
        scanText.includes(trigger.toLowerCase())
      );

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
  private trimMessages(messages: Message[], maxTokens: number): Message[] {
    const result: Message[] = [];
    let totalTokens = 0;

    // Work backwards from the most recent messages
    for (let i = messages.length - 1; i >= 0; i--) {
      const msgTokens = this.estimateTokens(messages[i].content);
      if (totalTokens + msgTokens > maxTokens && result.length > 0) {
        break;
      }
      totalTokens += msgTokens;
      result.unshift(messages[i]);
    }

    return result;
  }

  /**
   * Rough token estimation: ~4 characters per token.
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
