import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { browserManager } from './browser/browserManager'
import { registerContextHandlers } from './ipc/contextHandlers'
import { registerProfileHandlers } from './ipc/profileHandlers'
import { registerWorkflowHandlers } from './ipc/workflowHandlers'
import { registerWindowHandlers } from './ipc/windowHandlers'

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

Menu.setApplicationMenu(null)

app.whenReady().then(() => {
  registerContextHandlers(ipcMain)
  registerProfileHandlers(ipcMain)
  registerWorkflowHandlers(ipcMain)

  const win = createWindow()
  registerWindowHandlers(ipcMain, win)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  await browserManager.closeAll()
  app.quit()
})
