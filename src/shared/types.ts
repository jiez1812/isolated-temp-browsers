export interface WorkflowStep {
  type: 'goto' | 'fill' | 'click' | 'wait' | 'assert'
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

export interface ContextBrowserConfig {
  id: string
  name: string
  color?: string
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
