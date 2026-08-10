# Updated Development Plan: Ionic AI Chat & Story Platform

A SillyTavern/NovelAI/FictionLab-style AI companion app, built with Ionic for web + mobile deployment.

> **Platform strategy**: Ionic is a UI-component framework that is platform-independent by design — the same Angular/TypeScript codebase renders as a responsive web app and, via **Capacitor**, compiles to native **iOS** and **Android** apps sharing ~95%+ of the code. Build **mobile-first from day one**.

---

## 1. Product Summary

A cross-platform (web, iOS, Android via Capacitor) app that lets a signed-in user:

- Connect to **any LLM backend** — local (Ollama, LM Studio, koboldcpp, text-generation-webui) or cloud (OpenAI, Anthropic, OpenRouter, Google, custom OpenAI-compatible endpoint).
- Build **Scenarios** containing multiple **Characters** (playable + NPC), **Personas**, **Lorebooks**, and **Special Instructions**.
- **Create and manage Lorebooks** independently — a lorebook contains typed lore entries (premise, history, memory, faction, location, species) with trigger words and cross-links to other entries or characters.
- Chat in two modes: **Standard Chat** (SillyTavern-style turn exchange) and **Story Mode** (first/third-person continuous prose, NovelAI/AI Dungeon-style).
- Generate **in-chat images**: auto-derive tags from recent messages and send to a configurable image backend.
- Get **automatic + manual memory tracking** with RAG-style retrieval.
- **Save and load** chats and stories locally to/from files (JSON export/import).
- Browse a **Gallery** of saved chats and stories with rich previews and management tools.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| App framework | **Ionic 8 + Angular (standalone components)** | Angular gives strong typing/DI, pairs well with Ionic |
| Native runtime | **Capacitor** | Single codebase → iOS, Android, PWA |
| State management | **Signals (Angular) + NgRx Component Store** or plain services with signals | Avoid full NgRx/Redux boilerplate unless team is large |
| Local DB | **SQLite (via @capacitor-community/sqlite)** on device, **IndexedDB (Dexie.js)** fallback on web | Chats, characters, lorebooks, memories all local-first |
| Local file I/O | **Capacitor Filesystem plugin** on device, **File System Access API / download-as-file** fallback on web | For explicit save/load of chat & story files |
| Vector store | **sqlite-vec** or **local embeddings + cosine sim in JS** for small scale; pluggable to **Qdrant/Weaviate/pgvector** if backend added later | Enables semantic memory search |
| Backend (optional) | **Node.js (NestJS) + PostgreSQL** | Only needed for cloud sync, auth, shared image gen proxy |
| Auth | **Firebase Auth / Supabase Auth** or self-hosted (NestJS + JWT) | Local-only "guest" mode supported |
| Secrets storage | **Capacitor Secure Storage / Keychain / Keystore** on device; encrypted at rest on web | Store user's own API keys — never send to your servers |
| LLM communication | Direct client-side fetch with streaming (SSE / fetch streams) | Support streaming |
| Image generation | Provider adapters: OpenAI Images, Stability API, ComfyUI/A1111 local API, "tags-only" no-op | |
| Styling | Ionic components + custom theme, dark-mode-first | |

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Ionic App (Client)                        │
│  ┌───────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐     │
│  │  UI Layer │ │ Chat Engine│ │ Memory Eng │ │ Image Eng  │     │
│  │ (pages/   │ │ (turn mgr, │ │ (extract,  │ │ (tag gen,  │     │
│  │ components)│ │ story mgr) │ │ embed,     │ │ provider   │     │
│  │           │ │            │ │ retrieve)  │ │ adapters)  │     │
│  └─────┬─────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘     │
│        └──────────────┴──────┬───────┴──────────────┘            │
│                     ┌─────────▼─────────┐                        │
│                     │  Provider Adapter  │                        │
│                     │  Layer (LLM/IMG)   │                        │
│                     └─────────┬─────────┘                        │
│                     ┌─────────▼─────────┐                        │
│                     │  Local Data Layer  │                        │
│                     │ (SQLite/IndexedDB) │                        │
│                     └─────────┬─────────┘                        │
│                     ┌─────────▼─────────┐                        │
│                     │  File I/O Layer    │                        │
│                     │ (Capacitor FS /    │                        │
│                     │  Web File API)     │                        │
│                     └─────────┬─────────┘                        │
└───────────────────────────────┼───────────────────────────────────┘
                                 │ optional sync
                     ┌───────────▼───────────┐
                     │  Backend (NestJS API)  │
                     │  Auth, Sync, Proxy     │
                     └────────────────────────┘
```

Design principle: **local-first**. Fully usable with a local LLM and no backend at all.

---

## 3a. Cross-Platform Strategy

*(Unchanged from original — Ionic + Capacitor strategy, CORS notes, secure storage, responsive layout, CI/CD, testing matrix all still apply.)*

---

## 4. Core Data Model

> [!IMPORTANT]
> Major additions: **Lorebook** and **LoreEntry** as first-class entities, **ChatExportFile** and **StoryExportFile** for local save/load, **GalleryItem** for the gallery view. The former "WorldInfo/Lore entry" is now the full **Lorebook** system.

### 4.1 Existing Entities (refined)

- **User** — profile, settings, connection configs, API keys (encrypted).
- **ConnectionProfile** — name, type (local/cloud), endpoint URL, auth method, model list, context size, default sampling params, streaming toggle.
- **Persona** — the user's own avatar/identity in chat (name, description, avatar image).
- **Character** — name, avatar, description, personality, speech style, greeting message(s), example dialogues, tags, `isPlayable` flag, per-character sampling override, `linkedLoreEntryIds[]` (cross-ref to lore entries about this character).
- **ImageGenConfig** — provider type, endpoint, model/checkpoint, style presets, negative prompt defaults.

### 4.2 Scenario (Enhanced)

```typescript
interface Scenario {
  id: string;
  title: string;
  description: string;
  coverImage?: string;

  // Character assignments
  characterIds: string[];           // existing characters added to this scenario
  characterRoles: Record<string, 'playable' | 'npc'>;

  // Lorebook assignments (multiple lorebooks supported)
  lorebookIds: string[];             // links to existing lorebooks (priority ordered, first = highest)

  // Chat/Story configuration
  specialInstructions: string;      // system prompt
  defaultMode: 'chat' | 'story';
  defaultPOV: '1st-person' | '3rd-person';
  defaultTense: 'past' | 'present';

  // Metadata
  createdAt: string;
  updatedAt: string;
  tags: string[];
}
```

**Scenario Create/Update flow:**
1. Enter title, description, cover image
2. **Add Characters**: browse & select existing characters, OR create a new character inline (opens Character Editor modal)
3. **Select Lorebook**: pick from existing lorebooks, OR create a new lorebook inline (opens Lorebook Editor modal)
4. Configure special instructions, default mode, POV, tense
5. Save

### 4.3 Lorebook System (NEW — replaces WorldInfo)

```typescript
interface Lorebook {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  entries: LoreEntry[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

interface LoreEntry {
  id: string;
  lorebookId: string;              // parent lorebook

  title: string;
  loreType: LoreType;
  loreDescription: string;        // the AI-facing description injected into context
  triggerWords: string[];          // keywords that activate this entry
  
  // Cross-links
  linkedLoreEntryIds: string[];    // references to other lore entries
  linkedCharacterIds: string[];    // references to characters

  // Injection settings
  insertionPosition: 'before-context' | 'after-context' | 'in-context';
  scanDepth: number;               // how far back in chat history to scan for triggers
  probability: number;             // 0-1, chance of injection when triggered
  isRecursive: boolean;            // whether this entry can trigger other entries
  isEnabled: boolean;

  createdAt: string;
  updatedAt: string;
}

enum LoreType {
  PREMISE = 'premise',
  HISTORY = 'history',
  MEMORY = 'memory',
  FACTION = 'faction',
  LOCATION = 'location',
  SPECIES = 'species'
}
```

### 4.4 Chat & Story Sessions

```typescript
interface ChatSession {
  id: string;
  scenarioId: string;
  personaId: string;
  activeCharacterIds: string[];
  mode: 'chat' | 'story';
  messages: Message[];
  linkedMemoryIds: string[];
  createdAt: string;
  updatedAt: string;
  
  // Gallery metadata
  title: string;                    // auto-generated or user-set
  summary?: string;                 // auto-generated summary for gallery preview
  thumbnailImage?: string;          // first generated image or scenario cover
  isFavorite: boolean;
  tags: string[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'narrator';
  senderId: string;                 // character or persona id
  senderName: string;
  content: string;
  timestamp: string;
  generatedImageRefs: string[];
  isPinnedAsMemory: boolean;
  tokenCount: number;
}
```

### 4.5 Local File Save/Load Format

```typescript
// The file format for exporting/importing chats and stories
interface ChatExportFile {
  formatVersion: '1.0';
  exportedAt: string;
  appVersion: string;
  
  type: 'chat' | 'story';
  session: ChatSession;
  
  // Embedded data (so the file is self-contained)
  scenario: Scenario;
  characters: Character[];
  persona: Persona;
  lorebook?: Lorebook;
  memories: Memory[];
  
  // Image data (base64 or references)
  images: Record<string, string>;   // imageId → base64 data URI
}
```

### 4.6 Memory (unchanged from original)

- **Memory** — source (auto or manual), summary text, embedding vector, linked message id(s), importance score, linked scenario/chat, decay/relevance metadata.

---

## 5. Feature Modules & Design Notes

### 5.1 Connection Manager (Local/Cloud LLM)
*(Unchanged from original — adapter pattern, health check, multiple profiles, per-scenario overrides)*

### 5.2 Model & Chat Configuration
*(Unchanged — model picker, sampling controls, prompt template selector)*

### 5.3 Scenario Builder (Enhanced)

> [!IMPORTANT]
> **Major change**: Scenario creation/editing now integrates character and lorebook management directly.

**Create / Update Scenario page:**

```
┌─────────────────────────────────────────┐
│  Create / Edit Scenario                  │
├─────────────────────────────────────────┤
│  Title: [________________]               │
│  Description: [__________]               │
│  Cover Image: [Upload/Generate]          │
│                                          │
│  ── Characters ──────────────────────    │
│  [+ Add Existing Character]              │
│  [+ Create New Character]                │
│                                          │
│  ┌─────┐ ┌─────┐ ┌─────┐               │
│  │ Ava │ │ Bob │ │ Cat │  ← chips,      │
│  │ NPC │ │Play │ │ NPC │    tap to       │
│  └─────┘ └─────┘ └─────┘    toggle role  │
│                                          │
│  ── Lorebook ────────────────────────    │
│  [Select Existing Lorebook ▼]            │
│       — or —                             │
│  [+ Create New Lorebook]                 │
│                                          │
│  Selected: "Aethoria Lore" (12 entries)  │
│  [Edit] [Detach]                         │
│                                          │
│  ── Configuration ───────────────────    │
│  Mode: [Chat ▼] / [Story ▼]             │
│  POV:  [1st Person ▼]                   │
│  Special Instructions:                   │
│  [____________________________]          │
│                                          │
│  [Save Scenario]  [Cancel]               │
└─────────────────────────────────────────┘
```

**Character selection modal:**
- Searchable list of all existing characters
- Multi-select with checkboxes
- Quick preview card on tap-and-hold
- Role toggle (playable / NPC) after selection

**Inline character creation:**
- Opens Character Editor as a full-page modal
- On save, character is created AND auto-added to the scenario

### 5.4 Character Builder
*(Same as original with addition of `linkedLoreEntryIds` field — can link to lore entries that describe this character)*

### 5.5 Lorebook Manager (NEW — replaces World Info)

> [!IMPORTANT]
> Lorebooks are now a **standalone, first-class feature** accessible from two places: (1) inline within the Scenario Builder, and (2) from a **dedicated Lorebook list page** in the main navigation.

#### 5.5.1 Lorebook List Page (top-level navigation)

```
┌─────────────────────────────────────────┐
│  📚 Lorebooks                [+ New]     │
├─────────────────────────────────────────┤
│  🔍 [Search lorebooks...]               │
│                                          │
│  ┌───────────────────────────────────┐   │
│  │ 🏰 Aethoria Lore                 │   │
│  │ 12 entries · 3 linked scenarios   │   │
│  │ Tags: fantasy, medieval           │   │
│  │ Updated: 2 hours ago              │   │
│  │ [Edit] [Duplicate] [Export] [Delete]│  │
│  └───────────────────────────────────┘   │
│                                          │
│  ┌───────────────────────────────────┐   │
│  │ 🚀 Starbound Universe            │   │
│  │ 8 entries · 1 linked scenario     │   │
│  │ Tags: sci-fi, space               │   │
│  │ Updated: 1 day ago                │   │
│  │ [Edit] [Duplicate] [Export] [Delete]│  │
│  └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

#### 5.5.2 Lorebook Editor (add/update entries)

```
┌─────────────────────────────────────────┐
│  📖 Edit Lorebook: Aethoria Lore        │
├─────────────────────────────────────────┤
│  Title: [Aethoria Lore______]            │
│  Description: [High fantasy world...]    │
│                                          │
│  ── Entries ─────────── [+ Add Entry]    │
│  Filter by type: [All ▼]                │
│                                          │
│  ┌───────────────────────────────────┐   │
│  │ 🏰 The Crystal Citadel            │   │
│  │ Type: Location · 3 triggers       │   │
│  │ Links: 2 entries, 1 character     │   │
│  │ [Edit] [Disable] [Delete]         │   │
│  └───────────────────────────────────┘   │
│                                          │
│  ┌───────────────────────────────────┐   │
│  │ 🐉 Drakonids                      │   │
│  │ Type: Species · 2 triggers        │   │
│  │ Links: 1 entry                    │   │
│  │ [Edit] [Disable] [Delete]         │   │
│  └───────────────────────────────────┘   │
│                                          │
│  [Save Lorebook]  [Cancel]               │
└─────────────────────────────────────────┘
```

#### 5.5.3 Lore Entry Editor (modal)

```
┌─────────────────────────────────────────┐
│  ✏️ Edit Lore Entry                      │
├─────────────────────────────────────────┤
│  Title: [The Crystal Citadel____]        │
│                                          │
│  Lore Type:                              │
│  [Premise] [History] [Memory]            │
│  [Faction] [Location✓] [Species]         │
│                                          │
│  Lore Description (for AI):              │
│  [The Crystal Citadel is an ancient      │
│   fortress made of living crystal that   │
│   resonates with magical frequencies...] │
│                                          │
│  Trigger Words:                          │
│  [crystal citadel] [citadel] [fortress]  │
│  [+ Add trigger]                         │
│                                          │
│  ── Links ───────────────────────────    │
│  Linked Lore Entries:                    │
│  [+ Link Entry] → "Arcane Order"         │
│                    "Crystal Magic"        │
│  Linked Characters:                      │
│  [+ Link Character] → "High Mage Elara"  │
│                                          │
│  ── Advanced ────────────────────────    │
│  Insertion: [Before Context ▼]           │
│  Scan Depth: [5] messages                │
│  Probability: [100%]                     │
│  ☑ Recursive  ☑ Enabled                 │
│                                          │
│  [Save Entry]  [Cancel]                  │
└─────────────────────────────────────────┘
```

### 5.6 Standard Chat Engine
*(Unchanged — prompt assembly, streaming, regenerate/swipe, group chat logic)*

### 5.7 Story Mode
*(Unchanged — continuous narrative, POV/tense, author's note, prose-level controls)*

### 5.8 In-Chat Image Generation
*(Unchanged — tag extraction, provider adapters, image attachment)*

### 5.9 Memory System
*(Unchanged — auto extraction, manual pin, embedding + retrieval, memory graph stretch goal)*

### 5.10 Local Save/Load System (NEW)

> [!IMPORTANT]
> Users can save chats and stories to local files and reload them. Files are self-contained JSON bundles.

**Save flow:**
1. User taps "Save to File" from chat/story menu or gallery
2. App bundles the full session (messages, scenario, characters, lorebook, memories, generated images as base64)
3. File is written to the user's **Documents folder** via Capacitor Filesystem (native) or browser download dialog (web)
4. File extension: `.json` with a distinctive internal `formatVersion` field for identification

**Load flow:**
1. User taps "Load from File" from home page or gallery
2. Native: file picker via Capacitor; Web: `<input type="file">`
3. App validates the file format and version
4. Conflict resolution: if scenario/characters already exist locally, prompt user to: (a) merge, (b) create as new copy, (c) skip duplicates
5. Session is imported into local DB and appears in gallery

**Implementation details:**
- `FileExportService` handles serialization (including resolving all references into a flat bundle)
- `FileImportService` handles deserialization, validation, and conflict resolution
- Support both Capacitor Filesystem plugin (native) and Web File API (browser)
- Max image embedding size configurable (default: include thumbnails, option to include full-res)
- Progress indicator for large exports/imports

### 5.11 Gallery Page (NEW)

> [!IMPORTANT]
> A visual browsing experience for all saved chats and stories.

```
┌─────────────────────────────────────────┐
│  🎨 Gallery              [Grid] [List]   │
├─────────────────────────────────────────┤
│  🔍 [Search...]  Filter: [All ▼]        │
│  Sort: [Last Updated ▼]                 │
│  Mode: [All ▼] [Chat] [Story]           │
│                                          │
│  ── Favorites ─────────────────────────  │
│  ┌────────┐ ┌────────┐ ┌────────┐       │
│  │ 🖼️    │ │ 🖼️    │ │ 🖼️    │       │
│  │ "Dark  │ │ "Star  │ │ "The   │       │
│  │ Forest"│ │ Quest" │ │ Crown" │       │
│  │ ⭐Chat │ │ ⭐Story│ │ ⭐Chat │       │
│  │ 3h ago │ │ 1d ago │ │ 2d ago │       │
│  └────────┘ └────────┘ └────────┘       │
│                                          │
│  ── Recent ────────────────────────────  │
│  ┌────────┐ ┌────────┐ ┌────────┐       │
│  │ 🖼️    │ │ 🖼️    │ │ 🖼️    │       │
│  │ "Dungeon│ │ "Love  │ │ "Myst  │       │
│  │ Crawl" │ │ Letter"│ │ Manor" │       │
│  │ Chat   │ │ Story  │ │ Chat   │       │
│  │ 5h ago │ │ 1w ago │ │ 2w ago │       │
│  └────────┘ └────────┘ └────────┘       │
│                                          │
│  ── Actions (per card, on long-press) ── │
│  [Resume] [Duplicate] [Export to File]   │
│  [Share] [Favorite/Unfavorite] [Delete]  │
│                                          │
│  ── Bulk Actions (toolbar when multi-    │
│     selecting) ─────────────────────     │
│  [Export All] [Delete Selected]          │
│  [Load from File]                        │
└─────────────────────────────────────────┘
```

**Gallery features:**
- **Grid and list view** toggle
- **Thumbnail**: manually uploaded image by user, or a gradient placeholder if none set
- **Auto-generated title/summary**: via LLM summarization of the first few exchanges (runs on first save or manually)
- **Filters**: by mode (chat/story), by scenario, by character, by date range, favorites only
- **Sort**: last updated, created date, title, message count
- **Search**: full-text search across chat content and metadata
- **Card preview**: tap to see a quick-read summary with last few messages before resuming
- **Batch operations**: multi-select for bulk export or delete
- **Load from file**: import button in the gallery toolbar

### 5.12 Chat History & Search
*(Enhanced from original to integrate with Gallery — full-text + semantic search, auto-generated titles, export/import now handled by the Save/Load system)*

### 5.13 Auth & Sync (optional layer)
*(Unchanged — guest mode default, optional account for cross-device sync)*

---

## 6. Suggested Project Structure

```
src/
  app/
    core/
      services/
        llm-provider.service.ts
        image-provider.service.ts
        memory-engine.service.ts
        db.service.ts
        auth.service.ts
        file-export.service.ts          # NEW: save to file
        file-import.service.ts          # NEW: load from file
        secure-storage.service.ts
      adapters/
        llm/
          openai-compatible.adapter.ts
          anthropic.adapter.ts
          gemini.adapter.ts
        image/
          a1111.adapter.ts
          comfyui.adapter.ts
          stability.adapter.ts
          copy-tags.adapter.ts
      models/
        character.model.ts
        persona.model.ts
        scenario.model.ts
        lorebook.model.ts               # NEW: Lorebook + LoreEntry + LoreType
        chat-session.model.ts
        message.model.ts
        memory.model.ts
        connection-profile.model.ts
        image-gen-config.model.ts
        export-file.model.ts            # NEW: ChatExportFile format
      state/
        characters.store.ts
        scenarios.store.ts
        lorebooks.store.ts              # NEW
        sessions.store.ts
        gallery.store.ts                # NEW
    features/
      connections/                      # connection profile CRUD + test UI
      characters/                       # character/persona builder
        character-list/
        character-editor/
        persona-manager/
      lorebooks/                        # NEW: standalone lorebook management
        lorebook-list/                  #   list page (top-level nav)
        lorebook-editor/                #   add/update lorebook
        lore-entry-editor/              #   add/update individual entries
      scenarios/
        scenario-list/
        scenario-editor/                #   create/update with char + lorebook selection
      chat/                             # standard chat UI + turn manager
      story-mode/
      image-gen/
      memory/                           # memory browser, graph view
      gallery/                          # NEW: gallery page for chats & stories
        gallery-grid/
        gallery-list/
        session-preview/
      save-load/                        # NEW: file save/load UI (file picker, conflict modal)
      auth/
    shared/
      components/
        avatar/
        message-bubble/
        tag-chip/
        lore-type-badge/                # NEW: colored badge for lore types
        character-select-modal/         # NEW: reusable character picker
        lorebook-select-modal/          # NEW: reusable lorebook picker
        file-conflict-modal/            # NEW: import conflict resolution
      pipes/
      directives/
  assets/
    icons/
      lore-types/                       # icons for each lore type
capacitor.config.ts
```

---

## 7. Development Roadmap (Revised & Phased)

**Phase 0 — Foundations (1–2 weeks)**
- Ionic/Angular/Capacitor project scaffold, theming, routing shell, local DB setup (SQLite/Dexie), basic auth (guest mode first).
- Add native platforms early and get "hello world" builds running on real devices + web.
- Define all data models (Section 4) including Lorebook and export format.

**Phase 1 — Connection & Model Layer (1–2 weeks)**
- ConnectionProfile CRUD, OpenAI-compatible adapter, streaming chat proof-of-concept, prompt template system.

**Phase 2 — Character Builder (1–2 weeks)**
- Persona and Character CRUD UIs.
- Character card import/export (PNG-embedded JSON, JSON — SillyTavern-compatible).
- Character selection modal (reusable component for Scenario Builder).

**Phase 3 — Lorebook System (2–3 weeks)** ⬅️ NEW
- Lorebook and LoreEntry data models, DB schema.
- Lorebook List page (top-level navigation): create, edit, duplicate, delete, export lorebooks.
- Lorebook Editor: add/update/reorder entries within a lorebook.
- Lore Entry Editor modal: title, lore type selector (premise/history/memory/faction/location/species), description, trigger words, linked entries and characters, advanced injection settings.
- Lorebook selection modal (reusable for Scenario Builder).
- Import/export individual lorebooks as JSON files.

**Phase 4 — Scenario Builder (2 weeks)** ⬅️ ENHANCED
- Scenario CRUD with the enhanced flow:
  - Add existing characters (via Character Select modal)
  - Create new characters inline (opens Character Editor modal)
  - Select existing lorebook (via Lorebook Select modal) OR create new lorebook inline
  - Configure mode, POV, tense, special instructions
- Scenario list page with cards showing linked characters/lorebook.

**Phase 5 — Standard Chat Engine (2 weeks)**
- Prompt assembly pipeline integrating lorebook trigger-word scanning.
- Message rendering, streaming, regenerate/edit/branch, group chat turn logic.

**Phase 6 — Story Mode (1–2 weeks)**
- Continuous narrative UI, POV/tense controls, author's note, prose-level undo/continue — reusing Phase 5's prompt pipeline.

**Phase 7 — Memory Engine (2–3 weeks, highest risk)**
- Auto-extraction, manual pin, embeddings + local vector search, retrieval injection, memory browser UI.

**Phase 8 — Image Generation (1–2 weeks)**
- Tag extraction, provider adapters, image attachment to messages.

**Phase 9 — Local Save/Load & Gallery (2–3 weeks)** ⬅️ NEW
- **Save/Load System**:
  - `FileExportService`: serialize session + all related data to self-contained JSON
  - `FileImportService`: deserialize, validate, conflict resolution UI
  - Platform-specific file I/O (Capacitor Filesystem + web fallback)
  - `.json` file format with distinctive `formatVersion` field
- **Gallery Page**:
  - Grid and list views with thumbnails and metadata
  - Filters (mode, scenario, character, date, favorites)
  - Sort options (last updated, created, title, message count)
  - Full-text search
  - Card actions: resume, duplicate, export, share, favorite, delete
  - Batch operations: multi-select, bulk export, bulk delete
  - "Load from File" integration in gallery toolbar
  - Auto-generated titles/summaries

**Phase 10 — History, Search, Sync, Polish (2 weeks)**
- Full chat search (integrated with gallery), optional backend sync, secure key storage hardening, performance pass, accessibility/theming polish.
- Cross-platform release prep.

**Phase 11 — Beta & Hardening (ongoing)**
- Error handling, context-window overflow handling, rate-limit/backoff, telemetry (opt-in crash reporting).

**Total revised estimate: ~16–22 weeks** for a small team (2–3 devs) to reach a solid v1.

---

## 8. Key Technical Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Local LLM endpoints vary in API shape | Adapter conformance test suite; raw-endpoint override fields |
| Context window overflow with characters + lorebook + memories + history | Token budget manager: system instructions > active lore entries > retrieved memories > recent history |
| Memory retrieval quality | User review/edit of auto-extracted memories; transparency of injected memories |
| API key security on-device | Capacitor Secure Storage/Keychain; never log keys |
| Mobile performance running local embeddings | Tiny embedding model or delegate to provider's embedding endpoint |
| Image gen provider fragmentation | Strict adapter interface + "copy tags only" fallback |
| **Large file exports with embedded images** | Configurable image quality/inclusion; streaming write for large files; progress UI |
| **Lorebook trigger word performance at scale** | Index trigger words in DB; batch-scan optimization; limit scan depth |
| **File import conflicts with existing data** | Three-way conflict resolution UI (merge/copy/skip); preview before import |

---

## 9. Future Considerations

> [!NOTE]
> These are features identified for post-v1 development. They are documented here to ensure the architecture accommodates them without requiring major refactoring.

### 9.1 Enhanced Lorebook Features (deferred to post-v1)
- **Conditional lore activation**: entries that activate only when certain characters are present or certain story conditions are met
- **Lore entry templates**: pre-built templates for common lore types to speed up creation
- **Community lorebook sharing**: export/import lorebooks as standalone files for community distribution
- **Auto-lore generation**: use the LLM to generate lore entries from a world description or from chat history

### 9.2 Advanced Gallery & Library
- **Reading mode**: a distraction-free reader for completed stories
- **Chapter system**: break long stories into chapters with chapter-level navigation
- **Story branching visualization**: visual tree showing all branches of a conversation
- **Ratings and notes**: personal ratings and annotations on saved sessions
- **Cloud gallery sync**: sync gallery items across devices (requires backend)

### 9.3 Collaboration & Sharing
- **Shareable scenario links**: generate links that others can import to start the same scenario
- **Character marketplace**: browse and import community-created characters (would require a central server)
- **Collaborative writing**: real-time multiplayer story mode (significant infrastructure requirement)

### 9.4 AI & Quality of Life
- **Smart scenario suggestions**: recommend characters/lorebook entries based on scenario description
- **Auto-tagging**: automatically tag chats and stories by genre, mood, and content
- **TTS integration**: text-to-speech for character dialogue with per-character voice settings
- **Voice input**: speech-to-text for user input in chat mode
- **Token budget visualizer**: real-time display of how context window budget is being spent

### 9.5 Platform & Performance
- **Desktop app** via Electron/Tauri for users who want a native desktop experience
- **Offline-first enhancements**: more aggressive caching and preloading for fully offline use
- **Plugin/extension system**: allow users to create custom adapters, UI themes, or automation scripts
- **Backup scheduling**: automatic periodic backup of all data to a user-specified location

---

## 10. Suggested Immediate Next Steps

1. **Lock the data model** (Section 4) — everything else depends on it. Pay special attention to the Lorebook schema as it's the biggest new addition.
2. **Build Phase 0 + Phase 1** as a spike to validate streaming chat against one local (Ollama) and one cloud (OpenAI-compatible) endpoint.
3. **Prototype the Lorebook trigger-word system** in isolation — validate that keyword scanning and lore injection work correctly at scale (e.g., 50+ entries with overlapping triggers).
4. **Prototype the file export/import system** early — ensure the self-contained JSON format handles edge cases (large image payloads, circular references in lore entry links, character encoding).
5. **Prototype the memory extraction + retrieval loop** early (Phase 7) in isolation, since it's the highest-uncertainty feature.

---

## Decisions (Approved)

- ✅ **Naming**: Keep "Lorebook" as the user-facing and internal term
- ✅ **File format**: Use `.json` with distinctive internal `formatVersion` field
- ✅ **Advanced lorebook features**: Deferred to post-v1 (conditional activation, templates, auto-generation)
- ✅ **Multiple lorebooks**: Support linking multiple lorebooks per scenario with priority ordering
- ✅ **Gallery thumbnails**: Manually uploaded by user
- ✅ **File save location**: User's Documents folder on mobile
- ✅ **SillyTavern import**: Yes, support importing SillyTavern World Info JSON format for lorebooks
