import { Injectable } from '@angular/core';
import { Message } from '../models/chat-session.model';

/**
 * Macro expansion engine inspired by SillyTavern's macro system.
 * Replaces {{macro}} placeholders in prompts, lore entries, and instructions.
 */
@Injectable({ providedIn: 'root' })
export class MacroService {

  /**
   * Expand all supported macros in the given text.
   */
  expand(
    text: string,
    context: MacroContext
  ): string {
    if (!text) return text;

    let result = text;

    // ── Identity Macros ──
    result = result.replace(/\{\{user\}\}/gi, context.userName || 'User');
    result = result.replace(/\{\{char\}\}/gi, context.charName || 'Character');

    // ── Time & Date Macros ──
    const now = new Date();
    result = result.replace(/\{\{time\}\}/gi, now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    result = result.replace(/\{\{date\}\}/gi, now.toLocaleDateString());
    result = result.replace(/\{\{weekday\}\}/gi, now.toLocaleDateString(undefined, { weekday: 'long' }));
    result = result.replace(/\{\{month\}\}/gi, now.toLocaleDateString(undefined, { month: 'long' }));
    result = result.replace(/\{\{year\}\}/gi, String(now.getFullYear()));
    result = result.replace(/\{\{isotime\}\}/gi, now.toISOString());

    // ── Idle Duration ──
    if (context.lastMessageTimestamp) {
      const lastTime = new Date(context.lastMessageTimestamp).getTime();
      const diff = now.getTime() - lastTime;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      let idleStr: string;
      if (days > 0) idleStr = `${days} day${days > 1 ? 's' : ''}`;
      else if (hours > 0) idleStr = `${hours} hour${hours > 1 ? 's' : ''}`;
      else idleStr = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      result = result.replace(/\{\{idle_duration\}\}/gi, idleStr);
    } else {
      result = result.replace(/\{\{idle_duration\}\}/gi, 'just now');
    }

    // ── Message Context Macros ──
    const messages = context.messages || [];
    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : undefined;
    const lastCharMsg = [...messages].reverse().find(m => m.role === 'assistant');
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');

    result = result.replace(/\{\{lastMessage\}\}/gi, lastMsg?.content || '');
    result = result.replace(/\{\{lastCharMessage\}\}/gi, lastCharMsg?.content || '');
    result = result.replace(/\{\{lastUserMessage\}\}/gi, lastUserMsg?.content || '');
    result = result.replace(/\{\{mesCount\}\}/gi, String(messages.length));

    // ── Word Count ──
    const totalWords = messages
      .filter(m => m.role === 'assistant')
      .reduce((sum, m) => sum + m.content.split(/\s+/).filter(w => w).length, 0);
    result = result.replace(/\{\{wordCount\}\}/gi, String(totalWords));

    // ── Random Selection: {{random::option1::option2::option3}} ──
    result = result.replace(/\{\{random::([^}]+)\}\}/gi, (_match, options: string) => {
      const items = options.split('::').map(s => s.trim()).filter(s => s);
      if (items.length === 0) return '';
      return items[Math.floor(Math.random() * items.length)];
    });

    // ── Dice Roll: {{roll:NdM}} e.g. {{roll:2d6}} ──
    result = result.replace(/\{\{roll:(\d+)d(\d+)\}\}/gi, (_match, numStr: string, sidesStr: string) => {
      const num = parseInt(numStr, 10);
      const sides = parseInt(sidesStr, 10);
      if (isNaN(num) || isNaN(sides) || num < 1 || sides < 1) return '0';
      let total = 0;
      for (let i = 0; i < Math.min(num, 100); i++) {
        total += Math.floor(Math.random() * sides) + 1;
      }
      return String(total);
    });

    // ── Turn Count (only user messages) ──
    const turnCount = messages.filter(m => m.role === 'user').length;
    result = result.replace(/\{\{turnCount\}\}/gi, String(turnCount));

    // ── Original Input (for post-processing) ──
    if (context.originalInput) {
      result = result.replace(/\{\{input\}\}/gi, context.originalInput);
    }

    return result;
  }

  /**
   * Expand macros in an array of texts.
   */
  expandAll(texts: string[], context: MacroContext): string[] {
    return texts.map(t => this.expand(t, context));
  }
}

/**
 * Context needed to resolve macros.
 */
export interface MacroContext {
  userName?: string;
  charName?: string;
  messages?: Message[];
  lastMessageTimestamp?: string;
  originalInput?: string;
}
