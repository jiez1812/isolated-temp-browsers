import { describe, it, expect } from 'vitest'
import type { AppSettings } from '../src/shared/types'
import {
  closeSettingsView,
  debugConsoleOpenFromSettings,
  isUsingDefaultDataRoot,
  openSettingsView,
} from '../src/renderer/src/utils/settingsView'

const makeSettings = (overrides: Partial<AppSettings> = {}): AppSettings => ({
  dataRoot: 'C:\\AppData',
  defaultDataRoot: 'C:\\AppData',
  customDataRoot: null,
  debugConsoleOpenByDefault: true,
  defaultRetryCount: 2,
  defaultRetryDelay: 500,
  ...overrides,
})

describe('settings view logic', () => {
  it('opens and closes the settings view', () => {
    expect(openSettingsView()).toBe('settings')
    expect(closeSettingsView()).toBe('main')
  })

  it('derives debug console open state from settings', () => {
    expect(debugConsoleOpenFromSettings(makeSettings({ debugConsoleOpenByDefault: false }))).toBe(false)
    expect(debugConsoleOpenFromSettings(makeSettings({ debugConsoleOpenByDefault: true }))).toBe(true)
  })

  it('detects default and custom data roots', () => {
    expect(isUsingDefaultDataRoot(makeSettings())).toBe(true)
    expect(isUsingDefaultDataRoot(makeSettings({
      dataRoot: 'D:\\ProfileData',
      customDataRoot: 'D:\\ProfileData',
    }))).toBe(false)
  })
})
