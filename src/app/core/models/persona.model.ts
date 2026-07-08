/**
 * Persona — the user's own identity in chat
 */
export interface Persona {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string;
  personalityNotes?: string;
  exampleDialogue?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
