import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { LLMProviderService } from './llm-provider.service';
import { ConnectionService } from './connection.service';
import { ImageGenConfig } from '../models/connection-profile.model';
import {
  GeneratedImage, ImageProviderType, ImageGenSessionConfig,
  createDefaultImageGenSessionConfig
} from '../models/image-gen-config.model';
import { Message } from '../models/chat-session.model';
import { generateId, now } from '../models/base.model';

/**
 * Interface for image generation provider adapters.
 */
interface ImageProviderAdapter {
  readonly type: ImageProviderType;
  generate(tags: string[], negativeTags: string[], params: ImageGenParams): Promise<string[]>;
  isAvailable(): boolean;
}

/**
 * Parameters for image generation.
 */
export interface ImageGenParams {
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  count: number;
  model?: string;
  loras?: string[];
  stylePreset?: string;
}

/**
 * Tag extraction result from the LLM.
 */
export interface TagExtractionResult {
  tags: string[];
  negativeTags: string[];
  description: string;
}

/**
 * Service for in-chat image generation.
 *
 * Supports multiple backends:
 * - OpenAI (DALL-E)
 * - Stability AI
 * - Automatic1111 (SD WebUI)
 * - ComfyUI
 * - Copy-tags-only (formats tags for manual use)
 *
 * Workflow:
 *   1. Extract scene tags from recent messages (via LLM or heuristic)
 *   2. User edits tags
 *   3. Send to configured image provider
 *   4. Attach result to the triggering message
 */
@Injectable({ providedIn: 'root' })
export class ImageProviderService {
  private adapters: Map<ImageProviderType, ImageProviderAdapter> = new Map();

  constructor(
    private db: DatabaseService,
    private llmProvider: LLMProviderService,
    private connectionService: ConnectionService,
  ) {
    // Register built-in adapters
    this.adapters.set('openai', new OpenAIImageAdapter());
    this.adapters.set('stability', new StabilityImageAdapter());
    this.adapters.set('a1111', new A1111ImageAdapter());
    this.adapters.set('comfyui', new ComfyUIImageAdapter());
    this.adapters.set('copy-tags', new CopyTagsAdapter());
  }

  // ── CONFIG CRUD ──

  async getAllConfigs(): Promise<ImageGenConfig[]> {
    return this.db.imageGenConfigs.toArray();
  }

  async getConfig(id: string): Promise<ImageGenConfig | undefined> {
    return this.db.imageGenConfigs.get(id);
  }

  async getDefaultConfig(): Promise<ImageGenConfig | undefined> {
    return this.db.imageGenConfigs.where('isDefault').equals(1).first();
  }

  async createConfig(data: Partial<ImageGenConfig>): Promise<ImageGenConfig> {
    const config: ImageGenConfig = {
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
      providerType: data.providerType || 'copy-tags',
      endpointUrl: data.endpointUrl || '',
      modelOrCheckpoint: data.modelOrCheckpoint || '',
      stylePresets: data.stylePresets || [],
      negativePromptDefaults: data.negativePromptDefaults || 'low quality, bad anatomy, worst quality',
      isDefault: data.isDefault || false,
    };

    // If setting as default, unset others
    if (config.isDefault) {
      await this.clearDefaultFlag();
    }

    await this.db.imageGenConfigs.add(config);
    return config;
  }

  async updateConfig(id: string, data: Partial<ImageGenConfig>): Promise<void> {
    if (data.isDefault) {
      await this.clearDefaultFlag();
    }
    await this.db.imageGenConfigs.update(id, { ...data, updatedAt: now() });
  }

  async deleteConfig(id: string): Promise<void> {
    await this.db.imageGenConfigs.delete(id);
  }

  private async clearDefaultFlag(): Promise<void> {
    const all = await this.db.imageGenConfigs.toArray();
    for (const c of all) {
      if (c.isDefault) {
        await this.db.imageGenConfigs.update(c.id, { isDefault: false });
      }
    }
  }

  // ── TAG EXTRACTION ──

  /**
   * Extract Danbooru-style tags from the last N messages using the connected LLM.
   * Returns suggested positive and negative tags describing the current scene.
   */
  async extractTags(messages: Message[], messageWindow: number = 5): Promise<TagExtractionResult> {
    const conn = await this.connectionService.getDefaultProfile();
    if (!conn) {
      return this.fallbackTagExtraction(messages, messageWindow);
    }

    const recentMessages = messages.slice(-messageWindow);
    const chatContent = recentMessages
      .map(m => `[${m.senderName}]: ${m.content}`)
      .join('\n');

    const extractionPrompt = `Analyze the following conversation and extract visual tags for an image that captures the current scene/moment.

Rules:
- Return Danbooru/Booru-style tags (lowercase, underscored)
- Include: character appearance, clothing, expression, pose, setting/background, atmosphere, lighting
- Return 10-25 positive tags and 5-10 negative tags
- Format: Return ONLY valid JSON in this exact shape:
{
  "tags": ["tag1", "tag2", ...],
  "negativeTags": ["bad_tag1", "bad_tag2", ...],
  "description": "One sentence describing the scene"
}

Conversation:
${chatContent}

Return ONLY valid JSON:`;

    try {
      const response = await this.llmProvider.complete(
        [
          { role: 'system', content: 'You are an image tag extraction assistant. You analyze text and produce Danbooru-style visual tags. Return ONLY valid JSON.' },
          { role: 'user', content: extractionPrompt },
        ],
        { temperature: 0.3, maxTokens: 500 },
        conn
      );

      const cleaned = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');

      try {
        const parsed = JSON.parse(cleaned);
        return {
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          negativeTags: Array.isArray(parsed.negativeTags) ? parsed.negativeTags : [],
          description: parsed.description || '',
        };
      } catch {
        // Try to extract JSON from response
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          return {
            tags: Array.isArray(parsed.tags) ? parsed.tags : [],
            negativeTags: Array.isArray(parsed.negativeTags) ? parsed.negativeTags : [],
            description: parsed.description || '',
          };
        }
      }
    } catch (err) {
      console.warn('LLM tag extraction failed, using fallback:', err);
    }

    return this.fallbackTagExtraction(messages, messageWindow);
  }

  /**
   * Fallback tag extraction using simple keyword heuristics
   * when LLM is not available.
   */
  private fallbackTagExtraction(messages: Message[], messageWindow: number): TagExtractionResult {
    const recentMessages = messages.slice(-messageWindow);
    const text = recentMessages.map(m => m.content).join(' ').toLowerCase();

    const tags: string[] = [];

    // Detect characters mentioned
    const characterPatterns = ['girl', 'boy', 'man', 'woman', 'person', 'character'];
    for (const p of characterPatterns) {
      if (text.includes(p)) tags.push(p);
    }

    // Detect settings
    const settingPatterns: Record<string, string> = {
      'forest': 'forest', 'city': 'cityscape', 'room': 'indoor', 'house': 'house',
      'castle': 'castle', 'garden': 'garden', 'beach': 'beach', 'mountain': 'mountain',
      'school': 'school', 'tavern': 'tavern', 'dungeon': 'dungeon', 'space': 'space',
      'night': 'night', 'morning': 'morning_light', 'sunset': 'sunset',
    };
    for (const [keyword, tag] of Object.entries(settingPatterns)) {
      if (text.includes(keyword)) tags.push(tag);
    }

    // Detect emotions
    const emotionPatterns: Record<string, string> = {
      'smil': 'smile', 'laugh': 'laughing', 'cry': 'crying', 'angry': 'angry',
      'sad': 'sad', 'happy': 'happy', 'surprise': 'surprised', 'blush': 'blush',
    };
    for (const [keyword, tag] of Object.entries(emotionPatterns)) {
      if (text.includes(keyword)) tags.push(tag);
    }

    // Ensure at least some default tags
    if (tags.length < 3) {
      tags.push('1person', 'detailed', 'illustration');
    }

    return {
      tags: [...new Set(tags)],
      negativeTags: ['low_quality', 'bad_anatomy', 'blurry', 'deformed'],
      description: 'Scene from the conversation',
    };
  }

  // ── IMAGE GENERATION ──

  /**
   * Generate images using the configured provider.
   * Returns an array of image URLs or data URLs.
   */
  async generate(
    tags: string[],
    negativeTags: string[],
    params: ImageGenParams,
    config?: ImageGenConfig
  ): Promise<GeneratedImage[]> {
    const conf = config || await this.getDefaultConfig();
    if (!conf) {
      throw new Error('No image generation provider configured. Go to Settings to set one up.');
    }

    const adapter = this.adapters.get(conf.providerType);
    if (!adapter) {
      throw new Error(`Unknown image provider type: ${conf.providerType}`);
    }

    // Set the endpoint on the adapter
    if (conf.endpointUrl) {
      (adapter as any).endpointUrl = conf.endpointUrl;
    }

    const imageUrls = await adapter.generate(tags, negativeTags, params);

    // Create GeneratedImage objects
    const images: GeneratedImage[] = imageUrls.map(url => ({
      id: generateId(),
      imageUrl: url,
      tags,
      negativeTags,
      providerType: conf.providerType,
      model: params.model || conf.modelOrCheckpoint,
      width: params.width,
      height: params.height,
      steps: params.steps,
      cfgScale: params.cfgScale,
      generatedAt: now(),
    }));

    return images;
  }

  /**
   * Format tags as a comma-separated prompt string.
   */
  formatTagsAsPrompt(tags: string[]): string {
    return tags.map(t => t.replace(/_/g, ' ')).join(', ');
  }

  /**
   * Copy tags to clipboard (for "copy-tags" mode).
   */
  async copyTagsToClipboard(tags: string[], negativeTags: string[]): Promise<void> {
    const positive = this.formatTagsAsPrompt(tags);
    const negative = this.formatTagsAsPrompt(negativeTags);
    const text = `Positive: ${positive}\n\nNegative: ${negative}`;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  /**
   * Get default session config for image gen (user's last-used settings).
   */
  getDefaultSessionConfig(): ImageGenSessionConfig {
    // Try to load from localStorage for persistence
    try {
      const saved = localStorage.getItem('mb_image_gen_session_config');
      if (saved) {
        return { ...createDefaultImageGenSessionConfig(), ...JSON.parse(saved) };
      }
    } catch {}
    return createDefaultImageGenSessionConfig();
  }

  /**
   * Save session config to localStorage for persistence.
   */
  saveSessionConfig(config: ImageGenSessionConfig): void {
    try {
      localStorage.setItem('mb_image_gen_session_config', JSON.stringify(config));
    } catch {}
  }
}

// ── ADAPTER IMPLEMENTATIONS ──

/**
 * OpenAI DALL-E adapter.
 */
class OpenAIImageAdapter implements ImageProviderAdapter {
  readonly type: ImageProviderType = 'openai';
  endpointUrl = 'https://api.openai.com';

  async generate(tags: string[], negativeTags: string[], params: ImageGenParams): Promise<string[]> {
    const prompt = tags.map(t => t.replace(/_/g, ' ')).join(', ');
    const size = this.getOpenAISize(params.width, params.height);

    const response = await fetch(`${this.endpointUrl}/v1/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.model || 'dall-e-3',
        prompt,
        n: params.count || 1,
        size,
        response_format: 'b64_json',
      }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => '');
      throw new Error(`OpenAI Image Error ${response.status}: ${error}`);
    }

    const data = await response.json();
    return (data.data || []).map((img: any) =>
      img.b64_json ? `data:image/png;base64,${img.b64_json}` : img.url
    );
  }

  isAvailable(): boolean { return true; }

  private getOpenAISize(w: number, h: number): string {
    // DALL-E 3 supports: 1024x1024, 1792x1024, 1024x1792
    if (w > h) return '1792x1024';
    if (h > w) return '1024x1792';
    return '1024x1024';
  }
}

/**
 * Stability AI adapter.
 */
class StabilityImageAdapter implements ImageProviderAdapter {
  readonly type: ImageProviderType = 'stability';
  endpointUrl = 'https://api.stability.ai';

  async generate(tags: string[], negativeTags: string[], params: ImageGenParams): Promise<string[]> {
    const prompt = tags.map(t => t.replace(/_/g, ' ')).join(', ');
    const negativePrompt = negativeTags.map(t => t.replace(/_/g, ' ')).join(', ');

    const response = await fetch(
      `${this.endpointUrl}/v1/generation/${params.model || 'stable-diffusion-xl-1024-v1-0'}/text-to-image`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text_prompts: [
            { text: prompt, weight: 1 },
            ...(negativePrompt ? [{ text: negativePrompt, weight: -1 }] : []),
          ],
          cfg_scale: params.cfgScale || 7,
          width: params.width || 1024,
          height: params.height || 1024,
          steps: params.steps || 30,
          samples: params.count || 1,
          style_preset: params.stylePreset,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text().catch(() => '');
      throw new Error(`Stability AI Error ${response.status}: ${error}`);
    }

    const data = await response.json();
    return (data.artifacts || []).map((art: any) =>
      `data:image/png;base64,${art.base64}`
    );
  }

  isAvailable(): boolean { return true; }
}

/**
 * Automatic1111 (AUTOMATIC1111/stable-diffusion-webui) adapter.
 * Communicates via the local HTTP API.
 */
class A1111ImageAdapter implements ImageProviderAdapter {
  readonly type: ImageProviderType = 'a1111';
  endpointUrl = 'http://localhost:7860';

  async generate(tags: string[], negativeTags: string[], params: ImageGenParams): Promise<string[]> {
    const prompt = tags.map(t => t.replace(/_/g, ' ')).join(', ');
    const negativePrompt = negativeTags.map(t => t.replace(/_/g, ' ')).join(', ');

    const body: Record<string, any> = {
      prompt,
      negative_prompt: negativePrompt,
      width: params.width || 512,
      height: params.height || 512,
      steps: params.steps || 20,
      cfg_scale: params.cfgScale || 7,
      batch_size: params.count || 1,
      sampler_name: 'Euler a',
    };

    if (params.model) {
      body['override_settings'] = { sd_model_checkpoint: params.model };
    }

    const response = await fetch(`${this.endpointUrl}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => '');
      throw new Error(`A1111 Error ${response.status}: ${error}`);
    }

    const data = await response.json();
    return (data.images || []).map((b64: string) =>
      `data:image/png;base64,${b64}`
    );
  }

  isAvailable(): boolean { return true; }
}

/**
 * ComfyUI adapter.
 * Uses the ComfyUI HTTP API with a basic txt2img workflow.
 */
class ComfyUIImageAdapter implements ImageProviderAdapter {
  readonly type: ImageProviderType = 'comfyui';
  endpointUrl = 'http://localhost:8188';

  async generate(tags: string[], negativeTags: string[], params: ImageGenParams): Promise<string[]> {
    const prompt = tags.map(t => t.replace(/_/g, ' ')).join(', ');
    const negativePrompt = negativeTags.map(t => t.replace(/_/g, ' ')).join(', ');

    // Basic ComfyUI API workflow for txt2img
    const workflow = this.buildBasicWorkflow(prompt, negativePrompt, params);

    const response = await fetch(`${this.endpointUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => '');
      throw new Error(`ComfyUI Error ${response.status}: ${error}`);
    }

    const data = await response.json();
    const promptId = data.prompt_id;

    // Poll for result (simplified — production would use websockets)
    return await this.pollForResult(promptId);
  }

  isAvailable(): boolean { return true; }

  private buildBasicWorkflow(
    prompt: string,
    negativePrompt: string,
    params: ImageGenParams
  ): Record<string, any> {
    return {
      '3': {
        class_type: 'KSampler',
        inputs: {
          seed: Math.floor(Math.random() * 2147483647),
          steps: params.steps || 20,
          cfg: params.cfgScale || 7,
          sampler_name: 'euler',
          scheduler: 'normal',
          denoise: 1,
          model: ['4', 0],
          positive: ['6', 0],
          negative: ['7', 0],
          latent_image: ['5', 0],
        },
      },
      '4': {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: params.model || 'sd_xl_base_1.0.safetensors' },
      },
      '5': {
        class_type: 'EmptyLatentImage',
        inputs: {
          width: params.width || 512,
          height: params.height || 512,
          batch_size: params.count || 1,
        },
      },
      '6': {
        class_type: 'CLIPTextEncode',
        inputs: { text: prompt, clip: ['4', 1] },
      },
      '7': {
        class_type: 'CLIPTextEncode',
        inputs: { text: negativePrompt, clip: ['4', 1] },
      },
      '8': {
        class_type: 'VAEDecode',
        inputs: { samples: ['3', 0], vae: ['4', 2] },
      },
      '9': {
        class_type: 'SaveImage',
        inputs: { filename_prefix: 'MasterBookAI', images: ['8', 0] },
      },
    };
  }

  private async pollForResult(promptId: string, maxAttempts: number = 60): Promise<string[]> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch(`${this.endpointUrl}/history/${promptId}`);
      if (!response.ok) continue;

      const data = await response.json();
      const promptResult = data[promptId];

      if (promptResult && promptResult.outputs) {
        const images: string[] = [];
        for (const nodeOutput of Object.values(promptResult.outputs) as any[]) {
          if (nodeOutput.images) {
            for (const img of nodeOutput.images) {
              // Fetch the actual image
              const imgResponse = await fetch(
                `${this.endpointUrl}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type || 'output'}`
              );
              if (imgResponse.ok) {
                const blob = await imgResponse.blob();
                const dataUrl = await this.blobToDataUrl(blob);
                images.push(dataUrl);
              }
            }
          }
        }
        if (images.length > 0) return images;
      }
    }

    throw new Error('ComfyUI generation timed out');
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

/**
 * Copy-tags-only adapter — formats tags to clipboard, no actual generation.
 * Used when the user wants to manually generate images in a third-party tool.
 */
class CopyTagsAdapter implements ImageProviderAdapter {
  readonly type: ImageProviderType = 'copy-tags';

  async generate(tags: string[], negativeTags: string[], _params: ImageGenParams): Promise<string[]> {
    const positive = tags.map(t => t.replace(/_/g, ' ')).join(', ');
    const negative = negativeTags.map(t => t.replace(/_/g, ' ')).join(', ');
    const text = `Positive: ${positive}\n\nNegative: ${negative}`;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    // Return empty — no actual image generated
    return [];
  }

  isAvailable(): boolean { return true; }
}
