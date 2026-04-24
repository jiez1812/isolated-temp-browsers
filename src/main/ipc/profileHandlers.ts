import type { IpcMain } from 'electron'
import { IPC } from '../../shared/ipc'
import type { Profile } from '../../shared/types'
import { profileStore } from '../store/profileStore'

export function registerProfileHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC.PROFILE_LIST, () => profileStore.list())

  ipcMain.handle(IPC.PROFILE_LOAD, (_e, id: string) => profileStore.load(id))

  ipcMain.handle(IPC.PROFILE_SAVE, (_e, profile: Profile) => profileStore.save(profile))

  ipcMain.handle(IPC.PROFILE_DELETE, (_e, id: string) => profileStore.delete(id))
}
