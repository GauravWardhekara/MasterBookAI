import { BaseModel } from './base.model';

/**
 * Per-session image generation settings that persist across conversations.
 */
export interface ImageGenSessionConfig {
  /** Image provider used for this session */
  providerId?: string;
  /** Last used model/checkpoint */
  lastModel?: string;
  /** LoRA model(s) */
  lastLoras: string[];
  /** Number of images to generate per request */
  imageCount: number;
  /** Image width */
  width: number;
  /** Image height */
  height: number;
  /** CFG Scale (classifier-free guidance) */
  cfgScale: number;
  /** Sampling steps */
  steps: number;
  /** Negative prompt defaults */
  negativePrompt: string;
  /** Style preset (e.g., 'anime', 'realistic', 'fantasy') */
  stylePreset?: string;
}

/**
 * A generated image result stored locally.
 */
export interface GeneratedImage {
  id: string;
  /** The image as a data URL (base64) or a remote URL */
  imageUrl: string;
  /** The tags/prompt used to generate */
  tags: string[];
  /** Negative tags used */
  negativeTags: string[];
  /** Provider that generated it */
  providerType: ImageProviderType;
  /** Model/checkpoint used */
  model?: string;
  /** Generation parameters */
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  /** When it was generated */
  generatedAt: string;
  /** Linked message ID (if attached to a message) */
  linkedMessageId?: string;
  /** Linked session ID */
  linkedSessionId?: string;
}

/**
 * Supported image provider types.
 */
export type ImageProviderType = 'openai' | 'stability' | 'comfyui' | 'a1111' | 'copy-tags' | 'nanogpt' | 'literouter' | 'deepinfra' | 'togetherai' | 'aimlapi';

/**
 * Create default session image gen config.
 */
export function createDefaultImageGenSessionConfig(): ImageGenSessionConfig {
  return {
    lastLoras: [],
    imageCount: 1,
    width: 512,
    height: 512,
    cfgScale: 7,
    steps: 20,
    negativePrompt: 'low quality, bad anatomy, worst quality, blurry, deformed',
    stylePreset: undefined,
  };
}
