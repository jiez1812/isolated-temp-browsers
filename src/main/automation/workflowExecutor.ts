import { app } from 'electron'
import { readdirSync, watch as fsWatch } from 'fs'
import type { BrowserContext } from 'playwright'
import type { Workflow, WorkflowStep } from '../../shared/types'
import type { WorkflowStatusEvent, DebugLogEvent, WorkflowStepEvent } from '../../shared/ipc'

type StatusCallback = (event: WorkflowStatusEvent) => void
type DebugLogFn = (level: DebugLogEvent['level'], message: string) => void
type StepEventFn = (event: Omit<WorkflowStepEvent, 'contextId' | 'workflowId'>) => void

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
          await this.executeStep(page, step, params)
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
    params: Record<string, string>
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
        // bypassing Playwright's download interception. Watch the downloads folder
        // for a new file instead — and ignore in-progress markers (.crdownload for
        // Chromium, .part for Firefox), since the temp file gets renamed to its
        // final name only when the download completes.
        let before: Set<string>
        try { before = new Set(readdirSync(downloadDir)) } catch { before = new Set() }

        let watcher: ReturnType<typeof fsWatch> | null = null
        try {
          const downloadCompleted = new Promise<void>((onResolved, onRejected) => {
            let settled = false
            const finish = (err?: Error) => {
              if (settled) return
              settled = true
              clearTimeout(timer)
              if (err) onRejected(err); else onResolved()
            }
            const timer = setTimeout(
              () => finish(new Error(`waitForDownload: Timeout ${timeout}ms exceeded`)),
              timeout
            )
            try {
              watcher = fsWatch(downloadDir, (_event, filename) => {
                if (!filename || before.has(filename)) return
                if (filename.endsWith('.crdownload') || filename.endsWith('.part')) return
                finish()
              })
            } catch (err) {
              finish(err instanceof Error ? err : new Error(String(err)))
            }
          })

          if (step.selector) {
            await page.click(resolve(step.selector))
          }
          await downloadCompleted
        } finally {
          try { watcher?.close() } catch {}
        }
        break
      }
    }
  }
}

export const workflowExecutor = new WorkflowExecutor()
