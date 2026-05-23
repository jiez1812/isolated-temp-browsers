import { app } from 'electron'
import { readdirSync } from 'fs'
import type { BrowserContext } from 'playwright'
import type { Workflow, WorkflowStep } from '../../shared/types'
import type { WorkflowStatusEvent, DebugLogEvent, WorkflowStepEvent } from '../../shared/ipc'

type StatusCallback = (event: WorkflowStatusEvent) => void
type DebugLogFn = (level: DebugLogEvent['level'], message: string) => void
type StepEventFn = (event: Omit<WorkflowStepEvent, 'contextId' | 'workflowId'>) => void

const DEFAULT_RETRY_DELAY = 500
const MAX_RETRY_COUNT = 10
const RETRYABLE_STEP_TYPES = new Set<WorkflowStep['type']>([
  'goto',
  'click',
  'fill',
  'selectOption',
  'wait',
  'assert',
  'waitForText',
  'waitForDownload',
])

export function normalizeRetryCount(source: Pick<Workflow | WorkflowStep, 'retryCount'>): number {
  if (source.retryCount == null || !Number.isFinite(source.retryCount)) return 0
  return Math.min(MAX_RETRY_COUNT, Math.max(0, Math.floor(source.retryCount)))
}

export function normalizeRetryDelay(source: Pick<Workflow | WorkflowStep, 'retryDelay'>): number {
  if (source.retryDelay == null || !Number.isFinite(source.retryDelay)) return DEFAULT_RETRY_DELAY
  return Math.max(0, Math.floor(source.retryDelay))
}

export function isRetryableStep(step: WorkflowStep, workflowRetryEnabled = false): boolean {
  if (step.type === 'waitSeconds' || step.type === 'closeBrowser') return false
  if (step.type === 'goto') return workflowRetryEnabled || normalizeRetryCount(step) > 0
  return RETRYABLE_STEP_TYPES.has(step.type)
}

class WorkflowExecutor {
  async run(
    workflow: Workflow,
    context: BrowserContext,
    params: Record<string, string>,
    onStatus: StatusCallback,
    contextId = '',
    onDebugLog?: DebugLogFn,
    onStepEvent?: StepEventFn,
    slowMo = 0
  ): Promise<void> {
    let page: import('playwright').Page
    try {
      const pages = context.pages()
      page = pages[0] ?? (await context.newPage())
      // Wait for any in-progress navigation to settle (e.g. auth redirects after startupUrl load).
      // 15 s timeout avoids hanging forever if the page never fires domcontentloaded.
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 })
    } catch (err) {
      onStatus({
        contextId,
        workflowId: workflow.id,
        workflowName: workflow.name,
        status: 'error',
        message: `Page setup failed: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: Date.now()
      })
      throw err
    }

    onStatus({ contextId, workflowId: workflow.id, workflowName: workflow.name, status: 'running', timestamp: Date.now() })

    try {
      const total = workflow.steps.length
      const maskedKeys = new Set(
        workflow.params.filter(p => p.masked).map(p => p.name)
      )
      // Baseline of files in the downloads folder at workflow start.
      // Files appearing later — even during slowMo delays before waitForDownload
      // runs — are detectable as new downloads. Each waitForDownload adds the
      // file it claims to the baseline so the next one sees a fresh delta.
      let downloadBaseline: Set<string>
      try { downloadBaseline = new Set(readdirSync(app.getPath('downloads'))) }
      catch { downloadBaseline = new Set() }

      for (let i = 0; i < total; i++) {
        const step = workflow.steps[i]
        const prefix = `[step ${i + 1}/${total}]`
        const label = this.buildStepLabel(step, params, maskedKeys)
        onDebugLog?.('info', `${prefix} ${label}`)
        onStepEvent?.({ stepIndex: i, total, status: 'running', label })
        const t0 = Date.now()
        if (step.type === 'closeBrowser') {
          await context.close()
          const duration = Date.now() - t0
          onDebugLog?.('info', `${prefix} done (${duration}ms)`)
          onStepEvent?.({ stepIndex: i, total, status: 'done', label, duration })
          break
        }
        try {
          await this.executeStepWithRetry(page, workflow, step, params, downloadBaseline, prefix, onDebugLog)
          const duration = Date.now() - t0
          onDebugLog?.('info', `${prefix} done (${duration}ms)`)
          onStepEvent?.({ stepIndex: i, total, status: 'done', label, duration })
          if (slowMo > 0 && i < total - 1) await page.waitForTimeout(slowMo)
        } catch (err) {
          onStepEvent?.({ stepIndex: i, total, status: 'error', label, duration: Date.now() - t0 })
          throw err
        }
      }
      onStatus({ contextId, workflowId: workflow.id, workflowName: workflow.name, status: 'success', timestamp: Date.now() })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      onDebugLog?.('error', `step failed: ${msg}`)
      onStatus({
        contextId,
        workflowId: workflow.id,
        workflowName: workflow.name,
        status: 'error',
        message: msg,
        timestamp: Date.now()
      })
      throw err
    }
  }

  private async executeStepWithRetry(
    page: import('playwright').Page,
    workflow: Workflow,
    step: WorkflowStep,
    params: Record<string, string>,
    downloadBaseline: Set<string>,
    prefix: string,
    onDebugLog?: DebugLogFn
  ): Promise<void> {
    const { retryCount, retryDelay } = this.getRetryPolicy(workflow, step)
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        await this.executeStep(page, step, params, downloadBaseline)
        return
      } catch (err) {
        if (attempt >= retryCount) throw err
        const msg = err instanceof Error ? err.message : String(err)
        const retryNo = attempt + 1
        onDebugLog?.('warn', `${prefix} retry ${retryNo}/${retryCount} after error: ${msg}`)
        if (retryDelay > 0) await page.waitForTimeout(retryDelay)
      }
    }
  }

  private getRetryPolicy(workflow: Workflow, step: WorkflowStep): { retryCount: number; retryDelay: number } {
    const workflowRetryCount = normalizeRetryCount(workflow)
    if (workflowRetryCount > 0 && isRetryableStep(step, true)) {
      return { retryCount: workflowRetryCount, retryDelay: normalizeRetryDelay(workflow) }
    }
    if (!isRetryableStep(step)) return { retryCount: 0, retryDelay: DEFAULT_RETRY_DELAY }
    return { retryCount: normalizeRetryCount(step), retryDelay: normalizeRetryDelay(step) }
  }

  private buildStepLabel(step: WorkflowStep, params: Record<string, string>, maskedKeys: Set<string>): string {
    const resolve = (val?: string): string => {
      if (!val) return ''
      return val.replace(/\{\{(\w+)\}\}/g, (_, key) =>
        maskedKeys.has(key) ? '••••••' : (params[key] ?? '')
      )
    }
    switch (step.type) {
      case 'goto':   return `goto  ${resolve(step.url)}`
      case 'fill':   return `fill  ${step.selector}  →  "${resolve(step.value)}"`
      case 'click':        return `click  ${step.selector}`
      case 'selectOption': return `selectOption  ${step.selector}  →  "${resolve(step.value)}"`
      case 'wait':   return `wait  ${step.selector}  (${step.timeout ?? 10000}ms)`
      case 'assert':      return `assert  ${step.selector}  visible`
      case 'waitForText':   return `waitForText  "${resolve(step.value)}"  (${step.timeout ?? 30000}ms)`
      case 'waitSeconds':      return `waitSeconds  ${(step.timeout ?? 0) / 1000}s`
      case 'waitForDownload':  return `waitForDownload  ${step.selector ? step.selector : '(any)'}`
      case 'closeBrowser': return `closeBrowser`
      default:             return JSON.stringify(step)
    }
  }

  private async executeStep(
    page: import('playwright').Page,
    step: WorkflowStep,
    params: Record<string, string>,
    downloadBaseline: Set<string>
  ): Promise<void> {
    const resolve = (val?: string): string => {
      if (!val) return ''
      return val.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? '')
    }

    switch (step.type) {
      case 'goto':
        await page.goto(resolve(step.url))
        break
      case 'fill':
        await page.fill(resolve(step.selector), resolve(step.value))
        break
      case 'click':
        await page.click(resolve(step.selector))
        break
      case 'selectOption':
        await page.selectOption(resolve(step.selector), resolve(step.value))
        break
      case 'wait':
        await page.waitForSelector(resolve(step.selector), {
          timeout: step.timeout ?? 10000
        })
        break
      case 'assert':
        await page.waitForSelector(resolve(step.selector), {
          state: 'visible',
          timeout: step.timeout ?? 10000
        })
        break
      case 'waitForText': {
        const text = resolve(step.value)
        await page.waitForFunction(
          (t) => window.location.href.includes(t) || document.body.innerText.includes(t),
          text,
          { timeout: step.timeout ?? 30000 }
        )
        break
      }
      case 'waitSeconds':
        await page.waitForTimeout(step.timeout ?? 0)
        break
      case 'waitForDownload': {
        const timeout = step.timeout ?? 30000
        const downloadDir = app.getPath('downloads')
        // page.waitForEvent('download') won't fire because browserManager sets
        // Browser.setDownloadBehavior to behavior:'allow' (to preserve filenames),
        // bypassing Playwright's download interception. Poll the downloads folder
        // against the workflow-wide baseline so files that completed during
        // slowMo (before this step started) still count as new. In-progress
        // markers (.crdownload for Chromium, .part for Firefox) are ignored.
        if (step.selector) {
          await page.click(resolve(step.selector))
        }

        const isPending = (f: string) => f.endsWith('.crdownload') || f.endsWith('.part')
        const deadline = Date.now() + timeout
        let detected: string | undefined
        while (!detected && Date.now() < deadline) {
          let entries: string[]
          try { entries = readdirSync(downloadDir) } catch { entries = [] }
          detected = entries.find(f => !downloadBaseline.has(f) && !isPending(f))
          if (!detected) await new Promise(r => setTimeout(r, 250))
        }
        if (!detected) {
          throw new Error(`waitForDownload: Timeout ${timeout}ms exceeded`)
        }
        downloadBaseline.add(detected)
        break
      }
    }
  }
}

export const workflowExecutor = new WorkflowExecutor()
