import type { IpcMain, BrowserWindow } from 'electron'
import { screen } from 'electron'
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
    const cursorPos = screen.getCursorScreenPoint()

    win.setSize(300, 440)
    win.setResizable(false)

    // Measure native frame: difference between outer bounds and content bounds
    const bounds = win.getBounds()
    const contentBounds = win.getContentBounds()
    const frameLeft = contentBounds.x - bounds.x
    const frameTitlebar = contentBounds.y - bounds.y

    // Restore button sits ~45px from the right edge and ~21px from the top of the content area
    const restoreBtnX = contentBounds.width - 45
    const restoreBtnY = 21

    const display = screen.getDisplayNearestPoint(cursorPos)
    const { x: wa_x, y: wa_y, width: wa_w, height: wa_h } = display.workArea

    let newX = cursorPos.x - restoreBtnX - frameLeft
    let newY = cursorPos.y - restoreBtnY - frameTitlebar

    // Clamp so the window stays fully within the work area
    newX = Math.max(wa_x, Math.min(newX, wa_x + wa_w - bounds.width))
    newY = Math.max(wa_y, Math.min(newY, wa_y + wa_h - bounds.height))

    win.setPosition(newX, newY)
  })

  ipcMain.on(IPC.WINDOW_EXIT_MINI, () => {
    win.setResizable(true)
    if (prevBounds) {
      win.setBounds(prevBounds)
      prevBounds = null
    }
  })
}
