import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { CharacterService } from './character.service';
import { LorebookService } from './lorebook.service';
import { ScenarioService } from './scenario.service';
import { ChatSessionService } from './chat-session.service';
import { ChatExportFile } from '../models/export-file.model';
import { ChatSession } from '../models/chat-session.model';

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
  downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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
