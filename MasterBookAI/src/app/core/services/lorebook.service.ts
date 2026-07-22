import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Lorebook, LoreEntry, LoreType } from '../models/lorebook.model';
import { SillyTavernWorldInfo, SillyTavernWIEntry } from '../models/export-file.model';
import { generateId, now } from '../models/base.model';

@Injectable({ providedIn: 'root' })
export class LorebookService {
  constructor(private db: DatabaseService) {}

  // ── Lorebooks ──

  async getAllLorebooks(): Promise<Lorebook[]> {
    return this.db.lorebooks.orderBy('updatedAt').reverse().toArray();
  }

  async getLorebook(id: string): Promise<Lorebook | undefined> {
    const lorebook = await this.db.lorebooks.get(id);
    if (lorebook) {
      // Populate entries
      const entries = await this.db.loreEntries.where('lorebookId').equals(id).toArray();
      lorebook.entries = entries;
    }
    return lorebook;
  }

  async getLorebooksByIds(ids: string[]): Promise<Lorebook[]> {
    const lorebooks = await this.db.lorebooks.where('id').anyOf(ids).toArray();
    for (const lb of lorebooks) {
      lb.entries = await this.db.loreEntries.where('lorebookId').equals(lb.id).toArray();
    }
    return lorebooks;
  }

  async searchLorebooks(query: string): Promise<Lorebook[]> {
    const q = query.toLowerCase();
    return this.db.lorebooks
      .filter(lb => lb.title.toLowerCase().includes(q) ||
                    lb.description.toLowerCase().includes(q) ||
                    lb.tags.some(t => t.toLowerCase().includes(q)))
      .toArray();
  }

  async createLorebook(data: Partial<Lorebook>): Promise<Lorebook> {
    const lorebook: Lorebook = {
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
      title: data.title || 'New Lorebook',
      description: data.description || '',
      coverImage: data.coverImage,
      entries: [],
      tags: data.tags || [],
    };
    await this.db.lorebooks.add(lorebook);
    return lorebook;
  }

  async updateLorebook(id: string, data: Partial<Lorebook>): Promise<void> {
    const { entries, ...lorebookData } = data as any;
    await this.db.lorebooks.update(id, { ...lorebookData, updatedAt: now() });
  }

  async deleteLorebook(id: string): Promise<void> {
    // Delete all entries in this lorebook
    await this.db.loreEntries.where('lorebookId').equals(id).delete();
    await this.db.lorebooks.delete(id);
  }

  async duplicateLorebook(id: string): Promise<Lorebook | undefined> {
    const original = await this.getLorebook(id);
    if (!original) return undefined;

    const newId = generateId();
    const timestamp = now();
    const newLorebook: Lorebook = {
      ...original,
      id: newId,
      title: `${original.title} (Copy)`,
      createdAt: timestamp,
      updatedAt: timestamp,
      entries: [],
    };
    await this.db.lorebooks.add(newLorebook);

    // Duplicate entries
    for (const entry of original.entries) {
      const newEntry: LoreEntry = {
        ...entry,
        id: generateId(),
        lorebookId: newId,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await this.db.loreEntries.add(newEntry);
      newLorebook.entries.push(newEntry);
    }

    return newLorebook;
  }

  // ── Lore Entries ──

  async getEntriesForLorebook(lorebookId: string): Promise<LoreEntry[]> {
    return this.db.loreEntries.where('lorebookId').equals(lorebookId).toArray();
  }

  async getEntry(id: string): Promise<LoreEntry | undefined> {
    return this.db.loreEntries.get(id);
  }

  async createEntry(data: Partial<LoreEntry>): Promise<LoreEntry> {
    const entry: LoreEntry = {
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
      lorebookId: data.lorebookId || '',
      title: data.title || 'New Entry',
      loreType: data.loreType || LoreType.PREMISE,
      loreDescription: data.loreDescription || '',
      triggerWords: data.triggerWords || [],
      linkedLoreEntryIds: data.linkedLoreEntryIds || [],
      linkedCharacterIds: data.linkedCharacterIds || [],
      insertionPosition: data.insertionPosition || 'before-context',
      scanDepth: data.scanDepth ?? 5,
      probability: data.probability ?? 1.0,
      isRecursive: data.isRecursive ?? false,
      isEnabled: data.isEnabled ?? true,
    };
    await this.db.loreEntries.add(entry);
    // Update lorebook timestamp
    await this.db.lorebooks.update(entry.lorebookId, { updatedAt: now() });
    return entry;
  }

  async updateEntry(id: string, data: Partial<LoreEntry>): Promise<void> {
    await this.db.loreEntries.update(id, { ...data, updatedAt: now() });
    // Update lorebook timestamp
    const entry = await this.db.loreEntries.get(id);
    if (entry) {
      await this.db.lorebooks.update(entry.lorebookId, { updatedAt: now() });
    }
  }

  async deleteEntry(id: string): Promise<void> {
    const entry = await this.db.loreEntries.get(id);
    await this.db.loreEntries.delete(id);
    if (entry) {
      await this.db.lorebooks.update(entry.lorebookId, { updatedAt: now() });
    }
  }

  async toggleEntry(id: string): Promise<void> {
    const entry = await this.db.loreEntries.get(id);
    if (entry) {
      await this.db.loreEntries.update(id, { isEnabled: !entry.isEnabled, updatedAt: now() });
    }
  }

  // ── Import / Export ──

  async exportLorebook(id: string): Promise<string> {
    const lorebook = await this.getLorebook(id);
    if (!lorebook) throw new Error('Lorebook not found');
    return JSON.stringify(lorebook, null, 2);
  }

  async importLorebook(json: string): Promise<Lorebook> {
    const data = JSON.parse(json);
    // Check if it's a SillyTavern World Info format
    if (data.entries && typeof data.entries === 'object' && !Array.isArray(data.entries)) {
      return this.importSillyTavernWorldInfo(data);
    }
    // Otherwise treat as native format
    return this.importNativeLorebook(data);
  }

  private async importNativeLorebook(data: Lorebook): Promise<Lorebook> {
    const timestamp = now();
    const newId = generateId();
    const lorebook: Lorebook = {
      ...data,
      id: newId,
      createdAt: timestamp,
      updatedAt: timestamp,
      entries: [],
    };
    await this.db.lorebooks.add(lorebook);

    if (data.entries) {
      for (const entry of data.entries) {
        const newEntry: LoreEntry = {
          ...entry,
          id: generateId(),
          lorebookId: newId,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        await this.db.loreEntries.add(newEntry);
        lorebook.entries.push(newEntry);
      }
    }
    return lorebook;
  }

  /**
   * Import from SillyTavern World Info JSON format.
   */
  private async importSillyTavernWorldInfo(data: SillyTavernWorldInfo): Promise<Lorebook> {
    const timestamp = now();
    const lorebookId = generateId();

    const lorebook: Lorebook = {
      id: lorebookId,
      title: 'Imported World Info',
      description: 'Imported from SillyTavern World Info format',
      entries: [],
      tags: ['imported', 'sillytavern'],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.lorebooks.add(lorebook);

    for (const [, stEntry] of Object.entries(data.entries)) {
      const entry: LoreEntry = {
        id: generateId(),
        lorebookId,
        title: stEntry.comment || `Entry ${stEntry.uid}`,
        loreType: this.inferLoreType(stEntry),
        loreDescription: stEntry.content,
        triggerWords: stEntry.key || [],
        linkedLoreEntryIds: [],
        linkedCharacterIds: [],
        insertionPosition: this.mapSTPosition(stEntry.position),
        scanDepth: stEntry.scanDepth || stEntry.depth || 5,
        probability: (stEntry.probability ?? 100) / 100,
        isRecursive: !stEntry.excludeRecursion,
        isEnabled: !stEntry.disable,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await this.db.loreEntries.add(entry);
      lorebook.entries.push(entry);
    }

    return lorebook;
  }

  private inferLoreType(entry: SillyTavernWIEntry): LoreType {
    const content = (entry.content + ' ' + entry.comment).toLowerCase();
    if (content.includes('faction') || content.includes('organization') || content.includes('guild')) return LoreType.FACTION;
    if (content.includes('location') || content.includes('place') || content.includes('city') || content.includes('town')) return LoreType.LOCATION;
    if (content.includes('species') || content.includes('race') || content.includes('creature')) return LoreType.SPECIES;
    if (content.includes('history') || content.includes('era') || content.includes('age of')) return LoreType.HISTORY;
    if (content.includes('memory') || content.includes('remember')) return LoreType.MEMORY;
    return LoreType.PREMISE;
  }

  private mapSTPosition(position: number): 'before-context' | 'after-context' | 'in-context' {
    switch (position) {
      case 0: return 'before-context';
      case 1: return 'after-context';
      default: return 'in-context';
    }
  }
}
