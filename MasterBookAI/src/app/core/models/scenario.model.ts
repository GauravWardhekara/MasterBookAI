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

  // ── Solo Character Card Fields ──
  characterName: string;              // max 100
  characterTitle: string;             // max 100, defaults to name
  characterImage?: string;            // base64 data URI
  characterIntro: string;             // max 500
  personalityBackground: string;      // max 4000
  appearance: string;                 // max 2000
  greeting: string;                   // max 4000
  scenarioText: string;               // max 2000
  exampleDialogue: string;            // max 1000
  isNsfw: boolean;
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
    characterName: '',
    characterTitle: '',
    characterIntro: '',
    personalityBackground: '',
    appearance: '',
    greeting: '',
    scenarioText: '',
    exampleDialogue: '',
    isNsfw: false,
  };
}
