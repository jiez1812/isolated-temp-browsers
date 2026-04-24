export const IPC = {
  CONTEXT_LAUNCH: 'context:launch',
  CONTEXT_CLOSE: 'context:close',
  WORKFLOW_RUN: 'workflow:run',
  WORKFLOW_STATUS: 'workflow:status',
  PROFILE_LIST: 'profile:list',
  PROFILE_LOAD: 'profile:load',
  PROFILE_SAVE: 'profile:save',
  PROFILE_DELETE: 'profile:delete',
  CONTEXT_LIST: 'context:list',
  CONTEXT_SAVE: 'context:save',
  CONTEXT_DELETE: 'context:delete',
  WORKFLOW_LIST: 'workflow:list',
  WORKFLOW_SAVE: 'workflow:save',
  WORKFLOW_DELETE: 'workflow:delete',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_TOGGLE_ALWAYS_ON_TOP: 'window:toggle-always-on-top',
  DEBUG_LOG: 'debug:log',
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]

export interface WorkflowStatusEvent {
  contextId: string
  workflowId: string
  status: 'running' | 'success' | 'error'
  message?: string
  timestamp: number
}

export interface DebugLogEvent {
  level: 'info' | 'warn' | 'error'
  message: string
  timestamp: number
}
