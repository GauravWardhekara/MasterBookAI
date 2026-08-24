import { Injectable } from '@angular/core';
import { MLCEngine, CreateMLCEngine, InitProgressCallback } from '@mlc-ai/web-llm';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebLlmService {
  private engine: MLCEngine | null = null;
  public progress$ = new Subject<{text: string, progress: number}>();
  private currentModelId = '';

  constructor() {}

  /**
   * Check if WebGPU is supported natively.
   */
  isSupported(): boolean {
    return 'gpu' in navigator;
  }

  /**
   * Initializes the engine with the specified model if it's not already loaded.
   */
  async loadModel(modelId: string): Promise<void> {
    if (this.engine && this.currentModelId === modelId) {
      return;
    }
    
    if (!this.isSupported()) {
      throw new Error('WebGPU is not supported by this browser/device. Mobile-native LLMs cannot run.');
    }

    const initProgressCallback: InitProgressCallback = (report) => {
      this.progress$.next({ text: report.text, progress: report.progress });
    };

    try {
      this.engine = await CreateMLCEngine(modelId, { initProgressCallback });
      this.currentModelId = modelId;
    } catch (err) {
      this.engine = null;
      this.currentModelId = '';
      throw err;
    }
  }

  /**
   * Generate a response using the loaded MLCEngine.
   */
  async generate(messages: {role: string, content: string}[], options?: any): Promise<string> {
    if (!this.engine) {
      throw new Error('Engine not initialized. Call loadModel first.');
    }
    
    // Map messages to MLC's format (which is OpenAI compatible)
    const formattedMessages = messages.map(m => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content
    }));

    const reply = await this.engine.chat.completions.create({
      messages: formattedMessages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 512,
    });
    
    return reply.choices[0].message.content || '';
  }
  
  async unloadModel() {
    if (this.engine) {
      // In @mlc-ai/web-llm v0.2.40+ engine.unload() is available to free GPU memory
      try {
        if (typeof (this.engine as any).unload === 'function') {
          await (this.engine as any).unload();
        }
      } catch (e) {
        console.warn('Error unloading MLC Engine', e);
      }
      this.engine = null;
      this.currentModelId = '';
    }
  }
}
