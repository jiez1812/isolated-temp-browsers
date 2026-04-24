# Product Requirements — isolated-temp-browsers

## Purpose

A Windows desktop launcher that manages isolated Playwright browser contexts, enabling live SaaS demos where multiple users interact simultaneously in separate, persistent sessions.

## Core Features

### F1 — Automation Workflow
- Define reusable workflows as JSON step sequences (goto, fill, click, wait, assert)
- Parameterised steps: each workflow accepts a named parameter map at runtime
- Workflow status (running / success / error) streamed to UI in real time

### F2 — Context Browser Configuration
- Create/edit/delete named browser contexts
- Fields: name, startup URL, window size (W×H), linked workflow + params
- Each context is stored as an individual JSON file in userData

### F3 — Profile
- Group multiple Context Browser Configurations under a named profile
- Load/switch profiles without restarting the app
- Export/import profile JSON for sharing between machines

### F4 — Window & UI
- Electron shell, Windows-only build target
- Dashboard listing all contexts in the active profile
- Per-context: Launch / Close / Run Workflow buttons
- Toast/notification system for workflow events
- Global window controls (minimize, always-on-top toggle)

## Non-Goals

- macOS / Linux support
- Cloud sync
- Recording new workflows via browser interaction (record-and-playback)
