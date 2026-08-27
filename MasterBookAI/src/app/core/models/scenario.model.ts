import { BaseModel } from './base.model';

/**
 * A Scenario ties together characters, lorebooks, and configuration for a chat/story session.
 */
export interface Scenario extends BaseModel {
  title: string;
  description: string;
  coverImage?: string;
  type: 'world' | 'scenario'; // Discriminator for standalone UI options

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

  // ── World Building Dashboard Fields ──
  
  // Basics
  summary?: string;
  contentWarning?: string;
  backgroundImage?: string;
  backgroundAspect?: '4:3' | '1:1' | '9:16';
  suggestedTheme?: string;
  genre?: string;
  genrePresetId?: string;             // link to a built-in genre preset
  selectedRole?: string;              // role chosen within the genre
  actionHistoryEnabled?: boolean;     // track action→consequence pairs (adventure mode)
  authorNotes?: string;

  // Story
  generalInstructions?: string;
  nsfwInstructions?: string;
  namedInstructions?: { id: string; name: string; content: string; authorNotes: string; }[];
  narrationLength?: 'brief' | 'standard';
  introduction?: string;
  journeyObjective?: string;
  showObjectiveToPlayer?: boolean;
  firstActionSuggestion?: string;
  endingMode?: 'off' | 'simple' | 'multiple';

  // ── RPG Mechanics ──
  isRpgModeEnabled?: boolean;
  rpgSystem?: 'D&D' | 'Cultivation' | 'None';
}

/**
 * Create a default Scenario.
 */
export function createDefaultScenario(type: 'world' | 'scenario' = 'scenario'): Partial<Scenario> {
  return {
    type,
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
    actionHistoryEnabled: false,
    isRpgModeEnabled: false,
    rpgSystem: 'None',
  };
}
