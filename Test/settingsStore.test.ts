import { describe, it, expect, vi, beforeEach } from 'vitest'

const fsFiles: Record<string, string> = {}
const fsDirs = new Set<string>()

function norm(p: string): string {
  return p.replace(/\//g, '\\')
}

function parentDir(p: string): string {
  return norm(p).replace(/\\[^\\]+$/, '')
}

function hasChild(dir: string): boolean {
  const prefix = norm(dir).replace(/\\$/, '') + '\\'
  return Object.keys(fsFiles).some(p => norm(p).startsWith(prefix)) ||
    Array.from(fsDirs).some(p => norm(p).startsWith(prefix))
}

function clearFs() {
  for (const key of Object.keys(fsFiles)) delete fsFiles[key]
  fsDirs.clear()
}

function listDir(dir: string): string[] {
  const prefix = norm(dir).replace(/\\$/, '') + '\\'
  const names = new Set<string>()

  for (const key of Object.keys(fsFiles)) {
    const path = norm(key)
    if (path.startsWith(prefix)) names.add(path.slice(prefix.length).split('\\')[0])
  }

  for (const key of fsDirs) {
    const path = norm(key)
    if (path.startsWith(prefix)) names.add(path.slice(prefix.length).split('\\')[0])
  }

  return Array.from(names)
}

vi.mock('fs', () => ({
  existsSync: (p: string) => {
    const path = norm(p)
    return Object.prototype.hasOwnProperty.call(fsFiles, path) ||
      fsDirs.has(path) ||
      hasChild(path)
  },
  mkdirSync: (p: string) => {
    fsDirs.add(norm(p))
  },
  readdirSync: (p: string) => listDir(p),
  readFileSync: (p: string) => {
    const path = norm(p)
    if (!Object.prototype.hasOwnProperty.call(fsFiles, path)) throw new Error(`ENOENT: ${path}`)
    return fsFiles[path]
  },
  writeFileSync: (p: string, data: string) => {
    const path = norm(p)
    fsDirs.add(parentDir(path))
    fsFiles[path] = data
  },
  cpSync: (source: string, target: string) => {
    const sourcePrefix = norm(source).replace(/\\$/, '') + '\\'
    const targetRoot = norm(target).replace(/\\$/, '')

    fsDirs.add(targetRoot)
    for (const [path, content] of Object.entries(fsFiles)) {
      const normalized = norm(path)
      if (!normalized.startsWith(sourcePrefix)) continue
      const copiedPath = `${targetRoot}\\${normalized.slice(sourcePrefix.length)}`
      fsDirs.add(parentDir(copiedPath))
      fsFiles[copiedPath] = content
    }
  },
}))

vi.mock('electron', () => ({
  app: { getPath: (_name: string) => 'C:\\AppData' }
}))

import { settingsStore } from '../src/main/store/settingsStore'

describe('settingsStore', () => {
  beforeEach(clearFs)

  it('loads default settings from Electron userData', () => {
    expect(settingsStore.load()).toEqual({
      dataRoot: 'C:\\AppData',
      defaultDataRoot: 'C:\\AppData',
      customDataRoot: null,
      debugConsoleOpenByDefault: true,
    })
  })

  it('saves and reloads persisted settings', () => {
    settingsStore.save({
      customDataRoot: 'D:\\ProfileData',
      debugConsoleOpenByDefault: false,
    })

    expect(settingsStore.load()).toMatchObject({
      dataRoot: 'D:\\ProfileData',
      customDataRoot: 'D:\\ProfileData',
      debugConsoleOpenByDefault: false,
    })
  })

  it('resolves data directories from the active data root', () => {
    settingsStore.save({ customDataRoot: 'D:\\ProfileData' })
    expect(settingsStore.getDataDir('profiles')).toBe('D:\\ProfileData\\profiles')
  })

  it('copies existing app data when changing root and leaves the old root intact', () => {
    fsFiles['C:\\AppData\\profiles\\prof-1.json'] = '{"id":"prof-1"}'
    fsFiles['C:\\AppData\\contexts\\ctx-1.json'] = '{"id":"ctx-1"}'
    fsFiles['C:\\AppData\\workflows\\wf-1.json'] = '{"id":"wf-1"}'

    const settings = settingsStore.changeDataRoot('D:\\NewProfileData')

    expect(settings.customDataRoot).toBe('D:\\NewProfileData')
    expect(fsFiles['D:\\NewProfileData\\profiles\\prof-1.json']).toBe('{"id":"prof-1"}')
    expect(fsFiles['D:\\NewProfileData\\contexts\\ctx-1.json']).toBe('{"id":"ctx-1"}')
    expect(fsFiles['D:\\NewProfileData\\workflows\\wf-1.json']).toBe('{"id":"wf-1"}')
    expect(fsFiles['C:\\AppData\\profiles\\prof-1.json']).toBe('{"id":"prof-1"}')
  })

  it('rejects non-empty migration targets', () => {
    fsFiles['D:\\Target\\notes.txt'] = 'keep'

    expect(() => settingsStore.changeDataRoot('D:\\Target')).toThrow(/empty folder/)
  })

  it('rejects migration targets inside the current data root', () => {
    expect(() => settingsStore.changeDataRoot('C:\\AppData\\profiles\\nested')).toThrow(/outside/)
  })
})
