import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'

import { browserManager, detectBrowsers } from './browser/browserManager'
import { registerContextHandlers } from './ipc/contextHandlers'
import { registerProfileHandlers } from './ipc/profileHandlers'
import { registerWorkflowHandlers } from './ipc/workflowHandlers'
import { registerWindowHandlers } from './ipc/windowHandlers'
import { IPC } from '../shared/ipc'

function createWindow(): BrowserWindow {
  const icon = app.isPackaged
    ? join(process.resourcesPath, 'images/icon.ico')
    : join(__dirname, '../../images/icon.ico')
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon,
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
app.setAppUserModelId('com.isolated-temp-browsers')

app.whenReady().then(() => {
  registerContextHandlers(ipcMain)
  registerProfileHandlers(ipcMain)
  registerWorkflowHandlers(ipcMain)
  ipcMain.handle(IPC.BROWSER_DETECT, () => detectBrowsers())

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
