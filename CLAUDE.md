# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GoldieRillChat is an Electron desktop application — a personal AI chatbox with customizable backgrounds (images, videos, Three.js shaders). The UI is primarily in Chinese. Built with React 18, Vite, TailwindCSS + DaisyUI, and Electron 28.

## Common Commands

```bash
# Development
npm run electron:dev          # Start Electron in dev mode (main entry point for development)

# Production build
npm run electron:build        # Full build: prepare resources → vite build → electron-builder
npm run electron:build:portable  # Build portable Windows executable

# Speech server (Python backend)
npm run speech:setup          # Setup Python dependencies for speech recognition
npm run start:speech          # Start the Flask speech server

# Other
npm run dev                   # Vite dev server only (no Electron)
npm run build                 # Vite build only (no Electron packaging)
```

No test framework is configured — there are no unit tests in the project.

## Architecture

### Process Model
- **Main process** (`electron/main.js`, ~120KB): Window management, BrowserView for embedded browser, IPC handlers, custom file protocols (`local-file://`, `app-resource://`), file I/O operations.
- **Preload** (`electron/preload.js`): Context bridge exposing safe APIs to the renderer via `window.electronAPI`.
- **Renderer**: React SPA served by Vite, bundled into `dist/`.

### Renderer Structure (`src/`)

- **App.jsx** (~2000 lines): Monolithic root component. Holds most application state and orchestrates the 6-tool interface. Key state includes active tool, conversations, settings, and sidebar state.
- **components/**: 35+ React components organized by feature. Major subsystems:
  - `AIChat/` — AI chat with sub-components, handlers, and hooks (separate from basic Chat)
  - `ThreeBackground/` — Three.js shader background rendering
  - `LivePortrait/`, `CustomPhotoEditor/` — Media features
  - `Sidebar.jsx`, `TitleBar.jsx`, `ChatView.jsx`, `BrowserTabs.jsx` — Core UI
- **config/**: `modelConfig.js` (AI provider definitions), `toolsConfig.js` (tool display config)
- **services/**: Business logic — `modelProviders.js` (AI API calls), `imageGenerationService.js`, `KnowledgeBaseService.js`, `searchService.js`, `tavilyService.js`, `dashscopeService.js`, `messageStorage.js`, `FileProcessingService.js`
- **utils/**: Helpers — `db.js` (Dexie/IndexedDB), `prompts.js` (AI prompt templates), `messageUtils.js`, `browserUtils.js`
- **hooks/**: Custom React hooks like `useKnowledgeBase.js`
- **styles/**: 44 CSS files, one per component/feature

### Tool System
The app has 6 tools navigable via sidebar and keyboard shortcuts (Ctrl+1–6):
1. ThreeJS Shaders (Ctrl+1)
2. Browser (Ctrl+2)
3. AI Chat (Ctrl+3)
4. Chat (Ctrl+4)
5. Monaco Editor (Ctrl+5)
6. Embedding (Ctrl+6)

Tools communicate via custom DOM events (`switchTool`, `tool-changed`, `editImage`, `show-link-dialog`) and localStorage.

### Data Storage
- Conversations stored as directories with `messages.json` (chat history + metadata) and `timemessages.json` (timestamps).
- Three message types: **TypeU** (user), **TypeA** (AI assistant), **TypeN** (notes, excluded from AI context).
- Settings and API keys in localStorage.
- IndexedDB via Dexie for complex queries (`src/utils/db.js`).
- File attachments stored in conversation subdirectories.

### AI Provider Integration
`src/services/modelProviders.js` handles API calls to: OpenAI, Claude/Anthropic, DeepSeek, SiliconFlow, OpenRouter, StepFun. Provider configs defined in `src/config/modelConfig.js`. All API keys stored client-side in localStorage.

### Python Speech Backend
`speech_server.py` — Flask server using DashScope for real-time speech recognition. Communicates with the Electron app over HTTP. Can be packaged as standalone `.exe` via PyInstaller.

## Key Path Alias

`@` maps to `./src/` (configured in `vite.config.js`).

## Build Output

`dist-electron/` — contains the packaged application (NSIS installer + portable exe for Windows, DMG for macOS, AppImage for Linux).

## Style Conventions

- TailwindCSS utility classes with DaisyUI component themes.
- Component-specific CSS files in `src/styles/`.
- No CSS modules — global class names used throughout.
