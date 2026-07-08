/**
 * Character — AI companion / NPC definition
 * Compatible with SillyTavern-style character cards
 */
export interface Character {
  id: string;
  name: string;
  avatarUrl?: string;
  description: string; // main character description
  personality: string;
  speechStyle?: string; // how they talk
  greetingMessages: string[];
  exampleDialogue?: string;
  tags: string[];
  isPlayable: boolean; // true = user can chat as this character
  isNpc: boolean; // true = AI-controlled NPC
  samplingOverride?: Partial<{
    temperature: number;
    topP: number;
    maxTokens: number;
  }>;
  creatorNotes?: string;
  version?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterCardImport {
  name: string;
  description?: string;
  personality?: string;
  first_mes?: string;
  mes_example?: string;
  creatorcomment?: string;
  tags?: string[];
  // PNG-embedded JSON or plain JSON format
}
