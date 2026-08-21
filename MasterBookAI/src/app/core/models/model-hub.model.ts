import { BaseModel } from './base.model';

/**
 * Device capability tiers for model compatibility filtering.
 */
export type DeviceTier = 'low' | 'medium' | 'high' | 'ultra';

/**
 * Detected device capabilities.
 */
export interface DeviceCapabilities {
  tier: DeviceTier;
  ramGB: number;
  hasWebGPU: boolean;
  platform: 'desktop' | 'mobile' | 'tablet';
  os: string;
}

/**
 * A model file (quantization variant) available for download.
 */
export interface ModelFile {
  filename: string;
  sizeBytes: number;
  quantType: string;        // e.g. "Q4_K_M", "Q5_K_S", "Q8_0"
  downloadUrl: string;
  requiredRamGB: number;    // Estimated RAM needed to run
}

/**
 * A model available in the hub (from HuggingFace, Ollama library, or local).
 */
export interface HubModel {
  id: string;                       // e.g. "TheBloke/Llama-2-7B-Chat-GGUF" or "llama3.2"
  name: string;                     // Display name
  source: 'ollama' | 'huggingface' | 'local';
  description: string;
  parameterCount?: string;          // e.g. "7B", "13B", "70B"
  quantizations?: ModelFile[];      // Available GGUF quant files
  tags: string[];
  downloads?: number;
  likes?: number;
  lastUpdated?: string;
  compatibilityTier: DeviceTier;    // Minimum device tier required
}

/**
 * A model that has been downloaded/installed locally.
 */
export interface LocalModel extends BaseModel {
  name: string;
  source: 'ollama' | 'huggingface' | 'local-file';
  modelId: string;                  // repo/model identifier
  filename?: string;
  filePath?: string;
  sizeBytes: number;
  quantType?: string;
  status: 'downloading' | 'ready' | 'loading' | 'loaded' | 'error';
  downloadProgress: number;         // 0-100
  provider: string;                 // which inference provider to use
  addedAt: string;
  errorMessage?: string;
}

/**
 * RAM thresholds for device tier classification (in GB).
 */
export const DEVICE_TIER_THRESHOLDS: Record<DeviceTier, { minRam: number; maxModelSizeGB: number }> = {
  low:    { minRam: 0,  maxModelSizeGB: 2 },
  medium: { minRam: 4,  maxModelSizeGB: 5 },
  high:   { minRam: 8,  maxModelSizeGB: 10 },
  ultra:  { minRam: 16, maxModelSizeGB: 50 },
};
