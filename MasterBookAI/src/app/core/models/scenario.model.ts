import { BaseModel } from './base.model';

/**
 * A Scenario ties together characters, lorebooks, and configuration for a chat/story session.
 */
export interface Scenario extends BaseModel {
  title: string;
  description: string;
  coverImage?: string;

  // Character assignments
  characterIds: string[];
  characterRoles: Record<string, 'playable' | 'npc'>;

  // Lorebook assignments (multiple lorebooks supported, priority ordered)
  lorebookIds: string[];

  // Chat/Story configuration
  specialInstructions: string;        // system prompt
  defaultMode: 'chat' | 'story';
  defaultPOV: '1st-person' | '3rd-person';
  defaultTense: 'past' | 'present';

  tags: string[];
}

/**
 * Create a default Scenario.
 */
export function createDefaultScenario(): Partial<Scenario> {
  return {
    title: '',
    description: '',
    characterIds: [],
    characterRoles: {},
    lorebookIds: [],
    specialInstructions: '',
    defaultMode: 'chat',
    defaultPOV: '1st-person',
    defaultTense: 'present',
    tags: [],
  };
}
