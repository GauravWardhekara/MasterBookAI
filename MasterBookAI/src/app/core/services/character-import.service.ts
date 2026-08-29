import { Injectable } from '@angular/core';
import { CharacterService } from './character.service';
import { Character } from '../models/character.model';

/** SillyTavern-compatible Character Card V2 format */
export interface CharCardV2 {
  spec?: string;
  spec_version?: string;
  data: {
    name: string;
    description?: string;
    personality?: string;
    scenario?: string;
    first_mes?: string;
    mes_example?: string;
    system_prompt?: string;
    post_history_instructions?: string;
    creator_notes?: string;
    tags?: string[];
    alternate_greetings?: string[];
    creator?: string;
    character_version?: string;
  };
}

/** SillyTavern-compatible Character Card V1 format */
export interface CharCardV1 {
  name: string;
  description?: string;
  personality?: string;
  scenario?: string;
  first_mes?: string;
  mes_example?: string;
  tags?: string[];
  creator?: string;
}

export type ImportSource =
  | 'auto'
  | 'chub'
  | 'pygmalion'
  | 'character-tavern'
  | 'aicharactercards'
  | 'botbooru'
  | 'raw';

@Injectable({ providedIn: 'root' })
export class CharacterImportService {
  constructor(private characterService: CharacterService) {}

  /**
   * Parse a SillyTavern Character Card V2 or V1 JSON object into a Character.
   */
  parseCharCard(json: CharCardV1 | CharCardV2): Partial<Character> {
    // Detect V2
    const isV2 = 'spec' in json && (json as CharCardV2).spec === 'chara_card_v2';
    const data = isV2 ? (json as CharCardV2).data : (json as CharCardV1);

    const name = data.name?.trim() || 'Imported Character';

    // Build description from available fields
    let description = '';
    if (data.description) description += data.description.trim();
    if (data.scenario) description += (description ? '\n\n**Scenario:**\n' : '') + data.scenario.trim();

    // Build greeting messages
    const greetings: string[] = [];
    if (data.first_mes) greetings.push(data.first_mes);
    if (isV2 && (json as CharCardV2).data.alternate_greetings) {
      greetings.push(...((json as CharCardV2).data.alternate_greetings || []));
    }

    // Build example dialogues from mes_example
    const exampleDialogues: string[] = [];
    if (data.mes_example) exampleDialogues.push(data.mes_example.trim());

    return {
      name,
      description,
      personality: data.personality?.trim() || '',
      speechStyle: '',
      greetingMessages: greetings.length > 0 ? greetings : [''],
      alternateGreetings: isV2 ? ((json as CharCardV2).data.alternate_greetings || []) : [],
      exampleDialogues,
      tags: data.tags || [],
      isPlayable: false,
      linkedLoreEntryIds: [],
      systemPrompt: (data as any).system_prompt || '',
      postHistoryInstructions: (data as any).post_history_instructions || '',
      creatorNotes: (data as any).creator_notes || '',
    };
  }

  /**
   * Import a character from a chub.ai / characterhub.org character fullPath.
   * fullPath is in the form "AuthorName/char-name"
   */
  async importFromChub(fullPath: string): Promise<Partial<Character>> {
    // Try V2 API first
    const apiUrl = `https://api.chub.ai/api/characters/${fullPath}`;
    const resp = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' }
    });
    if (!resp.ok) throw new Error(`Chub.ai API error: ${resp.status}`);
    const apiData = await resp.json();

    // chub.ai returns node.definition which is the char card
    const definition = apiData?.node?.definition;
    if (!definition) {
      const maxResUrl = apiData?.node?.max_res_url;
      if (maxResUrl && maxResUrl.endsWith('.png')) {
        return this.importFromRawUrl(maxResUrl);
      }
      throw new Error('Could not find character definition from chub.ai');
    }

    const cardJson: CharCardV2 = {
      spec: 'chara_card_v2',
      data: {
        name: definition.name,
        description: definition.description,
        personality: definition.personality,
        scenario: definition.scenario,
        first_mes: definition.first_message,
        mes_example: definition.example_dialogues,
        tags: apiData?.node?.topics || [],
        system_prompt: definition.system_prompt,
        post_history_instructions: definition.post_history_instructions,
        creator_notes: definition.creator_notes,
        alternate_greetings: definition.alternate_greetings || [],
      }
    };

    // Also grab the avatar if available
    const character = this.parseCharCard(cardJson);
    const avatarUrl = apiData?.node?.avatar_url;
    if (avatarUrl) {
      character.avatar = await this.fetchImageAsBase64(avatarUrl);
    }
    return character;
  }

  /**
   * Import a character from pygmalion.chat using the character UUID.
   */
  async importFromPygmalion(characterId: string): Promise<Partial<Character>> {
    const apiUrl = `https://pygmalion.chat/api/profiles/character/?id=${characterId}`;
    const resp = await fetch(apiUrl, { headers: { Accept: 'application/json' } });
    if (!resp.ok) throw new Error(`Pygmalion.chat error: ${resp.status}`);
    const data = await resp.json();
    const pd = data?.data?.attributes ?? data;

    const character: Partial<Character> = {
      name: pd.name?.trim() || 'Imported Character',
      description: pd.description?.trim() || pd.persona?.trim() || '',
      personality: pd.personality?.trim() || '',
      speechStyle: '',
      greetingMessages: pd.example_dialogs ? [pd.example_dialogs] : pd.first_message ? [pd.first_message] : ['Hello!'],
      exampleDialogues: [],
      tags: [],
      isPlayable: false,
      linkedLoreEntryIds: [],
    };

    if (pd.avatar) {
      character.avatar = await this.fetchImageAsBase64(pd.avatar).catch(() => undefined);
    }
    return character;
  }

  /**
   * Import from character-tavern.com by character slug/ID.
   */
  async importFromCharacterTavern(characterId: string): Promise<Partial<Character>> {
    const apiUrl = `https://character-tavern.com/api/character?id=${characterId}`;
    const resp = await fetch(apiUrl, { headers: { Accept: 'application/json' } });
    if (!resp.ok) throw new Error(`Character-Tavern error: ${resp.status}`);
    const data = await resp.json();

    const character: Partial<Character> = {
      name: data.name?.trim() || 'Imported',
      description: data.description?.trim() || '',
      personality: data.personality?.trim() || '',
      speechStyle: '',
      greetingMessages: data.first_message ? [data.first_message] : ['Hello!'],
      exampleDialogues: data.mes_example ? [data.mes_example] : [],
      tags: data.tags || [],
      isPlayable: false,
      linkedLoreEntryIds: [],
    };
    if (data.avatar_url) {
      character.avatar = await this.fetchImageAsBase64(data.avatar_url).catch(() => undefined);
    }
    return character;
  }

  /**
   * Import from a raw URL (direct .json or .png with embedded tEXt chunk).
   */
  async importFromRawUrl(url: string): Promise<Partial<Character>> {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch URL: ${resp.status} ${resp.statusText}`);

    const contentType = resp.headers.get('content-type') || '';

    if (contentType.includes('application/json') || url.endsWith('.json')) {
      const json = await resp.json();
      return this.parseCharCard(json);
    }

    if (contentType.includes('image/png') || url.endsWith('.png')) {
      const buffer = await resp.arrayBuffer();
      const charData = this.extractCharDataFromPng(new Uint8Array(buffer));
      if (!charData) throw new Error('No character data found in PNG file');
      
      // Correctly decode UTF-8 from base64
      const binaryStr = atob(charData);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const jsonText = new TextDecoder().decode(bytes);
      const json = JSON.parse(jsonText);
      
      const character = this.parseCharCard(json);
      // Use the PNG as avatar
      character.avatar = `data:image/png;base64,${this.uint8ArrayToBase64(new Uint8Array(buffer))}`;
      return character;
    }

    // Try JSON as fallback
    const text = await resp.text();
    const json = JSON.parse(text);
    return this.parseCharCard(json);
  }

  /**
   * High-level import that dispatches based on source and input.
   */
  async importAndSave(source: ImportSource, input: string): Promise<Character> {
    let charData: Partial<Character>;

    switch (source) {
      case 'chub':
        charData = await this.importFromChub(input);
        break;
      case 'pygmalion':
        charData = await this.importFromPygmalion(input);
        break;
      case 'character-tavern':
        charData = await this.importFromCharacterTavern(input);
        break;
      case 'raw':
        charData = await this.importFromRawUrl(input);
        break;
      case 'auto':
      default:
        charData = await this.autoDetectAndImport(input);
        break;
    }

    return await this.characterService.createCharacter(charData);
  }

  /**
   * Auto-detect source from URL and dispatch to appropriate importer.
   */
  async autoDetectAndImport(input: string): Promise<Partial<Character>> {
    const lower = input.toLowerCase();
    if (lower.includes('chub.ai') || lower.includes('characterhub.org')) {
      // Extract full path from URL: "https://chub.ai/characters/Author/char-name" → "Author/char-name"
      const match = input.match(/\/characters\/(.+?)(?:\?|$)/);
      if (match) return this.importFromChub(match[1]);
    }
    if (lower.includes('pygmalion.chat')) {
      const match = input.match(/\/character\/([a-f0-9-]+)/);
      if (match) return this.importFromPygmalion(match[1]);
    }
    if (lower.includes('character-tavern.com')) {
      const match = input.match(/\/character\/([^/?]+)/);
      if (match) return this.importFromCharacterTavern(match[1]);
    }
    // Fallback to raw URL download
    return this.importFromRawUrl(input);
  }

  // ── PNG Helpers ──

  /**
   * Extract the embedded character data from a PNG tEXt chunk (SillyTavern standard).
   */
  private extractCharDataFromPng(data: Uint8Array): string | null {
    // Skip PNG header (8 bytes)
    let offset = 8;
    while (offset < data.length) {
      const length = this.readUint32(data, offset);
      const type = String.fromCharCode(data[offset+4], data[offset+5], data[offset+6], data[offset+7]);
      if (type === 'tEXt') {
        const chunkData = data.slice(offset + 8, offset + 8 + length);
        const nullIndex = chunkData.indexOf(0);
        const keyword = new TextDecoder().decode(chunkData.slice(0, nullIndex));
        const value = new TextDecoder().decode(chunkData.slice(nullIndex + 1));
        if (keyword === 'chara') return value;
      }
      offset += 12 + length;
    }
    return null;
  }

  private readUint32(data: Uint8Array, offset: number): number {
    return ((data[offset] << 24) | (data[offset+1] << 16) | (data[offset+2] << 8) | data[offset+3]) >>> 0;
  }

  private uint8ArrayToBase64(data: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < data.byteLength; i++) binary += String.fromCharCode(data[i]);
    return btoa(binary);
  }

  private async fetchImageAsBase64(url: string): Promise<string> {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Image fetch failed: ${resp.status}`);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
