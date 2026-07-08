import { Character } from './character.model';
import { WorldInfoEntry } from './world-info.model';

/**
 * Scenario — a container for characters, world info, and chat settings
 */
export interface Scenario {
  id: string;
  title: string;
  description: string;
  characters: ScenarioCharacter[];
  worldInfoIds: string[];
  specialInstructions: string; // injected as system prompt guidance
  defaultMode: 'chat' | 'story';
  defaultPov?: 'first-person' | 'third-person';
  defaultTense?: 'present' | 'past';
  tags: string[];
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScenarioCharacter {
  characterId: string;
  role: 'playable' | 'npc' | 'observer';
  turnOrder?: number;
}
