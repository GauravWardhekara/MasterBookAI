import { BaseModel } from './base.model';

/**
 * Lore type categories for lore entries.
 */
export enum LoreType {
  PREMISE = 'premise',
  HISTORY = 'history',
  MEMORY = 'memory',
  FACTION = 'faction',
  LOCATION = 'location',
  SPECIES = 'species',
}

/**
 * Display metadata for lore types (icon and color).
 */
export const LORE_TYPE_META: Record<LoreType, { label: string; icon: string; color: string }> = {
  [LoreType.PREMISE]: { label: 'Premise', icon: 'book-outline', color: '#a78bfa' },
  [LoreType.HISTORY]: { label: 'History', icon: 'time-outline', color: '#f59e0b' },
  [LoreType.MEMORY]: { label: 'Memory', icon: 'cloud-outline', color: '#60a5fa' },
  [LoreType.FACTION]: { label: 'Faction', icon: 'people-outline', color: '#f87171' },
  [LoreType.LOCATION]: { label: 'Location', icon: 'location-outline', color: '#34d399' },
  [LoreType.SPECIES]: { label: 'Species', icon: 'paw-outline', color: '#fb923c' },
};

/**
 * A single lore entry within a Lorebook.
 */
export interface LoreEntry extends BaseModel {
  lorebookId: string;

  title: string;
  loreType: LoreType;
  loreDescription: string;           // AI-facing description injected into context
  triggerWords: string[];             // keywords that activate this entry

  // Cross-links
  linkedLoreEntryIds: string[];       // references to other lore entries
  linkedCharacterIds: string[];       // references to characters

  // Injection settings
  insertionPosition: 'before-context' | 'after-context' | 'in-context' | 'before_char' | 'after_char' | 'before_example' | 'after_example' | 'ANDepth';
  scanDepth: number;                  // how far back in history to scan for triggers
  probability: number;                // 0-1, chance of injection when triggered
  isRecursive: boolean;               // whether this entry can trigger other entries
  isEnabled: boolean;

  // ── SillyTavern World Info Advanced Fields ──

  // Secondary trigger keys with selective logic
  keySecondary?: string[];            // secondary trigger keys (AND/NOT logic)
  selectiveLogic?: 'AND_ANY' | 'AND_ALL' | 'NOT_ANY' | 'NOT_ALL';

  // Ordering & positioning
  order?: number;                     // manual sort order for injection priority
  depth?: number;                     // context depth for ANDepth position

  // Group-based mutual exclusion
  group?: string;                     // group name — only highest-weight entry per group is injected
  groupOverride?: boolean;            // override group priority rules
  groupWeight?: number;               // weight within group (higher = more likely)

  // Special injection modes
  constant?: boolean;                 // always inject regardless of triggers
  preventRecursion?: boolean;         // prevent recursive activation from this entry
  excludeRecursion?: boolean;         // exclude from recursive scans
  useProbability?: boolean;           // flag to enable probability-based injection

  // Token management
  tokenBudget?: number;               // max tokens this entry can consume

  // Author metadata (not sent to AI)
  comment?: string;                   // author-facing notes
  automationId?: string;              // for conditional logic / state tracking
  vectorized?: boolean;               // has been embedded for vector search
}

/**
 * A Lorebook is a collection of lore entries that can be linked to scenarios.
 */
export interface Lorebook extends BaseModel {
  title: string;
  description: string;
  coverImage?: string;
  entries: LoreEntry[];
  tags: string[];
}

/**
 * Create a default Lorebook.
 */
export function createDefaultLorebook(): Partial<Lorebook> {
  return {
    title: '',
    description: '',
    entries: [],
    tags: [],
  };
}

/**
 * Create a default LoreEntry.
 */
export function createDefaultLoreEntry(lorebookId: string): Partial<LoreEntry> {
  return {
    lorebookId,
    title: '',
    loreType: LoreType.PREMISE,
    loreDescription: '',
    triggerWords: [],
    linkedLoreEntryIds: [],
    linkedCharacterIds: [],
    insertionPosition: 'before-context',
    scanDepth: 5,
    probability: 1.0,
    isRecursive: false,
    isEnabled: true,
    // SillyTavern defaults
    keySecondary: [],
    selectiveLogic: 'AND_ANY',
    order: 100,
    constant: false,
    preventRecursion: false,
    excludeRecursion: false,
    useProbability: false,
    vectorized: false,
  };
}
