import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Workflow, WorkflowStep } from '../src/shared/types'

vi.mock('electron', () => ({
  app: { getPath: () => 'C:\\Downloads' }
}))

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    readdirSync: vi.fn(() => []),
  }
})

import {
  isRetryableStep,
  normalizeRetryCount,
  normalizeRetryDelay,
  workflowExecutor,
} from '../src/main/automation/workflowExecutor'

describe('workflowExecutor param interpolation', () => {
  const resolveParam = (val: string, params: Record<string, string>): string =>
    val.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? '')

  it('replaces known params', () => {
    expect(resolveParam('Hello {{name}}', { name: 'Alice' })).toBe('Hello Alice')
  })

  it('leaves unknown params empty', () => {
    expect(resolveParam('{{unknown}}', {})).toBe('')
  })

  it('replaces multiple params', () => {
    expect(resolveParam('{{user}} / {{pass}}', { user: 'admin', pass: 'secret' })).toBe(
      'admin / secret'
    )
  })
})

describe('waitForDownload step', () => {
  const mockPage = {
    waitForEvent: vi.fn(),
    click: vi.fn(),
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  const runStep = async (step: WorkflowStep) => {
    const timeout = step.timeout ?? 30000
    if (step.selector) {
      await Promise.all([
        mockPage.waitForEvent('download', { timeout }),
        mockPage.click(step.selector),
      ])
    } else {
      await mockPage.waitForEvent('download', { timeout })
    }
  }

  it('waits for download event without selector', async () => {
    mockPage.waitForEvent.mockResolvedValue({})

    await runStep({ type: 'waitForDownload', timeout: 5000 })

    expect(mockPage.waitForEvent).toHaveBeenCalledWith('download', { timeout: 5000 })
  })

  it('clicks selector and waits for download concurrently', async () => {
    mockPage.waitForEvent.mockResolvedValue({})
    mockPage.click.mockResolvedValue(undefined)

    await runStep({ type: 'waitForDownload', selector: '#export-btn', timeout: 10000 })

    expect(mockPage.waitForEvent).toHaveBeenCalledWith('download', { timeout: 10000 })
    expect(mockPage.click).toHaveBeenCalledWith('#export-btn')
  })

  it('uses 30000ms default timeout when none specified', async () => {
    mockPage.waitForEvent.mockResolvedValue({})

    await runStep({ type: 'waitForDownload' })

    expect(mockPage.waitForEvent).toHaveBeenCalledWith('download', { timeout: 30000 })
  })
})

describe('workflowExecutor retry policy', () => {
  const makeWorkflow = (steps: WorkflowStep[], overrides: Partial<Workflow> = {}): Workflow => ({
    id: 'wf-1',
    name: 'Retry Flow',
    params: [],
    steps,
    ...overrides,
  })

  const makeContext = (page: Record<string, unknown>) => ({
    pages: vi.fn(() => [page]),
    newPage: vi.fn(),
    close: vi.fn(),
  })

  const makePage = () => ({
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
    click: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    selectOption: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    waitForFunction: vi.fn().mockResolvedValue(undefined),
    goto: vi.fn().mockResolvedValue(undefined),
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not retry when retryCount is missing', async () => {
    const page = makePage()
    page.click.mockRejectedValueOnce(new Error('not ready'))
    const logs = vi.fn()

    await expect(
      workflowExecutor.run(
        makeWorkflow([{ type: 'click', selector: '#submit' }]),
        makeContext(page) as any,
        {},
        vi.fn(),
        'ctx-1',
        logs
      )
    ).rejects.toThrow('not ready')

    expect(page.click).toHaveBeenCalledTimes(1)
    expect(logs).not.toHaveBeenCalledWith('warn', expect.stringContaining('retry'))
  })

  it('uses workflow-level retry and succeeds on a later attempt', async () => {
    const page = makePage()
    page.click.mockRejectedValueOnce(new Error('covered')).mockResolvedValueOnce(undefined)
    const logs = vi.fn()
    const stepEvents = vi.fn()

    await workflowExecutor.run(
      makeWorkflow([{ type: 'click', selector: '#submit' }], { retryCount: 1, retryDelay: 0 }),
      makeContext(page) as any,
      {},
      vi.fn(),
      'ctx-1',
      logs,
      stepEvents
    )

    expect(page.click).toHaveBeenCalledTimes(2)
    expect(logs).toHaveBeenCalledWith('warn', expect.stringContaining('retry 1/1 after error: covered'))
    expect(stepEvents).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'done' }))
  })

  it('fails after all workflow-level retry attempts are exhausted', async () => {
    const page = makePage()
    page.click.mockRejectedValue(new Error('still failing'))
    const stepEvents = vi.fn()

    await expect(
      workflowExecutor.run(
        makeWorkflow([{ type: 'click', selector: '#submit' }], { retryCount: 2, retryDelay: 0 }),
        makeContext(page) as any,
        {},
        vi.fn(),
        'ctx-1',
        vi.fn(),
        stepEvents
      )
    ).rejects.toThrow('still failing')

    expect(page.click).toHaveBeenCalledTimes(3)
    expect(stepEvents).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'error' }))
  })

  it('uses workflow-level retryDelay between attempts', async () => {
    const page = makePage()
    page.fill.mockRejectedValueOnce(new Error('detached')).mockResolvedValueOnce(undefined)

    await workflowExecutor.run(
      makeWorkflow([{ type: 'fill', selector: '#name', value: 'Ada' }], { retryCount: 1, retryDelay: 250 }),
      makeContext(page) as any,
      {},
      vi.fn()
    )

    expect(page.waitForTimeout).toHaveBeenCalledWith(250)
  })

  it('applies workflow-level retry across retryable steps', async () => {
    const page = makePage()
    page.fill.mockRejectedValueOnce(new Error('fill detached')).mockResolvedValueOnce(undefined)
    page.click.mockRejectedValueOnce(new Error('click covered')).mockResolvedValueOnce(undefined)

    await workflowExecutor.run(
      makeWorkflow([
        { type: 'fill', selector: '#name', value: 'Ada' },
        { type: 'click', selector: '#submit' },
      ], { retryCount: 1, retryDelay: 0 }),
      makeContext(page) as any,
      {},
      vi.fn()
    )

    expect(page.fill).toHaveBeenCalledTimes(2)
    expect(page.click).toHaveBeenCalledTimes(2)
  })

  it('ignores workflow-level retry for waitSeconds', async () => {
    const page = makePage()
    page.waitForTimeout.mockRejectedValueOnce(new Error('timer failed'))

    await expect(
      workflowExecutor.run(
        makeWorkflow([{ type: 'waitSeconds', timeout: 1000 }], { retryCount: 2, retryDelay: 100 }),
        makeContext(page) as any,
        {},
        vi.fn()
      )
    ).rejects.toThrow('timer failed')

    expect(page.waitForTimeout).toHaveBeenCalledTimes(1)
    expect(page.waitForTimeout).toHaveBeenCalledWith(1000)
  })

  it('ignores workflow-level retry for closeBrowser', async () => {
    const page = makePage()
    const context = makeContext(page)
    context.close.mockRejectedValueOnce(new Error('close failed'))

    await expect(
      workflowExecutor.run(
        makeWorkflow([{ type: 'closeBrowser' }], { retryCount: 2, retryDelay: 100 }),
        context as any,
        {},
        vi.fn()
      )
    ).rejects.toThrow('close failed')

    expect(context.close).toHaveBeenCalledTimes(1)
  })

  it('honors legacy step-level retry when workflow retry is absent', async () => {
    const page = makePage()
    page.click.mockRejectedValueOnce(new Error('covered')).mockResolvedValueOnce(undefined)

    await workflowExecutor.run(
      makeWorkflow([{ type: 'click', selector: '#submit', retryCount: 1, retryDelay: 0 }]),
      makeContext(page) as any,
      {},
      vi.fn()
    )

    expect(page.click).toHaveBeenCalledTimes(2)
  })

  it('workflow-level retry overrides legacy step-level retry', async () => {
    const page = makePage()
    page.click.mockRejectedValue(new Error('still failing'))

    await expect(
      workflowExecutor.run(
        makeWorkflow(
          [{ type: 'click', selector: '#submit', retryCount: 5, retryDelay: 0 }],
          { retryCount: 1, retryDelay: 0 }
        ),
        makeContext(page) as any,
        {},
        vi.fn()
      )
    ).rejects.toThrow('still failing')

    expect(page.click).toHaveBeenCalledTimes(2)
  })

  it('normalizes retry metadata', () => {
    expect(isRetryableStep({ type: 'click', selector: '#submit' })).toBe(true)
    expect(isRetryableStep({ type: 'waitSeconds', retryCount: 5 })).toBe(false)
    expect(isRetryableStep({ type: 'closeBrowser', retryCount: 5 })).toBe(false)
    expect(isRetryableStep({ type: 'goto', url: 'https://example.com' })).toBe(false)
    expect(isRetryableStep({ type: 'goto', url: 'https://example.com', retryCount: 1 })).toBe(true)
    expect(isRetryableStep({ type: 'goto', url: 'https://example.com' }, true)).toBe(true)
    expect(normalizeRetryCount({ type: 'click', retryCount: 99 })).toBe(10)
    expect(normalizeRetryCount({ type: 'click', retryCount: -1 })).toBe(0)
    expect(normalizeRetryDelay({ type: 'click' })).toBe(500)
    expect(normalizeRetryDelay({ type: 'click', retryDelay: 12.8 })).toBe(12)
  })
})

describe('workflow step validation', () => {
  const validWorkflow: Workflow = {
    id: 'wf-1',
    name: 'Login',
    params: [{ name: 'user', label: 'Username' }],
    steps: [
      { type: 'goto', url: 'https://example.com/login' },
      { type: 'fill', selector: '#username', value: '{{user}}' },
      { type: 'click', selector: '#submit' }
    ]
  }

  it('has all required fields', () => {
    expect(validWorkflow.id).toBeTruthy()
    expect(validWorkflow.steps.length).toBeGreaterThan(0)
  })

  it('step types are valid', () => {
    const validTypes = ['goto', 'fill', 'click', 'wait', 'assert']
    for (const step of validWorkflow.steps) {
      expect(validTypes).toContain(step.type)
    }
  })
})
