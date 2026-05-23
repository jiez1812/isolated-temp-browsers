import { app } from 'electron'
import { basename, isAbsolute, join, relative, resolve } from 'path'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import type { AppSettings, AppSettingsPatch } from '../../shared/types'

interface PersistedSettings {
  customDataRoot?: string | null
  debugConsoleOpenByDefault?: boolean
}

export const APP_DATA_DIR_NAMES = ['profiles', 'contexts', 'workflows'] as const

const DEFAULT_DEBUG_CONSOLE_OPEN = true

function defaultDataRoot(): string {
  return app.getPath('userData')
}

function settingsPath(): string {
  const root = defaultDataRoot()
  if (!existsSync(root)) mkdirSync(root, { recursive: true })
  return join(root, 'settings.json')
}

function readPersisted(): PersistedSettings {
  const file = settingsPath()
  if (!existsSync(file)) return {}

  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as PersistedSettings
  } catch {
    return {}
  }
}

function writePersisted(settings: PersistedSettings): void {
  writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
}

function normalizePath(p: string): string {
  return resolve(p)
}

function comparePath(p: string): string {
  return normalizePath(p).toLowerCase()
}

function isPathInside(child: string, parent: string): boolean {
  const rel = relative(normalizePath(parent), normalizePath(child))
  return !!rel && !rel.startsWith('..') && !isAbsolute(rel)
}

function hydrate(persisted: PersistedSettings): AppSettings {
  const fallbackRoot = defaultDataRoot()
  const customDataRoot = persisted.customDataRoot?.trim()
    ? normalizePath(persisted.customDataRoot)
    : null

  return {
    dataRoot: customDataRoot ?? fallbackRoot,
    defaultDataRoot: fallbackRoot,
    customDataRoot,
    debugConsoleOpenByDefault:
      persisted.debugConsoleOpenByDefault ?? DEFAULT_DEBUG_CONSOLE_OPEN,
  }
}

function ensureDataFolders(root: string): void {
  for (const name of APP_DATA_DIR_NAMES) {
    const dir = join(root, name)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }
}

function assertSafeMigrationTarget(targetRoot: string, currentRoot: string): void {
  if (basename(targetRoot).trim() === '') {
    throw new Error('Choose a valid folder for app data.')
  }

  if (isPathInside(targetRoot, currentRoot)) {
    throw new Error('Choose a folder outside the current app data folder.')
  }

  if (!existsSync(targetRoot)) return

  const entries = readdirSync(targetRoot)
  if (entries.length > 0) {
    throw new Error('Choose an empty folder for the new app data location.')
  }
}

function copyDataRoot(currentRoot: string, targetRoot: string): void {
  if (!existsSync(targetRoot)) mkdirSync(targetRoot, { recursive: true })

  for (const name of APP_DATA_DIR_NAMES) {
    const source = join(currentRoot, name)
    const target = join(targetRoot, name)

    if (existsSync(source)) {
      cpSync(source, target, { recursive: true })
    } else if (!existsSync(target)) {
      mkdirSync(target, { recursive: true })
    }
  }
}

export const settingsStore = {
  load(): AppSettings {
    return hydrate(readPersisted())
  },

  getDataRoot(): string {
    return this.load().dataRoot
  },

  getDefaultDataRoot(): string {
    return defaultDataRoot()
  },

  getDataDir(name: (typeof APP_DATA_DIR_NAMES)[number]): string {
    const dir = join(this.getDataRoot(), name)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    return dir
  },

  save(patch: AppSettingsPatch): AppSettings {
    const current = readPersisted()
    const next: PersistedSettings = { ...current }

    if ('customDataRoot' in patch) {
      next.customDataRoot = patch.customDataRoot?.trim()
        ? normalizePath(patch.customDataRoot)
        : null
    }

    if ('debugConsoleOpenByDefault' in patch) {
      next.debugConsoleOpenByDefault = patch.debugConsoleOpenByDefault
    }

    writePersisted(next)
    const settings = hydrate(next)
    ensureDataFolders(settings.dataRoot)
    return settings
  },

  changeDataRoot(targetRoot: string): AppSettings {
    const target = normalizePath(targetRoot)
    const current = this.load()
    const currentRoot = normalizePath(current.dataRoot)

    if (comparePath(target) === comparePath(currentRoot)) return current

    assertSafeMigrationTarget(target, currentRoot)
    copyDataRoot(currentRoot, target)

    return this.save({ customDataRoot: target })
  },

  resetDataRoot(): AppSettings {
    return this.save({ customDataRoot: null })
  },
}
