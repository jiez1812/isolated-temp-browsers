import type { IpcMain, BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc'

export function registerWindowHandlers(ipcMain: IpcMain, win: BrowserWindow): void {
  let prevBounds: Electron.Rectangle | null = null

  ipcMain.on(IPC.WINDOW_MINIMIZE, () => {
    win.minimize()
  })

  ipcMain.handle(IPC.WINDOW_TOGGLE_ALWAYS_ON_TOP, () => {
    const next = !win.isAlwaysOnTop()
    win.setAlwaysOnTop(next)
    return next
  })

  ipcMain.on(IPC.WINDOW_ENTER_MINI, () => {
    prevBounds = win.getBounds()
    win.setSize(300, 440)
    win.setResizable(false)
  })

  ipcMain.on(IPC.WINDOW_EXIT_MINI, () => {
    win.setResizable(true)
    if (prevBounds) {
      win.setBounds(prevBounds)
      prevBounds = null
    }
  })
}
