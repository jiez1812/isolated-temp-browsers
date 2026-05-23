import { app, BrowserWindow } from 'electron'
import type { IpcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { ProgressInfo, UpdateInfo } from 'electron-updater'
import { IPC } from '../../shared/ipc'
import type { AppUpdateProgress, AppUpdateState } from '../../shared/types'

const isUpdateCheckAvailable = (): boolean => app.isPackaged

const toProgress = (info: ProgressInfo): AppUpdateProgress => ({
  bytesPerSecond: info.bytesPerSecond,
  percent: info.percent,
  transferred: info.transferred,
  total: info.total,
})

const versionFrom = (info: UpdateInfo): string => info.version

export function registerUpdateHandlers(ipcMain: IpcMain, win: BrowserWindow): void {
  let state: AppUpdateState = {
    status: 'idle',
    currentVersion: app.getVersion(),
    canCheck: isUpdateCheckAvailable(),
    canInstall: false,
    message: isUpdateCheckAvailable()
      ? undefined
      : 'Update checks are available only in packaged installer builds.',
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.logger = null

  const publishState = (patch: Partial<AppUpdateState>): AppUpdateState => {
    state = {
      ...state,
      ...patch,
      currentVersion: app.getVersion(),
      canCheck: isUpdateCheckAvailable(),
    }

    if (!win.isDestroyed()) {
      win.webContents.send(IPC.APP_UPDATE_STATUS, state)
    }

    return state
  }

  autoUpdater.on('checking-for-update', () => {
    publishState({
      status: 'checking',
      message: undefined,
      progress: undefined,
      canInstall: false,
    })
  })

  autoUpdater.on('update-available', info => {
    publishState({
      status: 'available',
      availableVersion: versionFrom(info),
      message: undefined,
      progress: undefined,
      canInstall: false,
    })
  })

  autoUpdater.on('download-progress', info => {
    publishState({
      status: 'downloading',
      progress: toProgress(info),
      canInstall: false,
    })
  })

  autoUpdater.on('update-downloaded', info => {
    const version = versionFrom(info)
    publishState({
      status: 'downloaded',
      availableVersion: version,
      downloadedVersion: version,
      message: undefined,
      progress: undefined,
      canInstall: true,
    })
  })

  autoUpdater.on('update-not-available', info => {
    publishState({
      status: 'not-available',
      availableVersion: versionFrom(info),
      message: undefined,
      progress: undefined,
      canInstall: false,
    })
  })

  autoUpdater.on('error', err => {
    publishState({
      status: 'error',
      message: err.message,
      progress: undefined,
      canInstall: false,
    })
  })

  ipcMain.handle(IPC.APP_UPDATE_STATE, () => state)

  ipcMain.handle(IPC.APP_UPDATE_CHECK, async (): Promise<AppUpdateState> => {
    if (!isUpdateCheckAvailable()) {
      return publishState({
        status: 'idle',
        message: 'Update checks are available only in packaged installer builds.',
        canInstall: false,
      })
    }

    if (state.status === 'checking' || state.status === 'downloading') {
      return state
    }

    try {
      publishState({
        status: 'checking',
        message: undefined,
        progress: undefined,
        canInstall: false,
      })
      await autoUpdater.checkForUpdates()
      return state
    } catch (err) {
      return publishState({
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
        progress: undefined,
        canInstall: false,
      })
    }
  })

  ipcMain.handle(IPC.APP_UPDATE_INSTALL, () => {
    if (!state.canInstall) {
      throw new Error('No downloaded update is ready to install.')
    }

    autoUpdater.quitAndInstall(false, true)
  })
}
