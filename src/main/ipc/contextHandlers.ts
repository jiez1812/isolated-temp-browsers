import type { IpcMain, WebContents } from 'electron'
import { IPC } from '../../shared/ipc'
import type { DebugLogEvent } from '../../shared/ipc'
import type { ContextBrowserConfig } from '../../shared/types'
import { contextStore } from '../store/contextStore'
import { browserManager } from '../browser/browserManager'
import { workflowStore } from '../store/workflowStore'
import { workflowExecutor } from '../automation/workflowExecutor'

function dbg(sender: WebContents, level: DebugLogEvent['level'], message: string): void {
  sender.send(IPC.DEBUG_LOG, { level, message, timestamp: Date.now() } satisfies DebugLogEvent)
}

export function registerContextHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC.CONTEXT_LIST, () => contextStore.list())

  ipcMain.handle(IPC.CONTEXT_SAVE, (_e, config: ContextBrowserConfig) =>
    contextStore.save(config)
  )

  ipcMain.handle(IPC.CONTEXT_DELETE, (_e, id: string) => contextStore.delete(id))

  ipcMain.handle(IPC.CONTEXT_LAUNCH, async (event, id: string) => {
    dbg(event.sender, 'info', `[launch] contextId=${id}`)
    await browserManager.launch(id, event.sender)
    dbg(event.sender, 'info', `[launch] browser launched`)

    const config = contextStore.load(id)
    if (!config) {
      dbg(event.sender, 'error', `[launch] config not found for id=${id}`)
      return
    }
    dbg(
      event.sender,
      'info',
      `[launch] config loaded — runWorkflowOnLaunch=${config.runWorkflowOnLaunch ?? false}, workflowId=${config.workflowId ?? '(none)'}`
    )

    if (config.runWorkflowOnLaunch && config.workflowId) {
      dbg(event.sender, 'info', `[autorun] condition met, loading workflow id=${config.workflowId}`)

      const workflow = workflowStore.load(config.workflowId)
      dbg(event.sender, workflow ? 'info' : 'error', `[autorun] workflow ${workflow ? `"${workflow.name}" found` : 'NOT FOUND (id=' + config.workflowId + ')'}`)

      const context = browserManager.getContext(id)
      dbg(event.sender, context ? 'info' : 'error', `[autorun] browserContext ${context ? 'found' : 'NOT FOUND'}`)

      if (workflow && context) {
        dbg(event.sender, 'info', `[autorun] starting execution`)
        const sendStatus = (statusEvent: Parameters<typeof event.sender.send>[1]) =>
          event.sender.send(IPC.WORKFLOW_STATUS, { ...statusEvent, contextId: id })

        workflowExecutor
          .run(workflow, context, config.workflowParams ?? {}, sendStatus, id,
            (level, msg) => dbg(event.sender, level, msg)
          )
          .catch(err => {
            const msg = err instanceof Error ? err.message : String(err)
            dbg(event.sender, 'error', `[autorun] uncaught error: ${msg}`)
            console.error(`[auto-run] context=${id} workflow="${workflow?.name ?? config.workflowId}":`, err)
          })
      }
    } else {
      const reason = !config.runWorkflowOnLaunch
        ? 'runWorkflowOnLaunch=false'
        : 'workflowId not set'
      dbg(event.sender, 'warn', `[autorun] skipped — ${reason}`)
    }
  })

  ipcMain.handle(IPC.CONTEXT_CLOSE, (_e, id: string) => browserManager.close(id))
}
