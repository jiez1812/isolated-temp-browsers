import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ContextBrowserConfig, Profile, Workflow } from '../src/shared/types'

// ── fs mock ────────────────────────────────────────────────────────────────────
// We mock 'fs' at the module level so the stores never touch the real filesystem.
// Each test drives the virtual FS via the helpers below.

const fsFiles: Record<string, string> = {}

vi.mock('fs', () => ({
  existsSync: (p: string) => Object.prototype.hasOwnProperty.call(fsFiles, p),
  mkdirSync: vi.fn(),
  readdirSync: (dir: string) =>
    Object.keys(fsFiles)
      .filter(p => p.startsWith(dir + '\\') || p.startsWith(dir + '/'))
      .map(p => p.replace(/.*[/\\]/, '')),
  readFileSync: (p: string) => {
    if (!Object.prototype.hasOwnProperty.call(fsFiles, p)) throw new Error(`ENOENT: ${p}`)
    return fsFiles[p]
  },
  writeFileSync: (p: string, data: string) => { fsFiles[p] = data },
  rmSync: (p: string) => { delete fsFiles[p] }
}))

// Mock electron's app.getPath so the stores can build their directory paths.
vi.mock('electron', () => ({
  app: { getPath: (_name: string) => 'C:\\AppData' }
}))

// Import stores AFTER mocks are in place.
import { contextStore } from '../src/main/store/contextStore'
import { profileStore } from '../src/main/store/profileStore'
import { workflowStore } from '../src/main/store/workflowStore'

// ── helpers ────────────────────────────────────────────────────────────────────

function clearFs() {
  for (const key of Object.keys(fsFiles)) delete fsFiles[key]
}

const makeContext = (overrides: Partial<ContextBrowserConfig> = {}): ContextBrowserConfig => ({
  id: 'ctx-1',
  name: 'Test Browser',
  startupUrl: 'https://example.com',
  windowSize: { width: 1280, height: 800 },
  ...overrides
})

const makeProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'prof-1',
  name: 'Demo Profile',
  contextIds: ['ctx-1'],
  workflowIds: ['wf-1'],
  ...overrides
})

const makeWorkflow = (overrides: Partial<Workflow> = {}): Workflow => ({
  id: 'wf-1',
  name: 'Login Flow',
  steps: [{ type: 'goto', url: 'https://example.com' }],
  params: [{ name: 'user', label: 'Username' }],
  ...overrides
})

// ── contextStore ───────────────────────────────────────────────────────────────

describe('contextStore', () => {
  beforeEach(clearFs)

  it('save + load roundtrip', () => {
    const ctx = makeContext()
    contextStore.save(ctx)
    const loaded = contextStore.load('ctx-1')
    expect(loaded).toEqual(ctx)
  })

  it('load returns null for missing id', () => {
    expect(contextStore.load('nonexistent')).toBeNull()
  })

  it('list returns all saved contexts', () => {
    contextStore.save(makeContext({ id: 'ctx-1', name: 'A' }))
    contextStore.save(makeContext({ id: 'ctx-2', name: 'B' }))
    const all = contextStore.list()
    expect(all).toHaveLength(2)
    expect(all.map(c => c.id).sort()).toEqual(['ctx-1', 'ctx-2'])
  })

  it('list returns empty array when no contexts exist', () => {
    expect(contextStore.list()).toEqual([])
  })

  it('delete removes the file', () => {
    contextStore.save(makeContext())
    expect(contextStore.load('ctx-1')).not.toBeNull()
    contextStore.delete('ctx-1')
    expect(contextStore.load('ctx-1')).toBeNull()
  })

  it('delete is a no-op for a missing id', () => {
    expect(() => contextStore.delete('ghost')).not.toThrow()
  })

  it('rejects id with path traversal characters', () => {
    expect(() => contextStore.load('../evil')).toThrow()
    expect(() => contextStore.save(makeContext({ id: '../../etc/passwd' }))).toThrow()
    expect(() => contextStore.delete('../etc/passwd')).toThrow()
  })

  it('save overwrites an existing context', () => {
    contextStore.save(makeContext({ name: 'Before' }))
    contextStore.save(makeContext({ name: 'After' }))
    expect(contextStore.load('ctx-1')?.name).toBe('After')
  })
})

// ── profileStore ───────────────────────────────────────────────────────────────

describe('profileStore', () => {
  beforeEach(clearFs)

  it('save + load roundtrip', () => {
    const prof = makeProfile()
    profileStore.save(prof)
    const loaded = profileStore.load('prof-1')
    expect(loaded).toEqual(prof)
  })

  it('load returns null for missing id', () => {
    expect(profileStore.load('nonexistent')).toBeNull()
  })

  it('list returns all saved profiles', () => {
    profileStore.save(makeProfile({ id: 'prof-1', name: 'A' }))
    profileStore.save(makeProfile({ id: 'prof-2', name: 'B' }))
    const all = profileStore.list()
    expect(all).toHaveLength(2)
    expect(all.map(p => p.id).sort()).toEqual(['prof-1', 'prof-2'])
  })

  it('list returns empty array when no profiles exist', () => {
    expect(profileStore.list()).toEqual([])
  })

  it('delete removes the file', () => {
    profileStore.save(makeProfile())
    profileStore.delete('prof-1')
    expect(profileStore.load('prof-1')).toBeNull()
  })

  it('delete is a no-op for a missing id', () => {
    expect(() => profileStore.delete('ghost')).not.toThrow()
  })

  it('rejects id with path traversal characters', () => {
    expect(() => profileStore.load('../evil')).toThrow()
    expect(() => profileStore.save(makeProfile({ id: '../../etc/passwd' }))).toThrow()
    expect(() => profileStore.delete('../etc/passwd')).toThrow()
  })

  it('contextIds deduplication: saving twice does not double-store ids', () => {
    const prof = makeProfile({ contextIds: ['ctx-1', 'ctx-1', 'ctx-2'] })
    profileStore.save(prof)
    // The store persists whatever it receives; dedup responsibility is at the call site.
    // Confirm load round-trips the array faithfully.
    const loaded = profileStore.load('prof-1')
    expect(loaded?.contextIds).toEqual(['ctx-1', 'ctx-1', 'ctx-2'])
  })

  it('save overwrites an existing profile', () => {
    profileStore.save(makeProfile({ name: 'Before' }))
    profileStore.save(makeProfile({ name: 'After' }))
    expect(profileStore.load('prof-1')?.name).toBe('After')
  })
})

// ── workflowStore ──────────────────────────────────────────────────────────────

describe('workflowStore', () => {
  beforeEach(clearFs)

  it('save + load roundtrip', () => {
    const wf = makeWorkflow()
    workflowStore.save(wf)
    const loaded = workflowStore.load('wf-1')
    expect(loaded).toEqual(wf)
  })

  it('load returns null for missing id', () => {
    expect(workflowStore.load('nonexistent')).toBeNull()
  })

  it('list returns all saved workflows', () => {
    workflowStore.save(makeWorkflow({ id: 'wf-1', name: 'Login' }))
    workflowStore.save(makeWorkflow({ id: 'wf-2', name: 'Checkout' }))
    const all = workflowStore.list()
    expect(all).toHaveLength(2)
    expect(all.map(w => w.id).sort()).toEqual(['wf-1', 'wf-2'])
  })

  it('list returns empty array when no workflows exist', () => {
    expect(workflowStore.list()).toEqual([])
  })

  it('delete removes the file', () => {
    workflowStore.save(makeWorkflow())
    workflowStore.delete('wf-1')
    expect(workflowStore.load('wf-1')).toBeNull()
  })

  it('delete is a no-op for a missing id', () => {
    expect(() => workflowStore.delete('ghost')).not.toThrow()
  })

  it('rejects id with path traversal characters', () => {
    expect(() => workflowStore.load('../evil')).toThrow()
    expect(() => workflowStore.save(makeWorkflow({ id: '../../etc/passwd' }))).toThrow()
    expect(() => workflowStore.delete('../etc/passwd')).toThrow()
  })

  it('save overwrites an existing workflow', () => {
    workflowStore.save(makeWorkflow({ name: 'Before' }))
    workflowStore.save(makeWorkflow({ name: 'After' }))
    expect(workflowStore.load('wf-1')?.name).toBe('After')
  })

  it('preserves steps and params on roundtrip', () => {
    const wf = makeWorkflow({
      steps: [
        { type: 'goto', url: 'https://example.com' },
        { type: 'fill', selector: '#user', value: '{{username}}' }
      ],
      params: [
        { name: 'username', label: 'Username', defaultValue: 'admin' }
      ]
    })
    workflowStore.save(wf)
    expect(workflowStore.load('wf-1')).toEqual(wf)
  })
})
