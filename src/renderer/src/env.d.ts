import type { ContextBrowserConfig, Profile, Workflow } from '../../shared/types'
import type { WorkflowStatusEvent, DebugLogEvent } from '../../shared/ipc'

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

      listWorkflows: () => Promise<Workflow[]>
      saveWorkflow: (workflow: Workflow) => Promise<void>
      deleteWorkflow: (id: string) => Promise<void>
      runWorkflow: (
        contextId: string,
        workflowId: string,
        params: Record<string, string>
      ) => Promise<void>

      onWorkflowStatus: (callback: (event: WorkflowStatusEvent) => void) => () => void
      onDebugLog: (callback: (event: DebugLogEvent) => void) => () => void

      minimizeWindow: () => void
      toggleAlwaysOnTop: () => Promise<boolean>
    }
  }
}
