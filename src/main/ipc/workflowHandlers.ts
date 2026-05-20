import type { IpcMain, WebContents } from 'electron'
import { IPC } from '../../shared/ipc'
import type { Workflow } from '../../shared/types'
import type { WorkflowStatusEvent, DebugLogEvent, WorkflowStepEvent } from '../../shared/ipc'
import { workflowStore } from '../store/workflowStore'
import { workflowExecutor } from '../automation/workflowExecutor'
import { browserManager } from '../browser/browserManager'

export function registerWorkflowHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC.WORKFLOW_LIST, () => workflowStore.list())

  ipcMain.handle(IPC.WORKFLOW_SAVE, (_e, workflow: Workflow) => workflowStore.save(workflow))

  ipcMain.handle(IPC.WORKFLOW_DELETE, (_e, id: string) => workflowStore.delete(id))

  ipcMain.handle(
    IPC.WORKFLOW_RUN,
    async (
      event,
      payload: { contextId: string; workflowId: string; params: Record<string, string>; debug?: boolean; slowMo?: number }
    ) => {
      const { contextId, workflowId, params, debug = false, slowMo = 0 } = payload
      const workflow = workflowStore.load(workflowId)
      if (!workflow) throw new Error(`Workflow ${workflowId} not found`)

      const context = browserManager.getContext(contextId)
      if (!context) throw new Error(`Context ${contextId} is not running`)

      const sender = event.sender as WebContents
      const sendStatus = (status: WorkflowStatusEvent): void => {
        sender.send(IPC.WORKFLOW_STATUS, status)
      }

      await workflowExecutor.run(
        workflow, context, params, sendStatus, contextId,
        debug
          ? (level, msg) => sender.send(IPC.DEBUG_LOG, { level, message: msg, timestamp: Date.now() } satisfies DebugLogEvent)
          : undefined,
        debug
          ? (step) => sender.send(IPC.WORKFLOW_STEP, { contextId, workflowId, ...step } satisfies WorkflowStepEvent)
          : undefined,
        slowMo
      )
    }
  )
}
