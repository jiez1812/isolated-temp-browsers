# Isolated Temp Browsers

A Windows desktop app for launching and managing isolated Playwright browser contexts — useful for simulating multiple concurrent users in SaaS demos, QA, and testing scenarios.

Each browser context gets its own cookies, local storage, and session, so user A and user B never bleed into each other.

---

## Overview

**Isolated Temp Browsers** is an Electron app backed by Playwright. You group browser contexts into **Profiles**, define reusable **Automation Workflows**, and launch them all with one click. A compact Mini View keeps the launcher out of the way while your demo browsers run.

Key features:

- Launch multiple isolated browser contexts side-by-side (Edge, Chrome, or Firefox)
- Organize contexts into named Profiles; switch profiles without restarting
- Automate login or setup steps with Workflow sequences (goto, fill, click, wait, assert)
- Export and import profiles as YAML for sharing or backup
- Mini View: compact floating panel for quick toggle while demoing

---

## Prerequisites

| Requirement | Version |
|---|---|
| OS | Windows 10/11 (x64) |
| Node.js | 18 or later |
| pnpm | 10.x (`npm i -g pnpm`) |
| Browser | Microsoft Edge, Google Chrome, or Firefox — at least one must be installed |

> The app auto-detects which browsers are available on launch.

---

## Installation

```powershell
# Clone the repo
git clone <repo-url>
cd isolated-temp-browsers

# Install dependencies (also downloads Electron and esbuild binaries)
pnpm install
```

---

## Development

Start the app in development mode with hot-reload:

```powershell
pnpm dev
```

- The renderer (React UI) reloads automatically on file changes.
- The main process restarts when main-process files change.
- DevTools open via **F12** in the renderer window.

Run the test suite:

```powershell
pnpm test          # single run
pnpm test:watch    # watch mode
```

### Project structure

```
src/
  main/           # Electron main process — app entry, IPC handlers, browser lifecycle
  preload/        # contextBridge preload (typed window.api surface)
  renderer/       # React + TypeScript UI
  automation/     # Workflow step executor (Playwright actions)
  context/        # Context browser config schema and CRUD
  profile/        # Profile schema and CRUD
  shared/         # Types and IPC channel names shared between main and renderer
Test/             # Unit and integration tests
Document/
  Todo.md         # Active task list
  PRD.md          # Product requirements
```

### Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + 1` | Switch to Browsers tab |
| `Ctrl + 2` | Switch to Workflows tab |

---

## Build

### Development preview

```powershell
pnpm preview
```

### Bundle only (no installer)

```powershell
pnpm build
# Output: out/
```

### Full Windows installer + portable exe

```powershell
pnpm dist:win
# Output: dist/
#   Isolated Temp Browsers Setup <version>.exe   ← NSIS installer
#   Isolated Temp Browsers-<version>-portable.exe
```

Both targets are x64 only. The NSIS installer supports custom install directory, desktop shortcut, and Start Menu shortcut. The portable exe runs without installation.

---

## User Guide

### Profiles

A **Profile** is a named collection of browser contexts and workflows.

1. Click the **Profile** dropdown in the titlebar and select **New profile**.
2. Give it a name (e.g. "Sales Demo – APAC").
3. Switch between profiles at any time from the same dropdown — running browsers are not affected.

**Export / Import:** Use the **Export** button in the tab bar to save a profile as a `.yaml` file. Import it on another machine via the Profile dropdown → **Import**. The importer detects name conflicts and lets you rename or replace.

### Context Browsers

A **Context Browser** is a single isolated browser window tied to a startup URL.

1. With a profile selected, click **Add Context** (or the `+` button).
2. Fill in:
   - **Name** — display label
   - **URL** — where the browser opens on launch
   - **Browser** — Edge, Chrome, or Firefox (only installed browsers shown)
   - **Window size** — width × height in pixels
   - **Color** — optional accent color for the card
3. Click **Launch** on any card to open that context, or **Launch All** to open every context in the profile at once.
4. Click **Close** or **Close All** to shut them down.

### Automation Workflows

A **Workflow** is a named sequence of Playwright steps that runs inside a context browser.

Supported step types:

| Step | Purpose |
|---|---|
| `goto` | Navigate to a URL |
| `fill` | Type text into a selector |
| `click` | Click a selector |
| `wait` | Wait for a selector or timeout |
| `assert` | Assert a selector is visible |

**Create a workflow:**

1. Switch to the **Workflows** tab (`Ctrl + 2`).
2. Click **New Workflow**, name it, and add steps.
3. Define **params** for values that change per-context (e.g. `username`, `password`).

**Attach to a context:**

1. Open a context card and choose a workflow from the dropdown.
2. Fill in any param values for that context.
3. Enable **Auto-run on launch** to execute the workflow automatically when the browser opens.
4. Or click **Run** manually at any time from the card.

### Mini View

Click the collapse button (top-right of the titlebar) to enter **Mini View** — a compact floating panel showing all contexts as toggle buttons. Click any button to launch or close that browser. Click **Restore** to return to the full UI.

### Data storage

All profiles, contexts, and workflows are saved under:

```
%APPDATA%\isolated-temp-browsers\
```

No account or cloud sync required.

---

<details>
<summary><strong>Architecture</strong></summary>

### Process model

The app follows the standard Electron two-process model:

- **Main process** (`src/main/`) — owns all Playwright `BrowserContext` instances, handles file I/O, and exposes IPC handlers.
- **Renderer process** (`src/renderer/`) — React UI. Communicates with the main process exclusively via a typed `contextBridge` API exposed in `src/preload/index.ts`. `nodeIntegration` is disabled.

All IPC channel names are defined in `src/shared/ipc.ts` and shared by both sides, preventing string drift.

### Four feature domains

| Domain | Path | Responsibility |
|---|---|---|
| Automation | `src/automation/` | Executes workflow steps against a live Playwright `BrowserContext` |
| Context | `src/context/` | `ContextBrowserConfig` schema, CRUD backed by JSON files |
| Profile | `src/profile/` | `Profile` schema — a named list of context IDs and workflow IDs |
| Window / UI | `src/main/` + `src/renderer/` | Electron window management, IPC wiring, React UI |

### IPC flow

```
Renderer (React)
  └─ window.api.*()          ← contextBridge (preload)
       └─ ipcRenderer.invoke / ipcRenderer.on
            └─ ipcMain.handle / webContents.send
                 └─ Main process handlers
                      ├─ contextHandlers.ts   (launch, close, CRUD)
                      ├─ profileHandlers.ts   (list, save, delete, export, import)
                      ├─ workflowHandlers.ts  (list, save, delete, run)
                      └─ windowHandlers.ts    (minimize, always-on-top, mini mode)
```

Workflow status events are pushed from main to renderer via `webContents.send(IPC.WORKFLOW_STATUS, ...)` and surfaced as toast notifications.

### Data format

Profiles, contexts, and workflows are stored as individual JSON files under `%APPDATA%\isolated-temp-browsers\`. Exported profiles use a portable YAML format (`version: '1.0'`) with workflow steps inlined and IDs replaced by name references so files are transferable across machines.

</details>
