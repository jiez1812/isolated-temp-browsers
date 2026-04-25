import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ContextBrowserConfig, Workflow } from '../src/shared/types'
import type { WorkflowStatusEvent } from '../src/shared/ipc'

// Mock all side-effect-heavy modules before importing the handler
vi.mock('../src/main/store/contextStore', () => ({
  contextStore: { load: vi.fn(), list: vi.fn(), save: vi.fn(), delete: vi.fn() }
}))
vi.mock('../src/main/store/workflowStore', () => ({
  workflowStore: { load: vi.fn() }
}))
vi.mock('../src/main/browser/browserManager', () => ({
  browserManager: { launch: vi.fn(), close: vi.fn(), getContext: vi.fn() }
}))
vi.mock('../src/main/automation/workflowExecutor', () => ({
  workflowExecutor: { run: vi.fn() }
}))

import { contextStore } from '../src/main/store/contextStore'
import { workflowStore } from '../src/main/store/workflowStore'
import { browserManager } from '../src/main/browser/browserManager'
import { workflowExecutor } from '../src/main/automation/workflowExecutor'
import { registerContextHandlers } from '../src/main/ipc/contextHandlers'

// Helpers
const makeConfig = (overrides: Partial<ContextBrowserConfig> = {}): ContextBrowserConfig => ({
  id: 'ctx-1', name: 'Test', startupUrl: 'https://example.com',
  windowSize: { width: 1280, height: 800 }, ...overrides
})

const makeWorkflow = (): Workflow => ({
  id: 'wf-1', name: 'Login', steps: [], params: []
})

function buildIpc() {
  const handlers = new Map<string, (event: any, ...args: any[]) => any>()
  const ipcMain = { handle: vi.fn((ch: string, fn: any) => handlers.set(ch, fn)) }
  return { ipcMain, handlers }
}

const mockSender = () => ({ send: vi.fn() })

describe('auto-run workflow on launch', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('does NOT run workflow when runWorkflowOnLaunch is false', async () => {
    const { ipcMain, handlers } = buildIpc()
    registerContextHandlers(ipcMain as any)

    vi.mocked(browserManager.launch).mockResolvedValue(undefined)
    vi.mocked(contextStore.load).mockReturnValue(makeConfig({ workflowId: 'wf-1', runWorkflowOnLaunch: false }))

    await handlers.get('context:launch')!({ sender: mockSender() }, 'ctx-1')

    expect(workflowExecutor.run).not.toHaveBeenCalled()
  })

  it('does NOT run workflow when workflowId is missing', async () => {
    const { ipcMain, handlers } = buildIpc()
    registerContextHandlers(ipcMain as any)

    vi.mocked(browserManager.launch).mockResolvedValue(undefined)
    vi.mocked(contextStore.load).mockReturnValue(makeConfig({ runWorkflowOnLaunch: true }))

    await handlers.get('context:launch')!({ sender: mockSender() }, 'ctx-1')

    expect(workflowExecutor.run).not.toHaveBeenCalled()
  })

  it('does NOT run workflow when workflowStore.load returns null', async () => {
    const { ipcMain, handlers } = buildIpc()
    registerContextHandlers(ipcMain as any)

    vi.mocked(browserManager.launch).mockResolvedValue(undefined)
    vi.mocked(contextStore.load).mockReturnValue(makeConfig({ runWorkflowOnLaunch: true, workflowId: 'wf-1' }))
    vi.mocked(workflowStore.load).mockReturnValue(null)
    vi.mocked(browserManager.getContext).mockReturnValue({} as any)

    await handlers.get('context:launch')!({ sender: mockSender() }, 'ctx-1')

    expect(workflowExecutor.run).not.toHaveBeenCalled()
  })

  it('runs workflow with correct args when runWorkflowOnLaunch is true', async () => {
    const { ipcMain, handlers } = buildIpc()
    registerContextHandlers(ipcMain as any)

    const fakeContext = {} as any
    const workflow = makeWorkflow()
    vi.mocked(browserManager.launch).mockResolvedValue(undefined)
    vi.mocked(contextStore.load).mockReturnValue(
      makeConfig({ runWorkflowOnLaunch: true, workflowId: 'wf-1', workflowParams: { user: 'alice' } })
    )
    vi.mocked(workflowStore.load).mockReturnValue(workflow)
    vi.mocked(browserManager.getContext).mockReturnValue(fakeContext)
    vi.mocked(workflowExecutor.run).mockResolvedValue(undefined)

    await handlers.get('context:launch')!({ sender: mockSender() }, 'ctx-1')

    expect(workflowExecutor.run).toHaveBeenCalledWith(
      workflow, fakeContext, { user: 'alice' }, expect.any(Function), 'ctx-1', expect.any(Function)
    )
  })

  it('status callback forwards events with correct contextId', async () => {
    const { ipcMain, handlers } = buildIpc()
    registerContextHandlers(ipcMain as any)

    const sender = mockSender()
    const fakeContext = {} as any
    vi.mocked(browserManager.launch).mockResolvedValue(undefined)
    vi.mocked(contextStore.load).mockReturnValue(
      makeConfig({ runWorkflowOnLaunch: true, workflowId: 'wf-1' })
    )
    vi.mocked(workflowStore.load).mockReturnValue(makeWorkflow())
    vi.mocked(browserManager.getContext).mockReturnValue(fakeContext)

    let capturedCallback: ((e: WorkflowStatusEvent) => void) | undefined
    vi.mocked(workflowExecutor.run).mockImplementation((_wf, _ctx, _params, cb) => {
      capturedCallback = cb
      return Promise.resolve()
    })

    await handlers.get('context:launch')!({ sender }, 'ctx-1')

    const rawEvent: WorkflowStatusEvent = { contextId: '', workflowId: 'wf-1', status: 'running', timestamp: 0 }
    capturedCallback!(rawEvent)

    expect(sender.send).toHaveBeenCalledWith('workflow:status', {
      ...rawEvent,
      contextId: 'ctx-1'
    })
  })

  it('handler still resolves when workflow executor throws', async () => {
    const { ipcMain, handlers } = buildIpc()
    registerContextHandlers(ipcMain as any)

    vi.mocked(browserManager.launch).mockResolvedValue(undefined)
    vi.mocked(contextStore.load).mockReturnValue(
      makeConfig({ runWorkflowOnLaunch: true, workflowId: 'wf-1' })
    )
    vi.mocked(workflowStore.load).mockReturnValue(makeWorkflow())
    vi.mocked(browserManager.getContext).mockReturnValue({} as any)
    vi.mocked(workflowExecutor.run).mockRejectedValue(new Error('step failed'))

    // Should not throw — handler must resolve cleanly
    await expect(handlers.get('context:launch')!({ sender: mockSender() }, 'ctx-1')).resolves.toBeUndefined()
  })
})
