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
  WINDOW_ENTER_MINI: 'window:enter-mini',
  WINDOW_EXIT_MINI: 'window:exit-mini',
  DEBUG_LOG: 'debug:log',
  WORKFLOW_STEP: 'workflow:step',
  CONTEXT_CLOSED: 'context:closed',
  BROWSER_DETECT: 'browser:detect',
  PROFILE_EXPORT: 'profile:export',
  PROFILE_IMPORT: 'profile:import',
  SETTINGS_LOAD: 'settings:load',
  SETTINGS_SAVE: 'settings:save',
  SETTINGS_CHOOSE_DATA_ROOT: 'settings:choose-data-root',
  SETTINGS_RESET_DATA_ROOT: 'settings:reset-data-root',
  SETTINGS_OPEN_DATA_ROOT: 'settings:open-data-root',
  APP_INFO: 'app:info',
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]

export interface WorkflowStatusEvent {
  contextId: string
  workflowId: string
  workflowName: string
  status: 'running' | 'success' | 'error'
  message?: string
  timestamp: number
}

export interface DebugLogEvent {
  level: 'info' | 'warn' | 'error'
  message: string
  timestamp: number
}

export interface WorkflowStepEvent {
  contextId: string
  workflowId: string
  stepIndex: number
  total: number
  status: 'running' | 'done' | 'error'
  label: string
  duration?: number
}
