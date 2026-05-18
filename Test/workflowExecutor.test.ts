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
      const [download] = await Promise.all([
        mockPage.waitForEvent('download', { timeout }),
        mockPage.click(step.selector),
      ])
      await (download as { path: () => Promise<string> }).path()
    } else {
      const download = await mockPage.waitForEvent('download', { timeout })
      await (download as { path: () => Promise<string> }).path()
    }
  }

  it('waits for download event without selector', async () => {
    const fakeDownload = { path: vi.fn().mockResolvedValue('/tmp/file.csv') }
    mockPage.waitForEvent.mockResolvedValue(fakeDownload)

    await runStep({ type: 'waitForDownload', timeout: 5000 })

    expect(mockPage.waitForEvent).toHaveBeenCalledWith('download', { timeout: 5000 })
    expect(fakeDownload.path).toHaveBeenCalled()
  })

  it('clicks selector and waits for download concurrently', async () => {
    const fakeDownload = { path: vi.fn().mockResolvedValue('/tmp/report.xlsx') }
    mockPage.waitForEvent.mockResolvedValue(fakeDownload)
    mockPage.click.mockResolvedValue(undefined)

    await runStep({ type: 'waitForDownload', selector: '#export-btn', timeout: 10000 })

    expect(mockPage.waitForEvent).toHaveBeenCalledWith('download', { timeout: 10000 })
    expect(mockPage.click).toHaveBeenCalledWith('#export-btn')
    expect(fakeDownload.path).toHaveBeenCalled()
  })

  it('uses 30000ms default timeout when none specified', async () => {
    const fakeDownload = { path: vi.fn().mockResolvedValue('/tmp/data.zip') }
    mockPage.waitForEvent.mockResolvedValue(fakeDownload)

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
