# MasterBookAI — Implementation Tasks

## Phase 0 — Foundations
- [ ] Scaffold Ionic/Angular project with standalone components
- [ ] Set up theming (dark-mode-first, custom color palette)
- [ ] Set up routing shell (all major pages)
- [ ] Define all TypeScript data models (Section 4)
- [ ] Set up local DB service (Dexie.js for web-first)
- [ ] Basic guest auth mode

## Phase 1 — Connection & Model Layer
- [ ] ConnectionProfile model & CRUD service
- [ ] LLMProvider adapter interface
- [ ] OpenAI-compatible adapter
- [ ] Connection Manager UI (profiles, test button)
- [ ] Streaming chat proof-of-concept
- [ ] Prompt template system

## Phase 2 — Character Builder
- [ ] Character & Persona CRUD services
- [ ] Character Editor page/modal
- [ ] Persona Manager page
- [ ] Character List page
- [ ] Character Selection modal (reusable)
- [ ] Character card import/export (JSON, PNG-embedded)

## Phase 3 — Lorebook System
- [ ] Lorebook & LoreEntry CRUD services
- [ ] Lorebook List page (top-level nav)
- [ ] Lorebook Editor page (entries management)
- [ ] Lore Entry Editor modal (type selector, triggers, links, advanced settings)
- [ ] Lorebook Selection modal (reusable)
- [ ] SillyTavern World Info JSON import support
- [ ] Lorebook export as JSON

## Phase 4 — Scenario Builder
- [ ] Scenario CRUD service
- [ ] Scenario List page
- [ ] Scenario Editor page (character selection, lorebook selection, config)
- [ ] Inline character creation flow
- [ ] Inline lorebook creation flow

## Phase 5 — Standard Chat Engine
- [ ] Prompt assembly pipeline (with lorebook trigger scanning)
- [ ] Chat UI (message rendering, streaming)
- [ ] Regenerate/edit/branch messages
- [ ] Group chat turn logic

## Phase 6 — Story Mode
- [ ] Continuous narrative UI
- [ ] POV/tense controls
- [ ] Author's note
- [ ] Prose-level undo/continue

## Phase 7 — Memory Engine
- [ ] Auto-extraction service
- [ ] Manual pin-as-memory
- [ ] Embeddings + local vector search
- [ ] Memory retrieval injection
- [ ] Memory browser UI

## Phase 8 — Image Generation
- [ ] Tag extraction step
- [ ] Provider adapters (cloud/local/copy-only)
- [ ] Image attachment to messages

## Phase 9 — Save/Load & Gallery
- [ ] FileExportService (serialize to JSON)
- [ ] FileImportService (deserialize, validate, conflict resolution)
- [ ] Platform file I/O (Capacitor FS + web fallback)
- [ ] Gallery page (grid/list views)
- [ ] Gallery filters, sort, search
- [ ] Gallery card actions (resume, duplicate, export, delete, favorite)
- [ ] Batch operations
- [ ] Manual thumbnail upload for gallery items
- [ ] Load from file integration

## Phase 10 — Polish & Hardening
- [ ] Full-text search across chats
- [ ] Secure key storage hardening
- [ ] Performance pass
- [ ] Accessibility/theming polish
- [ ] Cross-platform testing
