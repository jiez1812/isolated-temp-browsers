import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type { ContextBrowserConfig, Profile, Workflow, AvailableBrowsers, ProfileImportResult } from '../shared/types'
import type { WorkflowStatusEvent, DebugLogEvent, WorkflowStepEvent } from '../shared/ipc'

contextBridge.exposeInMainWorld('api', {
  // Context browsers
  listContexts: (): Promise<ContextBrowserConfig[]> => ipcRenderer.invoke(IPC.CONTEXT_LIST),
  saveContext: (config: ContextBrowserConfig): Promise<void> =>
    ipcRenderer.invoke(IPC.CONTEXT_SAVE, config),
  deleteContext: (id: string): Promise<void> => ipcRenderer.invoke(IPC.CONTEXT_DELETE, id),
  launchContext: (id: string): Promise<void> => ipcRenderer.invoke(IPC.CONTEXT_LAUNCH, id),
  closeContext: (id: string): Promise<void> => ipcRenderer.invoke(IPC.CONTEXT_CLOSE, id),

  // Profiles
  listProfiles: (): Promise<Profile[]> => ipcRenderer.invoke(IPC.PROFILE_LIST),
  loadProfile: (id: string): Promise<Profile | null> => ipcRenderer.invoke(IPC.PROFILE_LOAD, id),
  saveProfile: (profile: Profile): Promise<void> => ipcRenderer.invoke(IPC.PROFILE_SAVE, profile),
  deleteProfile: (id: string): Promise<void> => ipcRenderer.invoke(IPC.PROFILE_DELETE, id),
  exportProfile: (id: string): Promise<void> => ipcRenderer.invoke(IPC.PROFILE_EXPORT, id),
  importProfile: (): Promise<ProfileImportResult> => ipcRenderer.invoke(IPC.PROFILE_IMPORT),

  // Workflows
  listWorkflows: (): Promise<Workflow[]> => ipcRenderer.invoke(IPC.WORKFLOW_LIST),
  saveWorkflow: (workflow: Workflow): Promise<void> =>
    ipcRenderer.invoke(IPC.WORKFLOW_SAVE, workflow),
  deleteWorkflow: (id: string): Promise<void> => ipcRenderer.invoke(IPC.WORKFLOW_DELETE, id),
  runWorkflow: (
    contextId: string,
    workflowId: string,
    params: Record<string, string>,
    options?: { debug?: boolean; slowMo?: number }
  ): Promise<void> => ipcRenderer.invoke(IPC.WORKFLOW_RUN, { contextId, workflowId, params, ...options }),

  // System
  detectBrowsers: (): Promise<AvailableBrowsers> => ipcRenderer.invoke(IPC.BROWSER_DETECT),

  // Window controls
  minimizeWindow: (): void => ipcRenderer.send(IPC.WINDOW_MINIMIZE),
  toggleAlwaysOnTop: (): Promise<boolean> => ipcRenderer.invoke(IPC.WINDOW_TOGGLE_ALWAYS_ON_TOP),
  enterMiniMode: (): void => ipcRenderer.send(IPC.WINDOW_ENTER_MINI),
  exitMiniMode: (): void => ipcRenderer.send(IPC.WINDOW_EXIT_MINI),

  // Events
  onWorkflowStatus: (callback: (event: WorkflowStatusEvent) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, data: WorkflowStatusEvent): void =>
      callback(data)
    ipcRenderer.on(IPC.WORKFLOW_STATUS, handler)
    return () => ipcRenderer.removeListener(IPC.WORKFLOW_STATUS, handler)
  },

  onDebugLog: (callback: (event: DebugLogEvent) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, data: DebugLogEvent): void => callback(data)
    ipcRenderer.on(IPC.DEBUG_LOG, handler)
    return () => ipcRenderer.removeListener(IPC.DEBUG_LOG, handler)
  },

  onWorkflowStep: (callback: (event: WorkflowStepEvent) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, data: WorkflowStepEvent): void => callback(data)
    ipcRenderer.on(IPC.WORKFLOW_STEP, handler)
    return () => ipcRenderer.removeListener(IPC.WORKFLOW_STEP, handler)
  },

  onContextClosed: (callback: (contextId: string) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, id: string): void => callback(id)
    ipcRenderer.on(IPC.CONTEXT_CLOSED, handler)
    return () => ipcRenderer.removeListener(IPC.CONTEXT_CLOSED, handler)
  }
})
