# Development Plan: Ionic AI Chat & Story Platform

A SillyTavern/NovelAI/FictionLab-style AI companion app, built with Ionic for web + mobile deployment.

> **Platform strategy**: Ionic is a UI-component framework that is platform-independent by design — the same Angular/TypeScript codebase renders as a responsive web app and, via **Capacitor**, compiles to native **iOS** and **Android** apps sharing ~95%+ of the code. This means the app should be built **mobile-first from day one** (touch targets, safe-area insets, offline-friendly local DB) rather than built as a web app and retrofitted for mobile later. Native features (secure keychain storage, filesystem, camera/share sheet, push notifications, background tasks) are accessed through Capacitor plugins with automatic web fallbacks, so the codebase stays single-source-of-truth across all three targets.

---

## 1. Product Summary

A cross-platform (web, iOS, Android via Capacitor) app that lets a signed-in user:

- Connect to **any LLM backend** — local (Ollama, LM Studio, koboldcpp, text-generation-webui) or cloud (OpenAI, Anthropic, OpenRouter, Google, custom OpenAI-compatible endpoint).
- Build **Scenarios** containing multiple **Characters** (playable + NPC), **Personas**, **World Info/Lore**, and **Special Instructions**.
- Chat in two modes: **Standard Chat** (SillyTavern-style turn exchange) and **Story Mode** (first/third-person continuous prose, NovelAI/AI Dungeon-style).
- Generate **in-chat images**: auto-derive tags from recent messages, and send them to a configurable image backend (cloud API, local SD/ComfyUI instance, or "copy tags only" mode for manual use in a third-party tool).
- Get **automatic + manual memory tracking**: important events are auto-extracted and summarized, user can pin any message as a memory, and memories are linked/retrieved contextually (RAG-style) to keep long-running chats coherent.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| App framework | **Ionic 8 + Angular (standalone components)** | Angular gives strong typing/DI, pairs well with Ionic; React/Vue Ionic variants are viable alternatives if the team prefers |
| Native runtime | **Capacitor** | Single codebase compiles to installable native **iOS** (App Store, via Xcode/TestFlight) and **Android** (Play Store, via Android Studio) apps, plus a **PWA** for web/desktop use — no separate native codebases to maintain |
| State management | **Signals (Angular) + NgRx Component Store** or plain services with signals | Avoid full NgRx/Redux boilerplate unless team is large |
| Local DB | **SQLite (via @capacitor-community/sqlite)** on device, **IndexedDB (Dexie.js)** fallback on web | Chats, characters, memories all local-first |
| Vector store (for memory retrieval) | **sqlite-vec** or **local embeddings + cosine sim in JS** for small scale; pluggable to **Qdrant/Weaviate/pgvector** if a backend server is added later | Enables semantic memory search |
| Backend (optional, for sync/multi-device) | **Node.js (NestJS) + PostgreSQL** | Only needed for cloud sync, auth, shared image gen proxy |
| Auth | **Firebase Auth / Supabase Auth** or self-hosted (NestJS + JWT) | Local-only "guest" mode should also be supported |
| Secrets storage | **Capacitor Secure Storage / Keychain / Keystore** on device; encrypted at rest on web (WebCrypto + IndexedDB) | Store user's own API keys — never send to your servers unless proxying |
| LLM communication | Direct client-side fetch to local/cloud endpoints, or via a thin backend proxy for CORS/key-hiding | Support streaming (SSE / fetch streams) |
| Image generation | Provider adapters: OpenAI Images, Stability API, ComfyUI/Automatic1111 local HTTP API, "tags-only" no-op provider | |
| Styling | Ionic components + custom theme, dark-mode-first | |

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Ionic App (Client)                    │
│  ┌───────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│  │  UI Layer │ │ Chat Engine│ │ Memory Eng │ │ Image Eng  │ │
│  │ (pages/   │ │ (turn mgr, │ │ (extract,  │ │ (tag gen,  │ │
│  │ components)│ │ story mgr) │ │ embed,     │ │ provider   │ │
│  │           │ │            │ │ retrieve)  │ │ adapters)  │ │
│  └─────┬─────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ │
│        └──────────────┴──────┬───────┴──────────────┘        │
│                     ┌─────────▼─────────┐                    │
│                     │  Provider Adapter  │                    │
│                     │  Layer (LLM/IMG)   │                    │
│                     └─────────┬─────────┘                    │
│                     ┌─────────▼─────────┐                    │
│                     │  Local Data Layer  │                    │
│                     │ (SQLite/IndexedDB) │                    │
│                     └─────────┬─────────┘                    │
└───────────────────────────────┼───────────────────────────────┘
                                 │ optional sync
                     ┌───────────▼───────────┐
                     │  Backend (NestJS API)  │
                     │  Auth, Sync, Proxy     │
                     └────────────────────────┘
```

Design principle: **local-first**. The app must be fully usable with a local LLM and no backend at all (self-hosted/offline power-user case), while optionally supporting account sync.

---

## 3a. Cross-Platform Strategy (Web + iOS + Android from One Codebase)

Ionic + Capacitor is the reason this doesn't need three separate apps. Key implications for planning and QA:

| Target | How it's produced | Distribution |
|---|---|---|
| **Web app / PWA** | Standard Angular build (`ionic build`) | Any static host; installable as PWA (add-to-homescreen, offline shell via service worker) |
| **iOS** | `npx cap add ios` → Capacitor wraps the web build in a native WebView shell, built/signed via Xcode | App Store, or ad-hoc/TestFlight for internal testing |
| **Android** | `npx cap add android` → same web build wrapped via Android Studio/Gradle | Google Play, or sideloaded APK for local-LLM power users who prefer that |

**Practical consequences for the plan:**

- **Local LLM connectivity differs by platform.** On mobile, "localhost" means the phone itself — connecting to a computer running Ollama on the same network requires the user to enter that machine's **LAN IP address**, not `localhost`. The Connection Manager (Section 5.1) UI needs to make this distinction obvious (e.g., auto-detect web vs. native context and adjust placeholder text/help copy accordingly).
- **CORS is a web-only concern.** Native builds (iOS/Android) talk to local/cloud servers as native HTTP requests and are not subject to browser CORS restrictions — this actually makes native builds *easier* to connect to local LLM tools than the web version, worth calling out to users.
- **Secure storage is unified but platform-backed.** Capacitor's Secure Storage plugin uses **iOS Keychain** and **Android Keystore** natively, and falls back to encrypted Web Crypto storage on the web build — same API call in code (`SecureStoragePlugin`), different backing implementation per platform, so this should be abstracted once in `core/services/secure-storage.service.ts` and never touched directly by feature code.
- **Responsive layout, not separate UIs.** Use Ionic's adaptive components (`ion-split-pane`, `ion-grid`, responsive breakpoints) so one set of pages serves phone, tablet, and desktop browser layouts rather than building parallel "mobile" and "desktop" views.
- **Native-only affordances to plan for:** push notifications (e.g., "your local model finished generating" if backgrounded), background app refresh limitations (iOS in particular suspends background network activity — long story-mode generations need to handle app backgrounding gracefully), camera/photo-library access for custom avatar/persona images, native share sheet for exporting chats/images.
- **CI/CD**: plan for three build pipelines from one source — web deploy (Vercel/Netlify/static host), iOS build (requires macOS runner + Apple Developer account), Android build (any runner + Play Console account). Recommend Fastlane or Ionic Appflow to avoid hand-rolling native build automation.
- **Testing matrix**: at minimum, test on one physical iOS device, one physical Android device, and desktop + mobile-viewport web before each release — the WebView engine differs slightly per platform (WKWebView on iOS vs. Chromium-based WebView on Android) and can surface CSS/JS quirks that don't show up in browser dev tools alone.

---

## 4. Core Data Model

Keep these as first-class, independently reusable entities (mirrors SillyTavern's separation of concerns):

- **User** — profile, settings, connection configs, API keys (encrypted).
- **ConnectionProfile** — name, type (local/cloud), endpoint URL, auth method, model list, context size, default sampling params (temperature, top_p, top_k, rep penalty, max tokens), streaming toggle.
- **Persona** — the user's own avatar/identity in chat (name, description, avatar image).
- **Character** — name, avatar, description, personality, speech style, greeting message(s), example dialogues, tags, `isPlayable` flag, per-character sampling override.
- **WorldInfo/Lore entry** — keyword triggers, content, insertion position (before/after context), scan depth, probability, recursion flag, linked scenarios.
- **Scenario** — title, description, participating characters (with roles: NPC/playable), world info set, special instructions/system prompt, default mode (chat/story), default POV (1st/3rd person) for story mode.
- **ChatSession** — scenario ref, persona ref, active character(s), message list, mode, created/updated timestamps, linked memories.
- **Message** — role, sender (character or persona), content, timestamp, generated image refs, "pinned as memory" flag, token count.
- **Memory** — source (auto or manual), summary text, embedding vector, linked message id(s), importance score, linked scenario/chat, decay/relevance metadata.
- **ImageGenConfig** — provider type, endpoint, model/checkpoint, style presets, negative prompt defaults.

This schema is the backbone — get it right before UI work starts.

---

## 5. Feature Modules & Design Notes

### 5.1 Connection Manager (Local/Cloud LLM)
- Adapter pattern: `LLMProvider` interface with `listModels()`, `chatCompletion()`, `streamCompletion()`.
- Built-in adapters: OpenAI-compatible (covers Ollama, LM Studio, koboldcpp, text-gen-webui, OpenRouter, most cloud APIs), Anthropic-native, Google Gemini-native.
- Connection test button + latency/health check.
- Multiple saved profiles, quick-switch per scenario or globally.
- Per-scenario/character sampling parameter overrides layered on top of the connection profile defaults.

### 5.2 Model & Chat Configuration
- Model picker (pulled live from `listModels()` where supported).
- Sampling controls: temperature, top-p/top-k, repetition penalty, max tokens, context window trimming strategy (sliding window vs summarization).
- Prompt template selector (Alpaca/ChatML/Llama3/Mistral/raw) — critical for local models where formatting affects quality.

### 5.3 Scenario & Character Builder (SillyTavern-style)
- Character card editor: fields above, with import/export compatible with common community card formats (PNG-embedded JSON, JSON) so users can bring existing SillyTavern cards.
- Multi-character scenario composer: assign roles, turn order/logic (round robin, LLM-decided next speaker, user-directed).
- World Info editor: keyword-triggered lore injection, testable "what would trigger on this message" preview.
- Special Instructions field: injected as system-level guidance, separate from character personality.
- Persona manager: multiple personas, quick-switch per chat.

### 5.4 Standard Chat Engine
- Turn manager assembling the prompt: system instructions + world info matches + persona + character card(s) + recent history + memory injections.
- Streaming token rendering, regenerate/swipe (alt response), edit message, delete/branch conversation.
- Group chat logic for multiple NPCs (who speaks next, muting characters).

### 5.5 Story Mode (NovelAI/AI Dungeon-style)
- Continuous narrative buffer instead of discrete turns — user writes an action/sentence, model continues the prose.
- POV toggle (1st/3rd person) and tense, injected into the system template.
- "Author's note" style steering input pinned near the end of context.
- Retry/continue/rewind controls tuned for prose (paragraph-level undo, not just full messages).
- Shares the same Scenario/Character/World Info/Memory backbone as Chat mode — mode is a rendering + prompting strategy, not a separate data model.

### 5.6 In-Chat Image Generation
- Tag extraction step: send last N messages to the LLM (or a lightweight local heuristic) with a prompt asking it to output Danbooru-style tags describing the current scene/character appearance.
- User can edit tags before generating.
- Provider adapter pattern again: `ImageProvider` interface with `generate(tags, negativeTags, params)`.
  - Cloud adapters (OpenAI Images, Stability, etc.)
  - Local adapter (Automatic1111/ComfyUI HTTP API)
  - "Copy tags" no-op provider — just formats and copies tags to clipboard for manual use elsewhere.
- Generated images attach to the triggering message and are stored locally (or reference URL if cloud-hosted).

### 5.7 Memory System (the hardest part — plan extra time here)
- **Automatic extraction**: background job after every N messages (or on a summarization trigger) asks the LLM to identify "important events" and produce short memory entries.
- **Manual memory**: long-press/select a message → "Save as memory," optionally edit the summary text before saving.
- **Embedding + linking**: each memory gets a vector embedding (local small embedding model or provider embedding API) and is linked to: source message(s), scenario, character(s) involved, and any world-info entries it touches.
- **Retrieval**: at prompt-assembly time, semantically retrieve top-k relevant memories for the current context and inject them near the top of the system prompt, separate from raw chat history — this is what keeps long chats coherent without blowing the context window.
- **Memory graph view (stretch goal)**: a visual graph showing how memories link to characters/events, letting users manually merge, edit, or delete nodes.
- **Decay/importance scoring**: optionally down-weight older/rarely-retrieved memories so the retrieval set stays relevant.

### 5.8 Chat History & Search
- Full-text + semantic search across past chats.
- Auto-generated chat titles/summaries.
- Export/import (JSON) for backup and portability.

### 5.9 Auth & Sync (optional layer)
- Guest/local-only mode by default (no account needed).
- Optional account creation for cross-device sync of scenarios/characters/memories (not raw API keys — those stay device-local unless user explicitly opts into encrypted cloud key storage).

---

## 6. Suggested Project Structure

```
src/
  app/
    core/
      services/        (llm-provider, image-provider, memory-engine, db, auth)
      adapters/
        llm/            (openai-compatible.adapter.ts, anthropic.adapter.ts, ...)
        image/          (a1111.adapter.ts, comfyui.adapter.ts, copy-tags.adapter.ts, ...)
      models/           (character.model.ts, scenario.model.ts, memory.model.ts, ...)
      state/            (signals-based stores)
    features/
      connections/      (connection profile CRUD + test UI)
      characters/       (character/persona builder)
      world-info/
      scenarios/
      chat/             (standard chat UI + turn manager)
      story-mode/
      image-gen/
      memory/           (memory browser, graph view)
      auth/
    shared/
      components/       (avatar, message-bubble, tag-chip, etc.)
      pipes/ directives/
  assets/
capacitor.config.ts
```

---

## 7. Development Roadmap (Phased)

**Phase 0 — Foundations (1–2 weeks)**
- Ionic/Angular/Capacitor project scaffold, theming, routing shell, local DB setup (SQLite/Dexie), basic auth (guest mode first).
- Add native platforms early (`cap add ios`, `cap add android`) and get a "hello world" build running on a real device on **both** platforms plus the web/PWA build — catching platform-specific build/signing issues now is far cheaper than discovering them in Phase 7.

**Phase 1 — Connection & Model Layer (1–2 weeks)**
- ConnectionProfile CRUD, OpenAI-compatible adapter (covers most local + cloud), streaming chat proof-of-concept, prompt template system.

**Phase 2 — Character/Scenario/World Info Builder (2–3 weeks)**
- Data models + CRUD UIs for Persona, Character, WorldInfo, Scenario. Card import/export.

**Phase 3 — Standard Chat Engine (2 weeks)**
- Prompt assembly pipeline, message rendering, streaming, regenerate/edit/branch, group chat turn logic.

**Phase 4 — Story Mode (1–2 weeks)**
- Continuous narrative UI, POV/tense controls, author's note, prose-level undo/continue — reusing Phase 3's prompt pipeline.

**Phase 5 — Memory Engine (2–3 weeks, highest risk)**
- Auto-extraction job, manual pin-as-memory, embeddings + local vector search, retrieval injection into prompt pipeline, memory browser UI.

**Phase 6 — Image Generation (1–2 weeks)**
- Tag extraction step, provider adapters (cloud/local/copy-only), image attachment to messages.

**Phase 7 — History, Search, Sync, Polish (2 weeks)**
- Full chat search, export/import, optional backend sync, secure key storage hardening, performance pass on mobile builds, accessibility/theming polish.
- Cross-platform release prep: App Store/Play Store listings and screenshots, PWA manifest/icons for web install, CI build pipelines for all three targets (Section 3a), device-matrix regression pass (iOS + Android physical devices, desktop + mobile-viewport web).

**Phase 8 — Beta & Hardening (ongoing)**
- Error handling for flaky local endpoints (connection retries, timeout UX), context-window overflow handling, rate-limit/backoff for cloud providers, telemetry (opt-in) for crash reporting only.

Total rough estimate: **12–17 weeks** for a single small team (2–3 devs) to reach a solid v1; memory + character/world-info systems are the parts most likely to expand scope, so timebox early prototypes there before committing to UI polish.

---

## 8. Key Technical Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Local LLM endpoints vary in API shape despite "OpenAI-compatible" claims | Build an adapter conformance test suite; support raw-endpoint override fields |
| Context window overflow with characters + world info + memories + history | Token budget manager that prioritizes: system instructions > active world info > retrieved memories > recent history, trimming/summarizing oldest history first |
| Memory retrieval quality (garbage in/out) | Let users review/edit auto-extracted memories before they're "committed"; show which memories were injected into a given response for transparency/debugging |
| API key security on-device | Use Capacitor Secure Storage/Keychain; never log keys; redact in error reports |
| Mobile performance running local embeddings | Keep embedding model tiny (e.g., a distilled/quantized model) or delegate to the connected LLM provider's embedding endpoint when available |
| Image gen provider fragmentation | Strict adapter interface + a "copy tags only" fallback so the feature is never a hard blocker |

---

## 9. Suggested Immediate Next Steps

1. Lock the data model (Section 4) — everything else depends on it.
2. Build Phase 0 + Phase 1 as a throwaway spike to validate streaming chat against one local (Ollama) and one cloud (OpenAI-compatible) endpoint.
3. Prototype the memory extraction + retrieval loop early (Phase 5) in isolation, since it's the highest-uncertainty feature — validate it works acceptably before investing in its UI.
