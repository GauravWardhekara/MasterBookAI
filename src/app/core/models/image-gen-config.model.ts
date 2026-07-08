/**
 * ImageGenConfig — image generation backend configuration
 */
export interface ImageGenConfig {
  id: string;
  name: string;
  providerType: 'openai' | 'stability' | 'automatic1111' | 'comfyui' | 'copy-tags-only';
  endpointUrl: string;
  apiKey?: string;
  modelOrCheckpoint?: string;
  stylePresets?: string[];
  negativePromptDefaults?: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
