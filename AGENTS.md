# AGENTS.md

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
- **Main process** (`electron/main.js`): Window management, BrowserView for embedded browser, IPC handlers, custom file protocols (`local-file://`, `app-resource://`), file I/O operations.
- **Preload** (`electron/preload.js`): Context bridge exposing safe APIs to the renderer via `window.electronAPI`, `window.hermesAPI`, `window.openclawAPI`.
- **Renderer**: React SPA served by Vite, bundled into `dist/`.
- **IPC handlers** (`electron/ipc/`): Modular handlers — `hermes.js`, `openclaw.js`, `conversation.js`, `media.js`, `bookmarks.js`, `notes.js`, `liveportrait.js`, `fs.js`, `file.js`.

### Renderer Structure (`src/`)

- **App.jsx**: Root component. Holds application state and orchestrates the tool interface. Key state includes active tool, conversations, settings, and sidebar state.
- **components/**: 35+ React components organized by feature. Major subsystems:
  - `AIChat/` — AI chat with sub-components, handlers, and hooks (separate from basic Chat)
  - `ThreeBackground/` — Three.js shader background rendering
  - `LivePortrait/`, `CustomPhotoEditor/` — Media features
  - `HermesPanel.jsx` — Hermes Agent chat panel (SSE streaming, tool progress, session history)
  - `OpenClawPanel.jsx` — OpenClaw WebSocket chat panel
  - `ToolRouter.jsx` — Routes active tool to its panel component
  - `Sidebar.jsx`, `TitleBar.jsx`, `ChatView.jsx`, `BrowserTabs.jsx` — Core UI
- **config/**: `modelConfig.js` (AI provider definitions), `toolsConfig.js` (tool display config, defines tool list and labels)
- **services/**: Business logic — `modelProviders.js` (AI API calls), `hermesService.js` (Hermes SSE stream + history), `openclawService.js` (OpenClaw WebSocket), `imageGenerationService.js`, `KnowledgeBaseService.js`, `searchService.js`, `tavilyService.js`, `dashscopeService.js`, `messageStorage.js`, `FileProcessingService.js`
- **utils/**: Helpers — `db.js` (Dexie/IndexedDB), `prompts.js` (AI prompt templates), `messageUtils.js`, `browserUtils.js`
- **hooks/**: Custom React hooks like `useKnowledgeBase.js`, `useGlobalKeyboard.js`
- **styles/**: CSS files, one per component/feature

### Tool System
The app has multiple tools navigable via sidebar and keyboard shortcuts (Ctrl+1–7). Tool list defined in `src/config/toolsConfig.js`:
1. ThreeJS Shaders
2. Browser
3. AI Chat
4. Chat
5. Monaco Editor
6. Hermes Agent
7. OpenClaw

Tools communicate via custom DOM events (`switchTool`, `tool-changed`, `editImage`, `show-link-dialog`) and localStorage.

### Data Storage
- Conversations stored as directories with `messages.json` (chat history + metadata) and `timemessages.json` (timestamps).
- Three message types: **TypeU** (user), **TypeA** (AI assistant), **TypeN** (notes, excluded from AI context).
- Settings and API keys in localStorage.
- IndexedDB via Dexie for complex queries (`src/utils/db.js`).
- File attachments stored in conversation subdirectories.

### AI Provider Integration
`src/services/modelProviders.js` handles API calls to: OpenAI, Claude/Anthropic, DeepSeek, SiliconFlow, OpenRouter, StepFun. Provider configs defined in `src/config/modelConfig.js`. All API keys stored client-side in localStorage.

### Hermes Agent Integration

Hermes Agent is an external AI agent (separate Python process, `D:\Code\hermes-agent`). GoldieRillChat connects to its two-server architecture:

- **API server** (port 8651): OpenAI-compatible `/v1/chat/completions` with SSE streaming. Auth: static `API_SERVER_KEY` via `Authorization: Bearer`.
- **Dashboard server** (port 9119): Session management at `/api/sessions` and `/api/sessions/{id}/messages`. Auth: ephemeral token scraped from dashboard HTML (`window.__HERMES_SESSION_TOKEN__`), sent via `X-Hermes-Session-Token` header. Token cached 5 min in main process.

Data flow: Renderer → Preload bridge (`window.hermesAPI`) → IPC → `electron/ipc/hermes.js` (main process HTTP proxy, bypasses CORS) → Hermes servers.

SSE events include custom `event: hermes.tool.progress` lines (two-line SSE format: `event:` + `data:`). The service layer tracks event types via `pendingEvent` to route tool progress vs text content.

Slash commands: Only `/new` is handled client-side (clears session + messages). All other Hermes slash commands (like `/usage`, `/model`) are gateway-layer only and cannot be triggered via the REST API — they are not included in the slash menu.

### OpenClaw Integration

OpenClaw connects via WebSocket to a local gateway (configured in `~/.openclaw/openclaw.json`, typically `ws://127.0.0.1:18789`). Data flow: Renderer → `window.openclawAPI` preload bridge → IPC → `electron/ipc/openclaw.js` (main process WS client).

**WebSocket protocol**: JSON frames with `type: 'req'` (requests), `type: 'res'` (responses), `type: 'event'` (push events like `connect.challenge`, `chat`). All requests include `{ type: 'req', id, method, params }`. Responses are `{ type: 'res', id, ok, payload, error }`.

**Authentication flow**: Challenge-response. On WS open, gateway sends `connect.challenge` event with a nonce. Client signs a v3 pipe-delimited payload (`v3|deviceId|clientId|clientMode|role|scopes|signedAtMs|token|nonce|platform|deviceFamily`) using Ed25519 and sends a `connect` request with device auth. Device identity (Ed25519 keypair) is shared with OpenClaw and persisted at `~/.openclaw/identity/device.json`.

**Critical**: `client.id` in connect params must be `'gateway-client'`, NOT the device ID hex hash and NOT the app display name. `client.mode` must be `'backend'` (gateway rejects `'desktop'`). The v3 signed payload must use the same `clientId` and `clientMode`. Use role `'operator'`, scopes `['operator.admin', 'operator.read', 'operator.write']`, and caps `['tool-events']`. Reference implementation: `D:\Code\whitenote\src\lib\openclaw\gateway.ts`.

**Connection lifecycle**: `electron/ipc/openclaw.js` owns a singleton WS client. Reconnects must safely terminate any previous socket, clear pending connect challenge timers, reject pending requests, and attach a no-op `error` handler before closing/terminating old sockets. Otherwise `ws` can throw an uncaught main-process error like "WebSocket was closed before the connection was established."

**Methods**: Chat uses `chat.send` with `{ sessionKey, message, deliver: false, attachments, idempotencyKey }` and `chat.history` with `{ sessionKey, limit }`. Sessions use `sessions.list`, `sessions.patch`, and `sessions.delete`; do not use older `chat.session.*` method names. New local sessions are represented with generated keys like `agent:main:custom:<timestamp>-<random>` and then labelled via `sessions.patch`.

**Streaming**: Chat events arrive as `{ type: 'event', event: 'chat', payload: { sessionKey, state, message } }`. `state` can be `'delta'` (partial), `'final'` (complete), `'error'`, `'aborted'`. Message `content` is an array of typed blocks (`text`, `thinking`, `tool_use`). Some events use `errorMessage` rather than `error`; handle both.

**Renderer**: `openclawService.js` manages streaming via `onStreamChunk` callback, buffering reasoning/text/tool-call blocks. It normalizes session keys (`key`, `sessionKey`, `id`) and history message roles (`role`, `type`). `OpenClawPanel.jsx` displays thinking blocks (collapsible), tool calls (collapsible), and markdown text. On mount, it queries main process state via `getOpenClawState()` and auto-connects if URL is configured. When connected or when `sessionKey` changes, it loads history with `getOpenClawHistory()`.

**History/display hygiene**: OpenClaw may store raw terminal output as `toolResult` messages or `tool_result` content blocks. These are internal tool artifacts and should not be shown as standalone chat bubbles; filter messages with role `toolResult`/`tool` or `toolCallId`, and ignore `tool_result` blocks. Text and thinking content should be sanitized for ANSI/VT escape sequences, including degraded leftovers such as `[32;1m` and `[0m`, before rendering.

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
