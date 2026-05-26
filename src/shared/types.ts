export interface WorkflowStep {
  type: 'goto' | 'captureUrlParam' | 'fill' | 'click' | 'selectOption' | 'wait' | 'assert' | 'waitForText' | 'waitSeconds' | 'waitForDownload' | 'closeBrowser'
  selector?: string
  value?: string
  url?: string
  paramName?: string
  saveAs?: string
  timeout?: number
  retryCount?: number
  retryDelay?: number
}

export interface WorkflowParam {
  name: string
  label: string
  defaultValue?: string
  masked?: boolean
}

export interface Workflow {
  id: string
  name: string
  steps: WorkflowStep[]
  params: WorkflowParam[]
  retryEnabled?: boolean
  retryCount?: number
  retryDelay?: number
}

export interface WindowSize {
  width: number
  height: number
}

export type BrowserType = 'edge' | 'chrome' | 'firefox'

export interface AvailableBrowsers {
  edge: boolean
  chrome: boolean
  firefox: boolean
}

export interface ContextBrowserConfig {
  id: string
  name: string
  color?: string
  browserType?: BrowserType
  startupUrl: string
  windowSize: WindowSize
  workflowId?: string
  workflowParams?: Record<string, string>
  runWorkflowOnLaunch?: boolean
}

export interface Profile {
  id: string
  name: string
  contextIds: string[]
  workflowIds?: string[]
}

/** Context entry in an exported profile YAML — no IDs, workflow referenced by name */
export interface ProfileExportContext {
  name: string
  color?: string
  browserType?: BrowserType
  startupUrl: string
  windowSize: WindowSize
  workflowRef?: string
  workflowParams?: Record<string, string>
  runWorkflowOnLaunch?: boolean
}

export interface ProfileExportWorkflow {
  name: string
  steps: WorkflowStep[]
  params: WorkflowParam[]
  retryEnabled?: boolean
  retryCount?: number
  retryDelay?: number
}

export interface ProfileExport {
  version: '1.0'
  profile: {
    name: string
    contexts: ProfileExportContext[]
    workflows: ProfileExportWorkflow[]
  }
}

export type ProfileImportResult =
  | { status: 'ok'; data: ProfileExport }
  | { status: 'cancelled' }
  | { status: 'error'; message: string }

export interface AppSettings {
  dataRoot: string
  defaultDataRoot: string
  customDataRoot: string | null
  debugConsoleOpenByDefault: boolean
  defaultRetryCount: number
  defaultRetryDelay: number
}

export interface AppSettingsPatch {
  customDataRoot?: string | null
  debugConsoleOpenByDefault?: boolean
  defaultRetryCount?: number
  defaultRetryDelay?: number
}

export interface AppInfo {
  version: string
}

export interface AppUpdateProgress {
  bytesPerSecond: number
  percent: number
  transferred: number
  total: number
}

export interface AppUpdateState {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  currentVersion: string
  availableVersion?: string
  downloadedVersion?: string
  message?: string
  progress?: AppUpdateProgress
  canCheck: boolean
  canInstall: boolean
}

export type DataRootChangeResult =
  | { status: 'ok'; settings: AppSettings }
  | { status: 'cancelled' }
  | { status: 'error'; message: string }
