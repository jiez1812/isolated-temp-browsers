import type { BrowserContext } from 'playwright'
import type { Workflow, WorkflowStep } from '../../shared/types'
import type { WorkflowStatusEvent } from '../../shared/ipc'

type StatusCallback = (event: WorkflowStatusEvent) => void

class WorkflowExecutor {
  async run(
    workflow: Workflow,
    context: BrowserContext,
    params: Record<string, string>,
    onStatus: StatusCallback,
    contextId = ''
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
        status: 'error',
        message: `Page setup failed: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: Date.now()
      })
      throw err
    }

    onStatus({ contextId, workflowId: workflow.id, status: 'running', timestamp: Date.now() })

    try {
      for (const step of workflow.steps) {
        await this.executeStep(page, step, params)
      }
      onStatus({ contextId, workflowId: workflow.id, status: 'success', timestamp: Date.now() })
    } catch (err) {
      onStatus({
        contextId,
        workflowId: workflow.id,
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
        timestamp: Date.now()
      })
      throw err
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
    }
  }
}

export const workflowExecutor = new WorkflowExecutor()
