export interface WorkflowStep {
  type: 'goto' | 'fill' | 'click' | 'wait' | 'assert' | 'waitForText' | 'waitSeconds' | 'waitForDownload' | 'closeBrowser'
  selector?: string
  value?: string
  url?: string
  timeout?: number
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
