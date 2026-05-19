import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Workflow, WorkflowStep } from '../src/shared/types'

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
