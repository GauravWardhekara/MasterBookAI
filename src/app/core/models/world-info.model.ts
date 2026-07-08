/**
 * WorldInfo / Lore entry — keyword-triggered context injection
 */
export interface WorldInfoEntry {
  id: string;
  title: string;
  keywords: string[]; // triggers for insertion
  content: string;
  insertionPosition: 'before-context' | 'after-context' | 'system';
  scanDepth: number; // how many recent messages to scan
  probability: number; // 0-1 chance of triggering
  recursion: boolean; // can trigger other entries
  scenarioIds?: string[]; // linked scenarios
  createdAt: Date;
  updatedAt: Date;
}
