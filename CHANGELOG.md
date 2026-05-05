# Changelog

All notable changes to GoldieRillChat will be documented in this file.

## [Unreleased] — Refactoring (Phase 0)

### Removed
- Speech recognition backend: `speech_server.py`, `speech_server.exe`, `speech_server.spec`, `test_mic.py`, related scripts
- Speech-related Node.js scripts: `start_speech.js`, `check_dependencies.js`, `test_flask_server.js`
- Speech-related batch files: `setup_python_env.bat`, `update_python_env.bat`, `start_server.bat`
- Python dependencies file `requirements.txt` (was solely for speech recognition)
- Speech UI component: `src/modules/SpeechRecognition.jsx`
- Backup files: `speech_server.py.bak`, `SettingsModal.jsx.bak`, `searchService.js.bak`

### Added
- ESLint 9 flat config (`eslint.config.js`) with React + React Hooks rules
- Prettier config (`.prettierrc`) — single quotes, 100-char width
- Vitest config (`vitest.config.js`) with jsdom environment and React Testing Library
- TypeScript config (`tsconfig.json`) — lenient `strict: false`, ready for gradual TS adoption
- Test setup file (`src/test/setup.js`)
- `npm run lint` / `npm run test` / `npm run test:watch` / `npm run typecheck` scripts

### Changed
- `.gitignore`: added `*.bak` and `*.tmp` patterns
- Removed speech-related npm scripts (`start:speech`, `speech:setup`, `test:flask`, `setup:python`, `update:python`)
