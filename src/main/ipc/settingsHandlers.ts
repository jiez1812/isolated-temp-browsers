import { app, dialog, shell } from 'electron'
import type { IpcMain } from 'electron'
import { IPC } from '../../shared/ipc'
import type { AppSettingsPatch, DataRootChangeResult } from '../../shared/types'
import { settingsStore } from '../store/settingsStore'

export function registerSettingsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC.SETTINGS_LOAD, () => settingsStore.load())

  ipcMain.handle(IPC.SETTINGS_SAVE, (_e, patch: AppSettingsPatch) =>
    settingsStore.save(patch)
  )

  ipcMain.handle(IPC.SETTINGS_CHOOSE_DATA_ROOT, async (): Promise<DataRootChangeResult> => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Choose App Data Location',
      properties: ['openDirectory', 'createDirectory'],
    })

    if (canceled || !filePaths[0]) return { status: 'cancelled' }

    try {
      return { status: 'ok', settings: settingsStore.changeDataRoot(filePaths[0]) }
    } catch (err) {
      return {
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      }
    }
  })

  ipcMain.handle(IPC.SETTINGS_RESET_DATA_ROOT, () => settingsStore.resetDataRoot())

  ipcMain.handle(IPC.SETTINGS_OPEN_DATA_ROOT, async () => {
    const message = await shell.openPath(settingsStore.getDataRoot())
    if (message) throw new Error(message)
  })

  ipcMain.handle(IPC.APP_INFO, () => ({ version: app.getVersion() }))
}
