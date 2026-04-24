# Todo

## In Progress

## Backlog
- [ ] Unit tests for context/profile CRUD store layer
- [ ] e2e test: launch a context browser and verif/ it opens

## Done

- [x] Project scaffolding (Electron + React + TypeScript + Vite via electron-vite)
- [x] Playwright installed, Chromium-only via browserManager
- [x] Shared IPC channel types (`src/shared/ipc.ts`)
- [x] Shared type definitions — Workflow, ContextBrowserConfig, Profile (`src/shared/types.ts`)
- [x] Context Browser config CRUD (`src/main/store/contextStore.ts`)
- [x] Profile CRUD (`src/main/store/profileStore.ts`)
- [x] Workflow CRUD (`src/main/store/workflowStore.ts`)
- [x] Automation workflow engine — JSON step executor with param interpolation (`src/main/automation/workflowExecutor.ts`)
- [x] BrowserManager — launch/close Playwright BrowserContext per config (`src/main/browser/browserManager.ts`)
- [x] IPC handlers wired in main process
- [x] contextBridge preload with typed window.api (`src/preload/index.ts`)
- [x] Unit tests for workflow param interpolation and step validation (5 tests passing)
- [x] Renderer UI: profile selector, context browser list, launch/close/workflow controls (`src/renderer/src/`)
- [x] Window controls: minimize + always-on-top toggle (IPC chain + `WindowControls` component)
