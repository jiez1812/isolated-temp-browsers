import type { IpcMain, BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc'

export function registerWindowHandlers(ipcMain: IpcMain, win: BrowserWindow): void {
  ipcMain.on(IPC.WINDOW_MINIMIZE, () => {
    win.minimize()
  })

  ipcMain.handle(IPC.WINDOW_TOGGLE_ALWAYS_ON_TOP, () => {
    const next = !win.isAlwaysOnTop()
    win.setAlwaysOnTop(next)
    return next
  })
}
