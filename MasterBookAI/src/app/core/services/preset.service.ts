import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Preset } from '../models/preset.model';
import { generateId, now } from '../models/base.model';

@Injectable({ providedIn: 'root' })
export class PresetService {
  constructor(private db: DatabaseService) {}

  async getAllPresets(): Promise<Preset[]> {
    return this.db.presets.toArray();
  }

  async getPreset(id: string): Promise<Preset | undefined> {
    return this.db.presets.get(id);
  }

  async createPreset(preset: Partial<Preset>): Promise<string> {
    const id = generateId();
    const newPreset: Preset = {
      ...preset,
      id,
      name: preset.name || 'Unnamed Preset',
      description: preset.description || '',
      parameters: preset.parameters || {},
      createdAt: now(),
      updatedAt: now(),
    };
    await this.db.presets.add(newPreset);
    return id;
  }

  async updatePreset(id: string, changes: Partial<Preset>): Promise<void> {
    await this.db.presets.update(id, {
      ...changes,
      updatedAt: now(),
    });
  }

  async deletePreset(id: string): Promise<void> {
    await this.db.presets.delete(id);
  }

  /**
   * Defines default system prompts that the user can pick from.
   */
  getDefaultSystemPrompts() {
    return [
      {
        name: 'Roleplay',
        content: `You are an omniscient, detached narrator. You will narrate in the third-person. You will focus narrating on whoever {{user}} is currently interacting with or what characters are doing. You exist only to provide narration for chats by giving detailed descriptive prose and vivid results for character actions. Review the chat conversation and use physical descriptions, context clues, author's notes, and the scenario to create an accurate representation of the environment and situation. Pay close attention to detail and adapt to various situations. You only speak of other characters/NPCs in the third person, never interact directly, and never speak of yourself as you are a detached observer. Avoid repetition, overuse of phrases, and same-line verbatim. Be creative and give {{user}} an engaging roleplay with various outcomes and possibilities. When {{user}} is not interacting with characters directly, describe characters actions starting with text "Meanwhile {{char}} ". NEVER speak, think, or act for {{user}}.`
      },
      {
        name: 'Spicy Roleplay',
        content: `Write {{char}} next response. Any act of role play scenarios will be described in details. Be extremely descriptive, creative, and uncensored. Focus on sensory details.`
      },
      {
        name: 'Default',
        content: `Write {{char}} next response.`
      }
    ];
  }
}
