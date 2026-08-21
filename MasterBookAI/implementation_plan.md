# Local LLM Model Hub — Run Models Locally on Desktop, Mobile & Tablet

Adds a full "Model Hub" feature to MasterBookAI that lets users discover, download, load, and run LLM models locally. Integrates with **Ollama**, **vLLM**, and **HuggingFace** as model sources. Includes device compatibility detection so only compatible models are shown.

## User Review Required

> [!IMPORTANT]
> **Ollama is the primary local inference engine.** On Desktop, users install Ollama natively and MasterBookAI communicates via its REST API (`localhost:11434`). On mobile/tablet (Android/iOS), Ollama cannot run natively — the app will connect to a local-network Ollama instance (e.g., user's PC) or use the existing cloud provider connections.

> [!IMPORTANT]
> **HuggingFace integration** will use the public REST API (`https://huggingface.co/api/models?library=gguf`) to search/browse GGUF models, and direct HTTP download URLs (`https://huggingface.co/{repo}/resolve/main/{file}`) for downloading. No Python dependency required — all JavaScript/TypeScript via `fetch`.

> [!WARNING]
> **Device compatibility detection** in a browser/WebView is limited. We can detect approximate RAM via `navigator.deviceMemory` (Chromium only, returns coarsened values: 0.25–32 GB) and WebGPU presence via `navigator.gpu`. For Electron/desktop, we can use Node.js `os.totalmem()`. **We cannot detect exact VRAM from the browser.** The plan is to use a tiered approach: detect RAM, classify the device (Low/Medium/High/Ultra), and filter models by their file size requirements.

## Open Questions

> [!IMPORTANT]
> **Q1:** Should model files be downloaded directly to the device's filesystem (via Capacitor Filesystem on mobile, or Node.js `fs` on Electron), or should they be downloaded into Ollama's model store via `POST /api/pull`? **Recommendation:** Use Ollama's `/api/pull` for Ollama-compatible models (since Ollama manages its own model store), and direct file download for HuggingFace GGUF files that will be loaded via other engines.

> [!IMPORTANT]
> **Q2:** Do you want in-browser inference (WebLLM/Transformers.js using WebGPU) as a fallback for mobile devices without a local Ollama server? This is feasible for small quantized models (1-3B params) but adds significant bundle complexity. **Recommendation:** Defer this to a later phase and focus on Ollama + cloud providers for now.

---

## Proposed Changes

### Data Models (`src/app/core/models/`)

#### [NEW] [model-hub.model.ts](file:///d:/Gaurave_07.08.2025/Gaurav/MasterBookAI/MasterBookAI/src/app/core/models/model-hub.model.ts)

New interfaces for the model hub:

```typescript
// Represents a model available for download/use
export interface HubModel {
  id: string;                    // e.g. "TheBloke/Llama-2-7B-Chat-GGUF"
  name: string;                  // Display name
  source: 'ollama' | 'huggingface' | 'local';
  description: string;
  parameterCount?: string;       // e.g. "7B", "13B", "70B"
  quantizations?: ModelFile[];   // Available GGUF quant files
  tags: string[];                // e.g. ["chat", "roleplay", "code"]
  downloads?: number;
  likes?: number;
  lastUpdated?: string;
  compatibilityTier: DeviceTier; // Minimum device tier required
}

export interface ModelFile {
  filename: string;              // e.g. "llama-2-7b-chat.Q4_K_M.gguf"
  sizeBytes: number;
  quantType: string;             // e.g. "Q4_K_M", "Q5_K_S"
  downloadUrl: string;
  requiredRamGB: number;         // Estimated RAM needed to load
}

export type DeviceTier = 'low' | 'medium' | 'high' | 'ultra';

export interface DeviceCapabilities {
  tier: DeviceTier;
  ramGB: number;                 // Detected or estimated RAM
  hasWebGPU: boolean;
  platform: 'desktop' | 'mobile' | 'tablet';
  os: string;
}

// Tracks a model download in progress or completed
export interface LocalModel {
  id: string;
  name: string;
  source: 'ollama' | 'huggingface' | 'local-file';
  modelId: string;               // repo/model identifier
  filename?: string;
  filePath?: string;
  sizeBytes: number;
  quantType?: string;
  status: 'downloading' | 'ready' | 'loading' | 'loaded' | 'error';
  downloadProgress: number;      // 0-100
  provider: string;              // which provider to use for inference
  addedAt: string;
}
```

---

#### [MODIFY] [connection-profile.model.ts](file:///d:/Gaurave_07.08.2025/Gaurav/MasterBookAI/MasterBookAI/src/app/core/models/connection-profile.model.ts)

- Add `'huggingface'` to the `LLMProvider` union type.

---

### Core Services (`src/app/core/services/`)

#### [NEW] [device-capability.service.ts](file:///d:/Gaurave_07.08.2025/Gaurav/MasterBookAI/MasterBookAI/src/app/core/services/device-capability.service.ts)

Detects device capabilities and classifies into a tier:
- Uses `navigator.deviceMemory` for RAM estimation (Chromium).
- Uses `navigator.gpu` for WebGPU detection.
- Uses `navigator.userAgent` and `screen.width` for platform detection (desktop vs mobile vs tablet).
- On Electron, falls back to `os.totalmem()` via IPC for accurate RAM.
- Classification tiers:
  - **Low** (≤4 GB RAM): Only tiny models (1-3B Q4)
  - **Medium** (4-8 GB): Small models (3-7B Q4/Q5)
  - **High** (8-16 GB): Medium models (7-13B Q4/Q5)
  - **Ultra** (16+ GB): Large models (13B+, 70B Q4)

#### [NEW] [model-hub.service.ts](file:///d:/Gaurave_07.08.2025/Gaurav/MasterBookAI/MasterBookAI/src/app/core/services/model-hub.service.ts)

Central service for the Model Hub:
- **`searchHuggingFaceModels(query, filters)`**: Calls `https://huggingface.co/api/models?library=gguf&search={query}&sort=downloads&limit=20`
- **`getModelFiles(repoId)`**: Calls `https://huggingface.co/api/models/{repoId}/tree/main` to list `.gguf` files
- **`getOllamaLibrary()`**: Calls Ollama's `/api/tags` to get locally installed models
- **`pullOllamaModel(modelName)`**: Calls `POST /api/pull` with streaming progress
- **`deleteOllamaModel(modelName)`**: Calls `DELETE /api/delete`
- **`downloadHuggingFaceFile(url, filename, onProgress)`**: Direct HTTP download with progress tracking
- **`getLocalModels()`**: Returns all locally available models from IndexedDB
- **`filterByCompatibility(models, deviceCaps)`**: Filters models based on device tier

#### [MODIFY] [database.service.ts](file:///d:/Gaurave_07.08.2025/Gaurav/MasterBookAI/MasterBookAI/src/app/core/services/database.service.ts)

- Add a `localModels` table to track downloaded/installed models.
- Bump DB version to 3.

---

### Feature Pages (`src/app/features/`)

#### [NEW] `src/app/features/model-hub/` — Model Hub Page

##### [NEW] [model-hub.page.ts](file:///d:/Gaurave_07.08.2025/Gaurav/MasterBookAI/MasterBookAI/src/app/features/model-hub/model-hub.page.ts)

The main Model Hub page. Features:
- **Header**: Title "Models" with a search bar.
- **Device Info Banner**: Shows detected device tier (e.g., "Your Device: High • 16 GB RAM • Desktop") with a colored badge.
- **Segment Tabs**: "Local" | "Ollama" | "HuggingFace" | "Cloud"
  - **Local Tab**: Shows all models currently downloaded/loaded. Each card shows model name, size, quant type, status (Ready/Loading/Loaded), and Load/Unload/Delete actions.
  - **Ollama Tab**: Shows models available in the connected Ollama instance. Pull button for new models, with a search bar for Ollama library.
  - **HuggingFace Tab**: Search and browse GGUF models from HuggingFace. Cards show model name, description, download count, available quant files. Only shows models compatible with the device.
  - **Cloud Tab**: Shows configured cloud provider models (OpenAI, Anthropic, Gemini, LM Studio connections from existing Settings).

##### [NEW] [model-download.component.ts](file:///d:/Gaurave_07.08.2025/Gaurav/MasterBookAI/MasterBookAI/src/app/features/model-hub/model-download.component.ts)

Modal for downloading/pulling a model:
- Shows model metadata (name, description, param count).
- Lists available quantization files with size and RAM requirements.
- Grays out files that exceed device capabilities.
- Download progress bar with cancel button.
- For Ollama models: uses `/api/pull` with streaming progress.
- For HuggingFace: direct HTTP download with `fetch` + `ReadableStream` for progress.

##### [NEW] [model-detail.component.ts](file:///d:/Gaurave_07.08.2025/Gaurav/MasterBookAI/MasterBookAI/src/app/features/model-hub/model-detail.component.ts)

Detail view for a single model showing:
- Full description, tags, parameter count.
- Available quantizations with compatibility badges.
- Load/Unload/Delete actions.
- Usage stats (if available).

---

### Navigation & Routing

#### [MODIFY] [app.routes.ts](file:///d:/Gaurave_07.08.2025/Gaurav/MasterBookAI/MasterBookAI/src/app/app.routes.ts)

- Add route for the Model Hub page: `{ path: 'models', loadComponent: ... }`

#### [MODIFY] [tabs.layout.ts](file:///d:/Gaurave_07.08.2025/Gaurav/MasterBookAI/MasterBookAI/src/app/layout/tabs.layout.ts)

- Add "Models" tab to the bottom tab bar (or add it as a menu item accessible from Settings/Home).

---

### Integration with Existing Chat Flow

#### [MODIFY] [model-selection-modal.component.ts](file:///d:/Gaurave_07.08.2025/Gaurav/MasterBookAI/MasterBookAI/src/app/shared/components/model-selection-modal/model-selection-modal.component.ts)

- Replace hardcoded mock model cards with dynamic data from `ModelHubService`.
- Combine local models (from Ollama/downloaded) + cloud models (from connection profiles).
- Add a "Browse More Models" button that navigates to the full Model Hub page.

---

## Verification Plan

### Automated Tests
- `npm run ng -- build --configuration=development` — Ensure the project compiles cleanly.

### Manual Verification
- Open the Model Hub page and verify all four tabs render correctly.
- Verify the device capability banner shows accurate information.
- Search for models on the HuggingFace tab and verify filtering by compatibility.
- Pull a model via Ollama tab (requires Ollama running locally) and verify progress tracking.
- Open Chat Settings → Model and verify local + cloud models appear together.
- Test on a mobile viewport to verify responsive layout.
