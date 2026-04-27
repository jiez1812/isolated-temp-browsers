# Code Review — isolated-temp-browsers

**Date:** 2026-04-25  
**Reviewer:** Senior Code Review (Claude)  
**Scope:** Full codebase — main process, stores, IPC handlers, automation engine, renderer UI, tests

---

## Executive Summary

The codebase is clean and well-structured for a demo tooling app. The architecture respects Electron security principles (contextBridge, no nodeIntegration), the IPC channel map is properly typed, and the React layer is lean. Three issues are severe enough to cause real production pain — a process leak on exit, a path traversal hole in the file stores, and several broken unit tests. These should be fixed before shipping.

**2026-04-25 update:** All 8 priority fixes have been applied and verified.

---

## Critical

### 1. Chromium processes orphaned on app exit
**File:** `src/main/index.ts:44-46`

`app.on('window-all-closed', () => app.quit())` exits without calling `browserManager.closeAll()`. Every launched Playwright context runs a separate Chromium child process; these are left running after the Electron window closes.

```ts
// Fix
app.on('window-all-closed', async () => {
  await browserManager.closeAll()
  app.quit()
})
```

---

### 2. Path traversal vulnerability in all three stores
**Files:** `src/main/store/contextStore.ts:12`, `src/main/store/profileStore.ts:12`, `src/main/store/workflowStore.ts:12`

The `id` field from IPC (untrusted renderer input) is written directly into a file path:

```ts
const filePath = (id: string): string => join(dir(), `${id}.json`)
```

A crafted id like `../../AppData/Roaming/SomeApp/evil` traverses out of the intended directory.

```ts
// Fix — validate before use
import { basename } from 'path'
const filePath = (id: string): string => {
  const safe = basename(id).replace(/[^a-zA-Z0-9_-]/g, '')
  if (!safe) throw new Error(`Invalid id: ${id}`)
  return join(dir(), `${safe}.json`)
}
```

---

### 3. Broken test mocks — wrong event shape
**File:** `Test/auto-run.test.ts:53`

Five of the six tests pass `mockSender()` as the full IPC event object:

```ts
await handlers.get('context:launch')!(mockSender(), 'ctx-1')
//                                    ^^^^^^^^^^^^
//  mockSender() = { send: vi.fn() } — has no `.sender` property
```

The handler immediately calls `dbg(event.sender, ...)` → `dbg(undefined, ...)` → `undefined.send(...)` → **TypeError**. Only the test at line 128 gets it right with `{ sender }`. All five affected tests are silently broken.

```ts
// Fix — everywhere mockSender() is used as the event arg
const sender = mockSender()
await handlers.get('context:launch')!({ sender }, 'ctx-1')
```

Additionally, the assertion at line 100 expects 5 arguments but the actual call passes 6 (the debug callback):

```ts
// Fix — add the 6th argument
expect(workflowExecutor.run).toHaveBeenCalledWith(
  workflow, fakeContext, { user: 'alice' }, expect.any(Function), 'ctx-1', expect.any(Function)
)
```

---

## High

### 4. "Set Workflow" picker in no-workflow state is a silent no-op
**File:** `src/renderer/src/components/ContextCard.tsx:217`

When a card has no workflow attached, selecting from the picker calls `setShowWorkflowPicker(false)` but never `onSetWorkflow`. The selection is never persisted.

```tsx
// Bug
onChange={e => { if (e.target.value) { setShowWorkflowPicker(false); } }}

// Fix
onChange={e => {
  if (e.target.value) {
    onSetWorkflow(e.target.value)
    setShowWorkflowPicker(false)
  }
}}
```

---

### 5. Double `contextStore.load()` per launch
**Files:** `src/main/browser/browserManager.ts:27` & `src/main/ipc/contextHandlers.ts:28`

`browserManager.launch()` loads the config internally, then `contextHandlers.ts` loads it again immediately after. The two reads are not guaranteed to return the same data if the file is modified between calls. Pass the already-loaded config through rather than re-reading.

---

### 6. Non-atomic launch guard
**File:** `src/main/browser/browserManager.ts:25-86`

```ts
if (this.running.has(configId)) return  // guard checked here
// ... many awaits ...
this.running.set(configId, { context, configId })  // set 60+ lines later
```

Two concurrent launch invocations for the same `configId` both pass the guard before either sets the Map entry. The first context is leaked. Add an in-flight Set:

```ts
private launching = new Set<string>()

async launch(configId: string, sender: WebContents): Promise<void> {
  if (this.running.has(configId) || this.launching.has(configId)) return
  this.launching.add(configId)
  try { /* ... */ } finally { this.launching.delete(configId) }
}
```

---

## Medium

### 7. No URL scheme validation
**File:** `src/renderer/src/components/AddContextModal.tsx:36-37`

`startupUrl` is checked only for non-empty. A user can enter `file:///C:/Windows/System32/` or `javascript:...`. Add a minimal scheme check:

```ts
const isValidUrl = (u: string) => /^https?:\/\//i.test(u.trim())
```

---

### 8. Synchronous I/O blocks Electron's main process event loop
**Files:** `src/main/store/` (all three stores)

All stores use `readFileSync`/`writeFileSync`/`readdirSync`. `list()` reads every file synchronously on every IPC call. Fine today, but stalls the UI as the folder grows. Consider `fs/promises` at a minimum for `list()`.

---

### 9. Cascade window index never reclaimed on individual close
**File:** `src/main/browser/browserManager.ts:31-32`

`nextWindowIndex` increments on every launch and only resets in `closeAll()`. After 8 individual open-close cycles, new windows overlap existing slots. Track free slots in a `Set` and reclaim them on close.

---

### 10. Backward-compatibility gap in `Profile.workflowIds`
**File:** `src/shared/types.ts:43`

`workflowIds` is typed as required (`string[]`), but `App.tsx:99` and `App.tsx:224` guard it with `?? []`. Existing serialized profiles without this field would silently fail the type cast. Either mark it optional in the interface or add a migration in `profileStore.load()`.

---

### 11. Keyboard shortcuts shown but not wired
**File:** `src/renderer/src/App.tsx:306-315`

The UI renders `Ctrl 1` / `Ctrl 2` badge hints on the tabs but there is no `keydown` listener anywhere. Either wire the handler or remove the badges.

```ts
// Example fix in App.tsx useEffect
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === '1') setActiveTab('browsers')
    if (e.ctrlKey && e.key === '2') setActiveTab('workflows')
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [])
```

---

## Low

### 12. Profile deletion leaves orphaned context JSON files
**File:** `src/main/ipc/profileHandlers.ts:8`

Deleting a profile removes the profile file but not the context configs it referenced. The `contexts/` directory accumulates unreferenced JSON files.

```ts
// Fix
ipcMain.handle(IPC.PROFILE_DELETE, (_e, id: string) => {
  const profile = profileStore.load(id)
  profile?.contextIds.forEach(cid => contextStore.delete(cid))
  profileStore.delete(id)
})
```

---

### 13. Misleading component name: `WorkflowManagerModal`
**File:** `src/renderer/src/components/WorkflowManagerModal.tsx:11`

The component renders as an inline panel in `app-body`, not as a modal overlay. The "Modal" suffix implies a dialog. Rename to `WorkflowPanel` to match the actual rendered structure and CSS class names (`.workflow-panel`).

---

### 14. Test coverage gaps
**Directory:** `Test/`

Current coverage: param interpolation, step validation, drag-and-drop reorder, auto-run IPC logic.

Missing:
- Profile CRUD (create, load, delete, deduplication)
- Context CRUD (save, load, list)
- Workflow store (save, delete)
- `browserManager.launch()` happy path and concurrent-launch guard
- `ContextCard` workflow picker (both branches — with and without existing workflow)

---

## Positive Highlights

- `contextBridge` preload is well-typed with clean unsubscription return types for all event listeners.
- `IPC` constant map as a `const` object with derived `IpcChannel` union type eliminates string drift between main and renderer.
- `addInitScript` uses `JSON.stringify` for interpolating user-provided name and color, correctly avoiding script injection.
- `WorkflowExecutor.buildStepLabel` masks sensitive params with `••••••` in debug output — good security hygiene.
- Drag-and-drop `pendingIds` optimistic UI pattern is clean; `prevContextsRef` reconciliation prevents stale renders after server confirmation.
- `workflowExecutor.run` throws after emitting the `error` status event, giving callers a choice to handle or ignore — good design.

---

## Prioritized Fix Order

| Priority | Issue | File | Effort | Status |
|----------|-------|------|--------|--------|
| 1 | Orphaned Chromium on exit | `src/main/index.ts` | Trivial | ✅ Fixed |
| 2 | Path traversal in stores | `src/main/store/*.ts` | Small | ✅ Fixed |
| 3 | Broken test mocks | `Test/auto-run.test.ts` | Small | ✅ Fixed |
| 4 | ContextCard "Set Workflow" no-op | `src/renderer/src/components/ContextCard.tsx` | Trivial | ✅ Fixed |
| 5 | Non-atomic launch guard | `src/main/browser/browserManager.ts` | Small | ✅ Fixed |
| 6 | URL scheme validation | `src/renderer/src/components/AddContextModal.tsx` | Trivial | ✅ Fixed |
| 7 | Wire Ctrl+1/2 keyboard shortcuts | `src/renderer/src/App.tsx` | Small | ✅ Fixed |
| 8 | Profile delete cascade | `src/main/ipc/profileHandlers.ts` | Small | ✅ Fixed |

### Remaining open (not in priority list)

| # | Issue | File | Severity |
|---|-------|------|----------|
| 5 | Double `contextStore.load()` per launch | `src/main/ipc/contextHandlers.ts:28` | High |
| 8 | Synchronous I/O in all stores | `src/main/store/*.ts` | Medium |
| 9 | Window index never reclaimed on individual close | `src/main/browser/browserManager.ts` | Medium |
| 10 | `Profile.workflowIds` backward-compat gap | `src/shared/types.ts` | Medium |
| 13 | Misleading `WorkflowManagerModal` name | `src/renderer/src/components/WorkflowManagerModal.tsx` | Low |
| 14 | Test coverage gaps (stores, browserManager, ContextCard) | `Test/` | Low |
