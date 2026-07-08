# MasterBookAI

A cross-platform AI companion application for immersive storytelling and intelligent conversation. Built with **Ionic 8**, **Angular 20 (standalone components)**, and **Capacitor** for web, iOS, and Android deployment.

## Features

- **Multi-Backend LLM Support**: Connect to OpenAI, Anthropic, Google Gemini, OpenRouter, Ollama, LM Studio, or any OpenAI-compatible endpoint
- **Streaming Chat**: Real-time token-by-token streaming with markdown rendering
- **Character Builder**: Create and manage AI characters with personalities, descriptions, and greeting messages
- **Scenario System**: Build rich worlds with multiple characters, lore, and special instructions
- **Memory System**: Pin messages as memories for long-term coherence (auto-extraction ready)
- **Image Generation**: Configurable backends for AI-generated images (OpenAI, Stable Diffusion, ComfyUI)
- **Local-First Storage**: All data stored locally via IndexedDB (Dexie.js) with SQLite on native platforms
- **Dark Mode**: Beautiful dark-first theming with accent colors
- **Export/Import**: Full data backup and restore via JSON

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Ionic 8 + Angular 20 (standalone) |
| Native Runtime | Capacitor 7 |
| Local DB | Dexie.js (IndexedDB) / SQLite |
| State Management | Angular Signals |
| Markdown | marked |
| Styling | SCSS + Ionic CSS Utilities |

## Project Structure

```
src/app/
  core/
    models/         # Data models (Character, ChatSession, ConnectionProfile, etc.)
    services/       # Storage, LLM Provider, Chat Engine
    adapters/       # LLM & Image provider adapters (extensible)
  features/
    home/           # Dashboard
    chat/           # Main chat interface with streaming
    characters/     # Character builder & detail
    scenarios/      # Scenario management
    connections/    # LLM backend configuration
    memory/         # Memory browser
    image-gen/      # Image generation config
    settings/       # Data export/import & about
  shared/
    components/     # Markdown renderer, reusable UI
```

## Getting Started

### Prerequisites
- Node.js 20+ and npm
- Ionic CLI (optional): `npm install -g @ionic/cli`

### Installation

```bash
cd MasterBookAI
npm install
```

### Development Server

```bash
ionic serve
# or
ng serve
```

The app will open at `http://localhost:8100`.

### Building for Production

```bash
ionic build --prod
```

### Native Platforms

```bash
# iOS
npx cap add ios
npx cap open ios

# Android
npx cap add android
npx cap open android
```

## Connecting to LLM Backends

1. Go to **Connections** in the side menu
2. Click **Add Connection**
3. Select a preset (OpenAI, Anthropic, Ollama, etc.) or configure custom
4. Enter your API key (for cloud providers) or endpoint URL (for local)
5. Click **Test** to verify connectivity
6. Start a new chat!

### Local LLM Examples

| Tool | Endpoint URL | Notes |
|------|-------------|-------|
| Ollama | `http://localhost:11434/v1` | Enable CORS for web use |
| LM Studio | `http://localhost:1234/v1` | Start local server |
| koboldcpp | `http://localhost:5001/api/v1` | API mode |

## Data Model

The app follows a SillyTavern-inspired data model:

- **ConnectionProfile** — LLM backend configuration
- **Persona** — Your identity in chat
- **Character** — AI companion/NPC definition
- **Scenario** — Container for characters, world info, and settings
- **ChatSession** — Conversation thread
- **Message** — Individual chat message
- **Memory** — Extracted important events
- **WorldInfoEntry** — Keyword-triggered lore injection

## Roadmap

- [x] Phase 0: Project scaffold, theming, routing
- [x] Phase 1: Connection manager, streaming chat
- [x] Phase 2: Character builder
- [ ] Phase 3: Full scenario/world-info system
- [ ] Phase 4: Story mode (continuous narrative)
- [ ] Phase 5: Memory engine with embeddings
- [ ] Phase 6: Image generation
- [ ] Phase 7: Search, sync, polish

## License

MIT
