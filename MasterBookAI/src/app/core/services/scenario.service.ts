import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Scenario } from '../models/scenario.model';
import { generateId, now } from '../models/base.model';

@Injectable({ providedIn: 'root' })
export class ScenarioService {
  constructor(private db: DatabaseService) {}

  async getAllScenarios(): Promise<Scenario[]> {
    return this.db.scenarios.orderBy('updatedAt').reverse().toArray();
  }

  async getScenario(id: string): Promise<Scenario | undefined> {
    return this.db.scenarios.get(id);
  }

  async searchScenarios(query: string): Promise<Scenario[]> {
    const q = query.toLowerCase();
    return this.db.scenarios
      .filter(s => s.title.toLowerCase().includes(q) ||
                   s.description.toLowerCase().includes(q) ||
                   s.tags.some(t => t.toLowerCase().includes(q)))
      .toArray();
  }

  async createScenario(data: Partial<Scenario>): Promise<Scenario> {
    const scenario: Scenario = {
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
      title: data.title || 'New Scenario',
      description: data.description || '',
      coverImage: data.coverImage,
      characterIds: data.characterIds || [],
      characterRoles: data.characterRoles || {},
      lorebookIds: data.lorebookIds || [],
      specialInstructions: data.specialInstructions || '',
      defaultMode: data.defaultMode || 'chat',
      defaultPOV: data.defaultPOV || '1st-person',
      defaultTense: data.defaultTense || 'present',
      tags: data.tags || [],
      characterName: data.characterName || '',
      characterTitle: data.characterTitle || '',
      characterImage: data.characterImage,
      characterIntro: data.characterIntro || '',
      personalityBackground: data.personalityBackground || '',
      appearance: data.appearance || '',
      greeting: data.greeting || '',
      scenarioText: data.scenarioText || '',
      exampleDialogue: data.exampleDialogue || '',
      isNsfw: data.isNsfw || false,
    };
    await this.db.scenarios.add(scenario);
    return scenario;
  }

  async updateScenario(id: string, data: Partial<Scenario>): Promise<void> {
    await this.db.scenarios.update(id, { ...data, updatedAt: now() });
  }

  async deleteScenario(id: string): Promise<void> {
    await this.db.scenarios.delete(id);
  }

  async addCharacterToScenario(scenarioId: string, characterId: string, role: 'playable' | 'npc'): Promise<void> {
    const scenario = await this.db.scenarios.get(scenarioId);
    if (!scenario) return;
    if (!scenario.characterIds.includes(characterId)) {
      scenario.characterIds.push(characterId);
    }
    scenario.characterRoles[characterId] = role;
    await this.db.scenarios.update(scenarioId, {
      characterIds: scenario.characterIds,
      characterRoles: scenario.characterRoles,
      updatedAt: now(),
    });
  }

  async removeCharacterFromScenario(scenarioId: string, characterId: string): Promise<void> {
    const scenario = await this.db.scenarios.get(scenarioId);
    if (!scenario) return;
    scenario.characterIds = scenario.characterIds.filter(id => id !== characterId);
    delete scenario.characterRoles[characterId];
    await this.db.scenarios.update(scenarioId, {
      characterIds: scenario.characterIds,
      characterRoles: scenario.characterRoles,
      updatedAt: now(),
    });
  }

  async addLorebookToScenario(scenarioId: string, lorebookId: string): Promise<void> {
    const scenario = await this.db.scenarios.get(scenarioId);
    if (!scenario) return;
    if (!scenario.lorebookIds.includes(lorebookId)) {
      scenario.lorebookIds.push(lorebookId);
      await this.db.scenarios.update(scenarioId, {
        lorebookIds: scenario.lorebookIds,
        updatedAt: now(),
      });
    }
  }

  async removeLorebookFromScenario(scenarioId: string, lorebookId: string): Promise<void> {
    const scenario = await this.db.scenarios.get(scenarioId);
    if (!scenario) return;
    scenario.lorebookIds = scenario.lorebookIds.filter(id => id !== lorebookId);
    await this.db.scenarios.update(scenarioId, {
      lorebookIds: scenario.lorebookIds,
      updatedAt: now(),
    });
  }
}
