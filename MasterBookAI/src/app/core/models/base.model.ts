/**
 * Base model with common fields shared by all entities.
 */
export interface BaseModel {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Generate a unique ID using crypto.randomUUID with fallback.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get current ISO timestamp.
 */
export function now(): string {
  return new Date().toISOString();
}
