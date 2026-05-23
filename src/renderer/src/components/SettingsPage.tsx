import { useState } from 'react'
import {
  FaArrowLeft as IconBack,
  FaFolderOpen as IconFolder,
} from 'react-icons/fa'
import type { AppInfo, AppSettings } from '../../../shared/types'
import { MAX_WORKFLOW_RETRY_COUNT } from '../../../shared/settings'
import { isUsingDefaultDataRoot } from '../utils/settingsView'

interface Props {
  settings: AppSettings | null
  appInfo: AppInfo | null
  onBack: () => void
  onSettingsChanged: (settings: AppSettings) => void
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void
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

  const handleDefaultRetryCountChange = async (value: string) => {
    const parsed = Number(value)
    const defaultRetryCount = Number.isFinite(parsed)
      ? Math.min(MAX_WORKFLOW_RETRY_COUNT, Math.max(0, Math.floor(parsed)))
      : 0

    setBusy(true)
    try {
      const next = await window.api.saveSettings({ defaultRetryCount })
      onSettingsChanged(next)
    } catch (err) {
      onNotify('error', `Failed to save retry count: ${err}`)
    } finally {
      setBusy(false)
    }
  }

  const handleDefaultRetryDelayChange = async (value: string) => {
    const parsed = Number(value)
    const defaultRetryDelay = Number.isFinite(parsed)
      ? Math.max(0, Math.round(parsed * 1000))
      : 0

    setBusy(true)
    try {
      const next = await window.api.saveSettings({ defaultRetryDelay })
      onSettingsChanged(next)
    } catch (err) {
      onNotify('error', `Failed to save retry time: ${err}`)
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

        <section className="settings-section">
          <div className="settings-row">
            <div className="settings-row-main">
              <span className="settings-label">Workflow retry defaults</span>
              <span className="settings-hint">
                Used when Retry is enabled on a workflow that has no saved retry values.
              </span>
            </div>
            <div className="settings-actions">
              <label className="settings-number-field">
                <span>Retries</span>
                <input
                  className="form-input settings-number-input"
                  type="number"
                  min="0"
                  max={MAX_WORKFLOW_RETRY_COUNT}
                  step="1"
                  value={settings.defaultRetryCount}
                  onChange={e => handleDefaultRetryCountChange(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="settings-number-field">
                <span>Time</span>
                <input
                  className="form-input settings-number-input"
                  type="number"
                  min="0"
                  step="0.1"
                  value={settings.defaultRetryDelay / 1000}
                  onChange={e => handleDefaultRetryDelayChange(e.target.value)}
                  disabled={busy}
                />
                <span className="settings-number-unit">s</span>
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
