import type { BrowserContext } from 'playwright'
import type { Workflow, WorkflowStep } from '../../shared/types'
import type { WorkflowStatusEvent, DebugLogEvent } from '../../shared/ipc'

type StatusCallback = (event: WorkflowStatusEvent) => void
type DebugLogFn = (level: DebugLogEvent['level'], message: string) => void

class WorkflowExecutor {
  async run(
    workflow: Workflow,
    context: BrowserContext,
    params: Record<string, string>,
    onStatus: StatusCallback,
    contextId = '',
    onDebugLog?: DebugLogFn
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
        onDebugLog?.('info', `${prefix} ${this.buildStepLabel(step, params, maskedKeys)}`)
        const t0 = Date.now()
        if (step.type === 'closeBrowser') {
          await context.close()
          onDebugLog?.('info', `${prefix} done (${Date.now() - t0}ms)`)
          break
        }
        await this.executeStep(page, step, params)
        onDebugLog?.('info', `${prefix} done (${Date.now() - t0}ms)`)
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
      case 'click':  return `click  ${step.selector}`
      case 'wait':   return `wait  ${step.selector}  (${step.timeout ?? 10000}ms)`
      case 'assert':      return `assert  ${step.selector}  visible`
      case 'waitForText':   return `waitForText  "${resolve(step.value)}"  (${step.timeout ?? 30000}ms)`
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
    }
  }
}

export const workflowExecutor = new WorkflowExecutor()
