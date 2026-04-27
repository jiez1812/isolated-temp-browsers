import { dialog } from 'electron'
import type { IpcMain } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { dump, load } from 'js-yaml'
import { IPC } from '../../shared/ipc'
import type {
  Profile,
  ContextBrowserConfig,
  Workflow,
  ProfileExport,
  ProfileExportContext,
  ProfileExportWorkflow,
  ProfileImportResult,
} from '../../shared/types'
import { profileStore } from '../store/profileStore'
import { contextStore } from '../store/contextStore'
import { workflowStore } from '../store/workflowStore'

export function registerProfileHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC.PROFILE_LIST, () => profileStore.list())

  ipcMain.handle(IPC.PROFILE_LOAD, (_e, id: string) => profileStore.load(id))

  ipcMain.handle(IPC.PROFILE_SAVE, (_e, profile: Profile) => profileStore.save(profile))

  ipcMain.handle(IPC.PROFILE_DELETE, (_e, id: string) => {
    const profile = profileStore.load(id)
    profile?.contextIds.forEach(cid => contextStore.delete(cid))
    profileStore.delete(id)
  })

  ipcMain.handle(IPC.PROFILE_EXPORT, async (_e, id: string) => {
    const profile = profileStore.load(id)
    if (!profile) throw new Error('Profile not found')

    const contexts: ProfileExportContext[] = profile.contextIds
      .map(cid => contextStore.load(cid))
      .filter((c): c is ContextBrowserConfig => c != null)
      .map(c => {
        const entry: ProfileExportContext = {
          name: c.name,
          startupUrl: c.startupUrl,
          windowSize: c.windowSize,
        }
        if (c.color) entry.color = c.color
        if (c.browserType) entry.browserType = c.browserType
        if (c.workflowId) {
          const wf = workflowStore.load(c.workflowId)
          if (wf) entry.workflowRef = wf.name
        }
        if (c.workflowParams && Object.keys(c.workflowParams).length)
          entry.workflowParams = c.workflowParams
        if (c.runWorkflowOnLaunch) entry.runWorkflowOnLaunch = true
        return entry
      })

    const workflows: ProfileExportWorkflow[] = (profile.workflowIds ?? [])
      .map(wid => workflowStore.load(wid))
      .filter((w): w is Workflow => w != null)
      .map(w => ({ name: w.name, steps: w.steps, params: w.params }))

    const exportData: ProfileExport = {
      version: '1.0',
      profile: { name: profile.name, contexts, workflows },
    }

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export Profile',
      defaultPath: `${profile.name}.yaml`,
      filters: [{ name: 'YAML Profile', extensions: ['yaml', 'yml'] }],
    })

    if (!canceled && filePath) {
      writeFileSync(filePath, dump(exportData, { lineWidth: 120 }), 'utf-8')
    }
  })

  ipcMain.handle(IPC.PROFILE_IMPORT, async (): Promise<ProfileImportResult> => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Import Profile',
      filters: [{ name: 'YAML Profile', extensions: ['yaml', 'yml'] }],
      properties: ['openFile'],
    })

    if (canceled || !filePaths[0]) return { status: 'cancelled' }

    try {
      const content = readFileSync(filePaths[0], 'utf-8')
      const data = load(content) as ProfileExport

      if (!data?.profile?.name || typeof data.profile.name !== 'string') {
        return { status: 'error', message: 'Invalid profile file: missing profile name' }
      }
      if (!Array.isArray(data.profile.contexts)) {
        return { status: 'error', message: 'Invalid profile file: contexts must be an array' }
      }

      return { status: 'ok', data }
    } catch (err) {
      return { status: 'error', message: `Failed to parse file: ${String(err)}` }
    }
  })
}
