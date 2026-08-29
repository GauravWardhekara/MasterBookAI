import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { CharacterService } from './character.service';
import { LorebookService } from './lorebook.service';
import { ScenarioService } from './scenario.service';
import { ChatSessionService } from './chat-session.service';
import { ChatExportFile, SillyTavernWorldInfo, SillyTavernWIEntry } from '../models/export-file.model';
import { ChatSession, Message } from '../models/chat-session.model';
import { Lorebook, LoreType } from '../models/lorebook.model';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

/**
 * Service for exporting and importing chats/stories to/from local JSON files.
 * Files are saved to the user's Documents folder on native, or via browser download on web.
 */
@Injectable({ providedIn: 'root' })
export class FileIOService {
  constructor(
    private db: DatabaseService,
    private characterService: CharacterService,
    private lorebookService: LorebookService,
    private scenarioService: ScenarioService,
    private chatSessionService: ChatSessionService,
  ) {}

  /**
   * Export a chat session to a self-contained JSON file.
   */
  async exportSession(sessionId: string): Promise<string> {
    const session = await this.chatSessionService.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const scenario = await this.scenarioService.getScenario(session.scenarioId);
    if (!scenario) throw new Error('Scenario not found');

    const characters = await this.characterService.getCharactersByIds(scenario.characterIds);
    const lorebooks = await this.lorebookService.getLorebooksByIds(scenario.lorebookIds);
    const persona = (await this.db.personas.get(session.personaId)) || {
      id: 'default-persona',
      name: 'User',
      description: '',
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const memories = await this.db.memories
      .where('linkedChatSessionId').equals(sessionId)
      .toArray();

    const exportData: ChatExportFile = {
      formatVersion: '1.0',
      formatIdentifier: 'masterbookai-export',
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      type: session.mode,
      session,
      scenario,
      characters,
      persona,
      lorebooks,
      memories,
      images: {},  // TODO: embed images
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Download the exported file via browser.
   */
  downloadFile(content: string | Blob, filename: string): void {
    const blob = typeof content === 'string' ? new Blob([content], { type: 'application/json' }) : content;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Export a story session as a formatted Word Document (DOCX).
   */
  async exportStoryAsDOCX(sessionId: string): Promise<Blob> {
    const session = await this.chatSessionService.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: session.title || 'MasterBookAI Story',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 },
      })
    ];

    for (const msg of session.messages) {
      if (msg.role === 'system' || msg.role === 'narrator') continue; // Skip raw system prompts
      
      const isUser = msg.role === 'user';
      const textLines = msg.content.split('\\n');
      
      for (const line of textLines) {
        if (!line.trim()) {
           paragraphs.push(new Paragraph({ text: '' })); // empty line
           continue;
        }
        
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                bold: isUser,
                color: isUser ? '4f46e5' : undefined, // Indigo for user actions, default for AI prose
              }),
            ],
            spacing: { after: 120 },
          })
        );
      }
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
    });

    return await Packer.toBlob(doc);
  }

  /**
   * Export a scenario and its lorebooks as a SillyTavern World Info JSON file.
   */
  async exportWorldAsSTWorldInfo(scenarioId: string): Promise<string> {
    const scenario = await this.scenarioService.getScenario(scenarioId);
    if (!scenario) throw new Error('Scenario not found');

    const lorebooks = await this.lorebookService.getLorebooksByIds(scenario.lorebookIds);
    const stWorldInfo: SillyTavernWorldInfo = { entries: {} };

    let uidCounter = 1;
    for (const lb of lorebooks) {
      for (const entry of lb.entries) {
        const uid = String(uidCounter++);
        stWorldInfo.entries[uid] = {
          uid: parseInt(uid, 10),
          key: entry.triggerWords,
          keysecondary: entry.keySecondary || [],
          comment: entry.comment || entry.title || '',
          content: entry.loreDescription,
          constant: entry.constant || false,
          selective: !!entry.keySecondary && entry.keySecondary.length > 0,
          selectiveLogic: this.mapSelectiveLogicToST(entry.selectiveLogic),
          addMemo: false,
          order: entry.order || 100,
          position: this.mapPositionToST(entry.insertionPosition),
          disable: !entry.isEnabled,
          excludeRecursion: entry.excludeRecursion || false,
          probability: (entry.probability || 1.0) * 100,
          depth: entry.depth || 4,
          group: entry.group || '',
          automationId: entry.automationId || '',
        };
      }
    }

    return JSON.stringify(stWorldInfo, null, 2);
  }

  private mapSelectiveLogicToST(logic?: string): number {
    switch (logic) {
      case 'AND_ANY': return 0;
      case 'AND_ALL': return 1;
      case 'NOT_ANY': return 2;
      case 'NOT_ALL': return 3;
      default: return 0;
    }
  }

  private mapSelectiveLogicFromST(logic: number): 'AND_ANY' | 'AND_ALL' | 'NOT_ANY' | 'NOT_ALL' {
    switch (logic) {
      case 0: return 'AND_ANY';
      case 1: return 'AND_ALL';
      case 2: return 'NOT_ANY';
      case 3: return 'NOT_ALL';
      default: return 'AND_ANY';
    }
  }

  private mapPositionToST(pos: string): number {
    // ST positions: 0=before char, 1=after char, 2=before example, 3=after example, 4=at depth
    switch (pos) {
      case 'before_char': return 0;
      case 'after_char': return 1;
      case 'before_example': return 2;
      case 'after_example': return 3;
      case 'ANDepth': return 4;
      case 'before-context': return 4; // Map generic 'before' to depth
      default: return 4;
    }
  }

  private mapPositionFromST(pos: number): 'before-context' | 'after-context' | 'before_char' | 'after_char' {
    switch (pos) {
      case 0: return 'before_char';
      case 1: return 'after_char';
      case 2: return 'before-context'; // Map ST before example to before context
      case 3: return 'after-context';
      case 4: return 'before-context';
      default: return 'before-context';
    }
  }

  /**
   * Import a SillyTavern World Info JSON file and convert it into a Lorebook with entries.
   */
  async importSTWorldInfo(jsonStr: string, title: string = 'Imported Lorebook'): Promise<Lorebook> {
    const stWorldInfo: SillyTavernWorldInfo = JSON.parse(jsonStr);
    if (!stWorldInfo.entries) {
      throw new Error('Invalid World Info format. Missing "entries" object.');
    }

    const lorebook = await this.lorebookService.createLorebook({
      title,
      description: 'Imported from SillyTavern World Info',
    });

    const entries = Object.values(stWorldInfo.entries);
    for (const entry of entries) {
      await this.lorebookService.createEntry({
        lorebookId: lorebook.id,
        title: entry.comment || 'Imported Entry',
        loreType: LoreType.PREMISE,
        triggerWords: entry.key || [],
        keySecondary: entry.keysecondary || [],
        loreDescription: entry.content || '',
        isEnabled: !entry.disable,
        constant: entry.constant || false,
        selectiveLogic: this.mapSelectiveLogicFromST(entry.selectiveLogic || 0),
        insertionPosition: this.mapPositionFromST(entry.position || 4),
        order: entry.order || 100,
        excludeRecursion: entry.excludeRecursion || false,
        probability: (entry.probability || 100) / 100, // Convert percentage to 0.0-1.0
        depth: entry.depth || 4,
        group: entry.group || '',
        automationId: entry.automationId || '',
      });
    }

    return lorebook;
  }

  /**
   * Import a chat session from a JSON file.
   * Returns the imported session and conflict info.
   */
  async importFromJson(json: string): Promise<ImportResult> {
    const data: ChatExportFile = JSON.parse(json);

    // Validate format
    if (data.formatIdentifier !== 'masterbookai-export' || !data.formatVersion) {
      throw new Error('Invalid file format. Expected MasterBookAI export file.');
    }

    const conflicts: ImportConflict[] = [];

    // Check for existing scenario
    const existingScenario = await this.scenarioService.getScenario(data.scenario.id);
    if (existingScenario) {
      conflicts.push({ type: 'scenario', id: data.scenario.id, name: data.scenario.title });
    }

    // Check for existing characters
    for (const char of data.characters) {
      const existing = await this.characterService.getCharacter(char.id);
      if (existing) {
        conflicts.push({ type: 'character', id: char.id, name: char.name });
      }
    }

    // Check for existing lorebooks
    for (const lb of data.lorebooks) {
      const existing = await this.lorebookService.getLorebook(lb.id);
      if (existing) {
        conflicts.push({ type: 'lorebook', id: lb.id, name: lb.title });
      }
    }

    return { data, conflicts };
  }

  /**
   * Execute the import with a chosen conflict resolution strategy.
   */
  async executeImport(data: ChatExportFile, strategy: 'merge' | 'copy' | 'skip'): Promise<ChatSession> {
    const idMap: Record<string, string> = {};

    // Import characters
    for (const char of data.characters) {
      const existing = await this.characterService.getCharacter(char.id);
      if (existing) {
        if (strategy === 'copy') {
          const newChar = await this.characterService.createCharacter({ ...char, name: `${char.name} (Imported)` });
          idMap[char.id] = newChar.id;
        } else if (strategy === 'merge') {
          await this.characterService.updateCharacter(char.id, char);
          idMap[char.id] = char.id;
        } else {
          idMap[char.id] = char.id; // skip — use existing
        }
      } else {
        await this.db.characters.add(char);
        idMap[char.id] = char.id;
      }
    }

    // Import lorebooks
    for (const lb of data.lorebooks) {
      const existing = await this.lorebookService.getLorebook(lb.id);
      if (existing) {
        if (strategy === 'copy') {
          const newLb = await this.lorebookService.createLorebook({ ...lb, title: `${lb.title} (Imported)` });
          idMap[lb.id] = newLb.id;
          for (const entry of lb.entries) {
            await this.lorebookService.createEntry({ ...entry, lorebookId: newLb.id });
          }
        } else if (strategy === 'merge') {
          await this.lorebookService.updateLorebook(lb.id, lb);
          idMap[lb.id] = lb.id;
        } else {
          idMap[lb.id] = lb.id;
        }
      } else {
        await this.db.lorebooks.add({ ...lb, entries: [] });
        for (const entry of lb.entries) {
          await this.db.loreEntries.add(entry);
        }
        idMap[lb.id] = lb.id;
      }
    }

    // Import scenario
    const existingScenario = await this.scenarioService.getScenario(data.scenario.id);
    let scenarioId = data.scenario.id;
    if (existingScenario) {
      if (strategy === 'copy') {
        const newScenario = await this.scenarioService.createScenario({
          ...data.scenario,
          title: `${data.scenario.title} (Imported)`,
        });
        scenarioId = newScenario.id;
      } else if (strategy === 'merge') {
        await this.scenarioService.updateScenario(data.scenario.id, data.scenario);
      }
    } else {
      await this.db.scenarios.add(data.scenario);
    }

    // Import persona if not exists
    const existingPersona = await this.db.personas.get(data.persona.id);
    if (!existingPersona) {
      await this.db.personas.add(data.persona);
    }

    // Import session (always as new)
    const session = await this.chatSessionService.createSession({
      ...data.session,
      scenarioId,
      title: data.session.title,
    });

    // Import memories
    for (const memory of data.memories) {
      const existingMemory = await this.db.memories.get(memory.id);
      if (!existingMemory) {
        await this.db.memories.add({ ...memory, linkedChatSessionId: session.id });
      }
    }

    return session;
  }

  /**
   * Read a file from a file input element.
   */
  readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
}

export interface ImportResult {
  data: ChatExportFile;
  conflicts: ImportConflict[];
}

export interface ImportConflict {
  type: 'scenario' | 'character' | 'lorebook';
  id: string;
  name: string;
}
