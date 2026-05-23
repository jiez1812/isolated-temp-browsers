import type {
  AppInfo,
  AppSettings,
  AppSettingsPatch,
  AppUpdateState,
  ContextBrowserConfig,
  DataRootChangeResult,
  Profile,
  Workflow,
  AvailableBrowsers,
  ProfileImportResult,
} from '../../shared/types'
import type { WorkflowStatusEvent, DebugLogEvent, WorkflowStepEvent } from '../../shared/ipc'

declare global {
  interface Window {
    api: {
      listContexts: () => Promise<ContextBrowserConfig[]>
      saveContext: (config: ContextBrowserConfig) => Promise<void>
      deleteContext: (id: string) => Promise<void>
      launchContext: (id: string) => Promise<void>
      closeContext: (id: string) => Promise<void>

      listProfiles: () => Promise<Profile[]>
      loadProfile: (id: string) => Promise<Profile | null>
      saveProfile: (profile: Profile) => Promise<void>
      deleteProfile: (id: string) => Promise<void>
      exportProfile: (id: string) => Promise<void>
      importProfile: () => Promise<ProfileImportResult>

      listWorkflows: () => Promise<Workflow[]>
      saveWorkflow: (workflow: Workflow) => Promise<void>
      deleteWorkflow: (id: string) => Promise<void>
      runWorkflow: (
        contextId: string,
        workflowId: string,
        params: Record<string, string>,
        options?: { debug?: boolean; slowMo?: number }
      ) => Promise<void>

      onWorkflowStatus: (callback: (event: WorkflowStatusEvent) => void) => () => void
      onDebugLog: (callback: (event: DebugLogEvent) => void) => () => void
      onWorkflowStep: (callback: (event: WorkflowStepEvent) => void) => () => void
      onContextClosed: (callback: (contextId: string) => void) => () => void

      detectBrowsers: () => Promise<AvailableBrowsers>
      loadSettings: () => Promise<AppSettings>
      saveSettings: (patch: AppSettingsPatch) => Promise<AppSettings>
      chooseDataRoot: () => Promise<DataRootChangeResult>
      resetDataRoot: () => Promise<AppSettings>
      openDataRoot: () => Promise<void>
      getAppInfo: () => Promise<AppInfo>
      getAppUpdateState: () => Promise<AppUpdateState>
      checkForAppUpdates: () => Promise<AppUpdateState>
      installAppUpdate: () => Promise<void>
      onAppUpdateStatus: (callback: (state: AppUpdateState) => void) => () => void

      minimizeWindow: () => void
      toggleAlwaysOnTop: () => Promise<boolean>
      enterMiniMode: () => void
      exitMiniMode: () => void
    }
  }
}
