import type { AppSettings } from '../../../shared/types'

export type AppView = 'main' | 'settings'

export function openSettingsView(): AppView {
  return 'settings'
}

export function closeSettingsView(): AppView {
  return 'main'
}

export function debugConsoleOpenFromSettings(settings: AppSettings): boolean {
  return settings.debugConsoleOpenByDefault
}

export function isUsingDefaultDataRoot(settings: AppSettings): boolean {
  return settings.customDataRoot == null || settings.dataRoot === settings.defaultDataRoot
}
