import { useState } from 'react'
import type { AppInfo, AppSettings } from '../../../shared/types'
import { isUsingDefaultDataRoot } from '../utils/settingsView'

interface Props {
  settings: AppSettings | null
  appInfo: AppInfo | null
  onBack: () => void
  onSettingsChanged: (settings: AppSettings) => void
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void
}

function IconBack() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3L5 8l5 5"/>
    </svg>
  )
}

function IconFolder() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5.5V13h12V6.5H7.5L6 4H2z"/>
    </svg>
  )
}

export default function SettingsPage({
  settings,
  appInfo,
  onBack,
  onSettingsChanged,
  onNotify,
}: Props) {
  const [busy, setBusy] = useState(false)

  const handleChooseLocation = async () => {
    setBusy(true)
    try {
      const result = await window.api.chooseDataRoot()
      if (result.status === 'cancelled') return
      if (result.status === 'error') {
        onNotify('error', result.message)
        return
      }
      onSettingsChanged(result.settings)
      onNotify('success', 'App data location updated')
    } catch (err) {
      onNotify('error', `Failed to change location: ${err}`)
    } finally {
      setBusy(false)
    }
  }

  const handleResetLocation = async () => {
    setBusy(true)
    try {
      const next = await window.api.resetDataRoot()
      onSettingsChanged(next)
      onNotify('success', 'App data location reset to default')
    } catch (err) {
      onNotify('error', `Failed to reset location: ${err}`)
    } finally {
      setBusy(false)
    }
  }

  const handleOpenLocation = async () => {
    try {
      await window.api.openDataRoot()
    } catch (err) {
      onNotify('error', `Failed to open folder: ${err}`)
    }
  }

  const handleDebugDefaultChange = async (checked: boolean) => {
    setBusy(true)
    try {
      const next = await window.api.saveSettings({ debugConsoleOpenByDefault: checked })
      onSettingsChanged(next)
    } catch (err) {
      onNotify('error', `Failed to save setting: ${err}`)
    } finally {
      setBusy(false)
    }
  }

  if (!settings) {
    return (
      <div className="settings-page">
        <div className="settings-header">
          <button className="settings-back" onClick={onBack} aria-label="Back">
            <IconBack/>
          </button>
          <div>
            <h1>Settings</h1>
            <p>Loading settings...</p>
          </div>
        </div>
      </div>
    )
  }

  const usingDefaultRoot = isUsingDefaultDataRoot(settings)

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back" onClick={onBack} aria-label="Back">
          <IconBack/>
        </button>
        <div>
          <h1>Settings</h1>
          <p>App storage, version, and console defaults</p>
        </div>
      </div>

      <div className="settings-list">
        <section className="settings-section">
          <div className="settings-row">
            <div className="settings-row-main">
              <span className="settings-label">Saved profile location</span>
              <code className="settings-path">{settings.dataRoot}</code>
              <span className="settings-hint">
                Profiles, context browsers, and workflows are stored together.
              </span>
            </div>
            <div className="settings-actions">
              <button className="btn btn-secondary" onClick={handleOpenLocation} disabled={busy}>
                <IconFolder/> Open Folder
              </button>
              <button className="btn btn-secondary" onClick={handleChooseLocation} disabled={busy}>
                Change...
              </button>
              <button
                className="btn btn-ghost"
                onClick={handleResetLocation}
                disabled={busy || usingDefaultRoot}
              >
                Reset to Default
              </button>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-row">
            <div className="settings-row-main">
              <span className="settings-label">Version</span>
              <span className="settings-value">{appInfo?.version ?? 'Unknown'}</span>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <label className="settings-row settings-row--toggle">
            <div className="settings-row-main">
              <span className="settings-label">Open debug console by default</span>
              <span className="settings-hint">
                Applies immediately and is used when the app starts.
              </span>
            </div>
            <input
              className="toggle-switch"
              type="checkbox"
              checked={settings.debugConsoleOpenByDefault}
              onChange={e => handleDebugDefaultChange(e.target.checked)}
              disabled={busy}
            />
          </label>
        </section>
      </div>
    </div>
  )
}
