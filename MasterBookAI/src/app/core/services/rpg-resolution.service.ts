import { Injectable } from '@angular/core';
import { Character, DnDStats, CultivationStats } from '../models/character.model';
import { Scenario } from '../models/scenario.model';

export interface RpgResolutionResult {
  actionText: string;
  isAction: boolean;
  systemInjectedText?: string; // This will be injected into the prompt as a Game Master instruction
}

@Injectable({
  providedIn: 'root'
})
export class RpgResolutionService {

  constructor() { }

  /**
   * Checks if the user's input is an explicit RPG action (e.g., prefixed with '!')
   * and resolves it with RNG if applicable.
   */
  resolveAction(input: string, scenario: Scenario, persona?: Partial<Character>): RpgResolutionResult {
    const isAction = input.trim().startsWith('!');
    
    if (!isAction || !scenario.isRpgModeEnabled || !persona?.rpgData) {
      return { actionText: input, isAction: false };
    }

    const actionDescription = input.trim().substring(1).trim(); // Remove the '!'
    let injectedText = '';

    if (scenario.rpgSystem === 'D&D' && persona.rpgData.dndStats) {
      injectedText = this.resolveDndAction(actionDescription, persona.rpgData.dndStats);
    } else if (scenario.rpgSystem === 'Cultivation' && persona.rpgData.cultivationStats) {
      injectedText = this.resolveCultivationAction(actionDescription, persona.rpgData.cultivationStats);
    } else {
      // Fallback for freeform/none
      injectedText = `[System: The user attempts to "${actionDescription}". Decide the outcome based on the narrative.]`;
    }

    return {
      actionText: actionDescription,
      isAction: true,
      systemInjectedText: injectedText
    };
  }

  private resolveDndAction(action: string, stats: DnDStats): string {
    const d20 = Math.floor(Math.random() * 20) + 1;
    
    // Very naive stat extraction based on keywords in the action.
    // In a full implementation, you'd ask the LLM to determine the DC and skill, 
    // but for immediate resolution, we pass the roll to the LLM to adjudicate.
    const statModifiers = `STR: ${this.calculateMod(stats.str)} | DEX: ${this.calculateMod(stats.dex)} | INT: ${this.calculateMod(stats.int)} | WIS: ${this.calculateMod(stats.wis)} | CHA: ${this.calculateMod(stats.cha)}`;
    
    return `[System: The player attempts the action: "${action}". They rolled a d20 and got a ${d20}. Their modifiers are [${statModifiers}]. Act as the Game Master, apply the most relevant modifier to their roll of ${d20}, determine a reasonable Difficulty Class (DC) for this action, and narrate the success or failure dynamically.]`;
  }

  private resolveCultivationAction(action: string, stats: CultivationStats): string {
    const luckRoll = Math.floor(Math.random() * 100) + 1;
    return `[System: The player attempts the cultivation action: "${action}". They are at Realm: ${stats.realm}, Stage: ${stats.stage}, with Qi: ${stats.qi}. Their Karma/Luck roll is ${luckRoll}/100. Act as the Game Master and determine the outcome based on their current power level and the luck roll, then narrate the result.]`;
  }

  private calculateMod(stat: number): string {
    const mod = Math.floor((stat - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }

  /**
   * Decrements the active persona's needs slightly per turn/action.
   * Returns true if needs were successfully decremented.
   */
  advanceTurn(persona?: Partial<Character>): boolean {
    if (!persona?.rpgData?.needs) return false;
    
    // Decrease needs by 1 per turn (clamped to 0)
    persona.rpgData.needs.hunger = Math.max(0, persona.rpgData.needs.hunger - 1);
    persona.rpgData.needs.thirst = Math.max(0, persona.rpgData.needs.thirst - 1);
    persona.rpgData.needs.rest = Math.max(0, persona.rpgData.needs.rest - 1);

    return true;
  }

  /**
   * Generates a system prompt to inform the Game Master (LLM) about the player's current needs,
   * so it can apply penalties or narrate exhaustion if they drop too low.
   */
  getNeedsSystemPrompt(persona?: Partial<Character>): string {
    if (!persona?.rpgData?.needs) return '';

    const { hunger, thirst, rest } = persona.rpgData.needs;
    
    if (hunger < 20 || thirst < 20 || rest < 20) {
      let warning = '[System Notice: The player is experiencing severe deprivation. ';
      if (hunger < 20) warning += 'They are starving. ';
      if (thirst < 20) warning += 'They are severely dehydrated. ';
      if (rest < 20) warning += 'They are exhausted from lack of rest. ';
      warning += 'As the GM, impose penalties on their actions and narrate their suffering.]';
      return warning;
    }

    return `[System Notice: Player Needs - Hunger: ${hunger}/100, Thirst: ${thirst}/100, Rest: ${rest}/100]`;
  }
}
