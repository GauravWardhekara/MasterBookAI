# MasterBookAI — Consolidated Implementation Plan

A SillyTavern/NovelAI/FictionLab-style AI companion app built with Ionic 8 + Angular for web + mobile deployment.

> **This is the single source of truth** — consolidates all prior plans from conversations `57f2307b`, `5faf6c16`, `7ad2549b`, and the master development plan document.

---

## Current State Summary

### ✅ Completed Phases

| Phase | Status | Key Files |
|---|---|---|
| **Phase 0 — Foundations** | ✅ Done | Scaffold, theming, routing, DB, guest auth |
| **Phase 1 — Connection & Model Layer** | ✅ Done | `connection.service.ts`, `llm-provider.service.ts`, Settings page |
| **Phase 2 — Character Builder** | ✅ Done (mostly) | `character.service.ts`, character editor/list pages |
| **Phase 3 — Lorebook System** | ✅ Done (mostly) | `lorebook.service.ts`, lorebook editor/list pages |
| **Phase 4 — Scenario Builder** | ✅ Done | `scenario.service.ts`, scenario editor/list with char+lorebook selection |
| **Phase 5 — Standard Chat Engine** | ✅ Done | `prompt-assembly.service.ts`, chat page with streaming |

### ⏳ Partially Done

| Phase | Status | What's Done | What Remains |
|---|---|---|---|
| **Phase 6 — Story Mode** | ⏳ ~80% | Full story mode UI (`story-mode.page.ts`), POV/tense controls, author's note, streaming, undo/regenerate | Prose-level paragraph editing (not just block-level), keyboard shortcuts |
| **Phase 9 — Save/Load & Gallery** | ⏳ ~50% | `file-io.service.ts` (export/import), `gallery.page.ts` (grid/list view, search, filters) | Gallery card actions (resume works, but duplicate/export need testing), batch operations, manual thumbnail upload, sort options, load-from-file integration polish |

### ❌ Not Started

| Phase | Description |
|---|---|
| **Phase 7 — Memory Engine** | Auto-extraction, manual pin, embeddings, vector search, retrieval injection, memory browser UI |
| **Phase 8 — Image Generation** | Tag extraction, provider adapters (cloud/local/copy-only), image attachment |
| **Phase 10 — Polish & Hardening** | Full-text search, secure key storage, performance, accessibility, cross-platform testing |

### Known Deferred Items (within completed phases)
- **Phase 2**: Character card import/export (JSON, PNG-embedded)
- **Phase 3**: SillyTavern World Info JSON import, lorebook export as JSON
- **Phase 5**: Group chat turn logic (multi-NPC rotation)

---

## Architecture

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

---

## Project Structure (Current)

```
src/app/
  core/
    models/
      base.model.ts              ✅
      character.model.ts         ✅
      chat-session.model.ts      ✅  (includes Message, Memory)
      connection-profile.model.ts ✅
      export-file.model.ts       ✅
      lorebook.model.ts          ✅
      scenario.model.ts          ✅
      index.ts                   ✅
    services/
      character.service.ts       ✅
      chat-session.service.ts    ✅
      connection.service.ts      ✅
      database.service.ts        ✅
      file-io.service.ts         ✅
      llm-provider.service.ts    ✅
      lorebook.service.ts        ✅
      prompt-assembly.service.ts ✅
      scenario.service.ts        ✅
      memory.service.ts          ❌ (Phase 7)
      image-provider.service.ts  ❌ (Phase 8)
  features/
    home/home.page.ts            ✅
    characters/
      character-list/            ✅
      character-editor/          ✅
    lorebooks/
      lorebook-list/             ✅
      lorebook-editor/           ✅
    scenarios/
      scenario-list/             ✅
      scenario-editor/           ✅
    chat/chat.page.ts            ✅
    story-mode/story-mode.page.ts ✅
    gallery/gallery.page.ts      ✅ (needs enhancements)
    settings/settings.page.ts    ✅ (Connection Manager + basic settings)
  layout/
    tabs.layout.ts               ✅ (Home, Scenarios, Characters, Lorebooks, Gallery)
```

---

## Next Sprint — Proposed Changes

### Priority Order

Based on the roadmap and what delivers the most user-visible value:

1. **Build fix & verification** — Ensure the app compiles and runs clean
2. **Phase 6 finish** — Story Mode polish (paragraph editing improvements)  
3. **Phase 9 finish** — Gallery enhancements (sort, batch ops, thumbnail upload)
4. **Phase 7 — Memory Engine** — The highest-risk, highest-value remaining feature
5. **Phase 8 — Image Generation** — Tag extraction + provider adapters

---

### Sprint 1: Build Fix + Phase 6 + Phase 9 Polish

#### [MODIFY] `story-mode.page.ts`
- Add keyboard shortcut support (Ctrl+Enter to continue, Escape to stop)
- Improve block editing UX (inline editing instead of alert-based)
- Add "Save as File" option in story menu using FileIOService

#### [MODIFY] `gallery.page.ts`
- Add sort dropdown (Last Updated, Created, Title, Message Count)
- Add "Resume" action on card long-press via ActionSheet
- Add manual thumbnail upload capability
- Add batch selection mode with bulk export/delete
- Reload sessions on `ionViewWillEnter` so gallery stays current when navigating back

#### [MODIFY] `tabs.layout.ts`  
- Add Settings tab to the tab bar (currently Settings is only accessible from within other pages)

---

### Sprint 2: Phase 7 — Memory Engine

#### [NEW] `memory.service.ts`
- **Auto-extraction**: After every N messages, ask the LLM to identify important events and produce memory entries
- **Manual pin**: Allow marking any message as a memory
- **Embedding storage**: Store embedding vectors in the memories table
- **Semantic retrieval**: Cosine similarity search to find relevant memories for prompt injection
- **Decay/importance**: Scoring system to keep retrieval set relevant

#### [NEW] `memory-browser/` feature page
- List all memories with search and filters
- Edit/delete individual memories
- View linked messages and sources
- Memory injection transparency (show which memories influenced a response)

#### [MODIFY] `prompt-assembly.service.ts`
- Integrate memory retrieval into the prompt pipeline (step 4 — between lore entries and message history)

#### [MODIFY] `chat.page.ts`
- Add "Pin as Memory" action on messages
- Show memory injection indicator

#### [MODIFY] `database.service.ts`
- Ensure memories table schema supports embedding vectors

---

### Sprint 3: Phase 8 — Image Generation

#### [NEW] `image-provider.service.ts`
- `ImageProvider` interface with `generate(tags, negativeTags, params)`
- Built-in adapters:
  - Cloud: OpenAI Images, Stability API
  - Local: Automatic1111/ComfyUI HTTP API
  - Copy-only: Format tags to clipboard

#### [NEW] `image-gen-config.model.ts` (enhance existing)
- Per-chat image-gen settings persistence: last used model, LoRA, number of images, and all image-gen params saved per ChatSession
- User's last-used settings remembered and auto-applied to new sessions

#### [NEW] `image-gen/` feature pages
- Tag extraction step (send recent messages to LLM for Danbooru-style tags)
- Tag editor UI (edit before generating)
- Image preview and attachment
- Settings panel for model, LoRA, count, resolution, etc. (persisted per chat)

#### [MODIFY] `chat.page.ts` and `story-mode.page.ts`
- Add "Generate Image" button in message actions
- Display attached images inline

---

## Verification Plan

### Build Verification
- `ng build --configuration development` succeeds without errors
- `ng serve` starts the dev server and app loads in browser

### Manual Verification
- Navigate all pages via tab bar (including Settings as 6th tab)
- Create a scenario with characters and lorebook, start a chat session
- Verify streaming response from LLM (if endpoint configured)
- Switch to story mode and verify prose continuation
- Check gallery shows sessions with correct sorting/filtering by tags, date
- Export/import a session via Gallery

### Decisions (All Approved)
- ✅ Naming: "Lorebook" as user-facing term
- ✅ File format: `.json` with `formatVersion` field
- ✅ Advanced lorebook features: Deferred to post-v1
- ✅ Multiple lorebooks per scenario with priority ordering
- ✅ Gallery thumbnails: Manually uploaded by user
- ✅ SillyTavern import: Support importing World Info JSON
- ✅ **Memory Engine**: Use LLM provider's `/v1/embeddings` when supported; fallback to lightweight in-browser embedding model (`@xenova/transformers`)
- ✅ **Gallery sorting**: Add sort dropdown + filtering by tags, date, etc. in the filter bar
- ✅ **Settings access**: Add as 6th tab in the tab bar
- ✅ **Sprint scope**: Sprint 1 (fix + polish) first, then review before Sprint 2
- ✅ **Image Gen persistence**: Remember user's last used model, LoRA, number of images, and image-gen settings per chat
