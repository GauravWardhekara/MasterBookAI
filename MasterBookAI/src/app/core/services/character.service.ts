import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Character, Persona } from '../models/character.model';
import { generateId, now } from '../models/base.model';

@Injectable({ providedIn: 'root' })
export class CharacterService {
  constructor(private db: DatabaseService) {}

  // ── Characters ──

  async getAllCharacters(): Promise<Character[]> {
    return this.db.characters.orderBy('updatedAt').reverse().toArray();
  }

  async getCharacter(id: string): Promise<Character | undefined> {
    return this.db.characters.get(id);
  }

  async getCharactersByIds(ids: string[]): Promise<Character[]> {
    return this.db.characters.where('id').anyOf(ids).toArray();
  }

  async searchCharacters(query: string): Promise<Character[]> {
    const q = query.toLowerCase();
    return this.db.characters
      .filter(c => c.name.toLowerCase().includes(q) ||
                   c.description.toLowerCase().includes(q) ||
                   c.tags.some(t => t.toLowerCase().includes(q)))
      .toArray();
  }

  async createCharacter(data: Partial<Character>): Promise<Character> {
    const character: Character = {
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
      name: data.name || 'New Character',
      avatar: data.avatar,
      description: data.description || '',
      personality: data.personality || '',
      speechStyle: data.speechStyle || '',
      greetingMessages: data.greetingMessages || [''],
      exampleDialogues: data.exampleDialogues || [],
      tags: data.tags || [],
      isPlayable: data.isPlayable || false,
      samplingOverrides: data.samplingOverrides,
      linkedLoreEntryIds: data.linkedLoreEntryIds || [],
    };
    await this.db.characters.add(character);
    return character;
  }

  async updateCharacter(id: string, data: Partial<Character>): Promise<void> {
    await this.db.characters.update(id, { ...data, updatedAt: now() });
  }

  async deleteCharacter(id: string): Promise<void> {
    await this.db.characters.delete(id);
  }

  // ── Personas ──

  async getAllPersonas(): Promise<Persona[]> {
    return this.db.personas.toArray();
  }

  async getDefaultPersona(): Promise<Persona | undefined> {
    return this.db.personas.where('isDefault').equals(1).first();
  }

  async createPersona(data: Partial<Persona>): Promise<Persona> {
    const persona: Persona = {
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
      name: data.name || 'User',
      description: data.description || '',
      avatar: data.avatar,
      isDefault: data.isDefault || false,
    };
    // If this is default, unset other defaults
    if (persona.isDefault) {
      await this.db.personas.where('isDefault').equals(1).modify({ isDefault: false });
    }
    await this.db.personas.add(persona);
    return persona;
  }

  async updatePersona(id: string, data: Partial<Persona>): Promise<void> {
    if (data.isDefault) {
      await this.db.personas.where('isDefault').equals(1).modify({ isDefault: false });
    }
    await this.db.personas.update(id, { ...data, updatedAt: now() });
  }

  async deletePersona(id: string): Promise<void> {
    await this.db.personas.delete(id);
  }
}
