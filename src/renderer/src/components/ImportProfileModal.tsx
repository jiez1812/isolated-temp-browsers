import React, { useState } from 'react'
import type { ProfileExport, AvailableBrowsers, BrowserType } from '../../../shared/types'

interface Props {
  data: ProfileExport
  /** Name of the existing profile that conflicts, or null if no conflict */
  conflictingName: string | null
  onImport: (data: ProfileExport, resolvedName: string, replaceExistingId: string | null) => void
  onCancel: () => void
  existingProfiles: { id: string; name: string }[]
  availableBrowsers: AvailableBrowsers
}

const BROWSER_LABEL: Record<BrowserType, string> = {
  edge: 'Edge',
  chrome: 'Chrome',
  firefox: 'Firefox',
}

export default function ImportProfileModal({
  data,
  conflictingName,
  onImport,
  onCancel,
  existingProfiles,
  availableBrowsers,
}: Props) {
  const originalName = data.profile.name
  const [customName, setCustomName] = useState(conflictingName ? `${originalName} (imported)` : originalName)
  const [nameError, setNameError] = useState('')
  const [mode, setMode] = useState<'rename' | 'replace'>(conflictingName ? 'rename' : 'rename')

  const conflictingProfile = existingProfiles.find(p => p.name === conflictingName)

  // Compute contexts whose browserType isn't available on this machine
  const unavailableGroups = (['chrome', 'firefox'] as BrowserType[])
    .filter(bt => !availableBrowsers[bt])
    .map(bt => ({
      browser: bt,
      label: BROWSER_LABEL[bt],
      contexts: data.profile.contexts.filter(c => c.browserType === bt).map(c => c.name),
    }))
    .filter(g => g.contexts.length > 0)

  const fallbackLabel = BROWSER_LABEL[
    availableBrowsers.edge ? 'edge' : availableBrowsers.chrome ? 'chrome' : 'firefox'
  ]

  const validateName = (name: string): string => {
    if (!name.trim()) return 'Name cannot be empty'
    if (name.trim() !== conflictingName && existingProfiles.some(p => p.name === name.trim()))
      return 'A profile with this name already exists'
    return ''
  }

  const handleImport = () => {
    if (mode === 'rename') {
      const err = validateName(customName)
      if (err) { setNameError(err); return }
      onImport(data, customName.trim(), null)
    } else {
      onImport(data, originalName, conflictingProfile?.id ?? null)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onCancel()
  }

  const ctxCount = data.profile.contexts.length
  const wfCount = data.profile.workflows?.length ?? 0

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal modal--sm">
        <div className="modal-header">
          <h2>Import Profile</h2>
          <button className="btn-icon" onClick={onCancel} aria-label="Close">×</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--fg)', fontWeight: 600 }}>{originalName}</strong>
            {' '}—{' '}
            {ctxCount} browser{ctxCount !== 1 ? 's' : ''}
            {wfCount > 0 && `, ${wfCount} workflow${wfCount !== 1 ? 's' : ''}`}
          </div>

          {unavailableGroups.length > 0 && (
            <div style={{
              padding: '8px 10px',
              borderRadius: 8,
              background: 'oklch(0.8 0.15 80 / 0.08)',
              border: '0.5px solid oklch(0.8 0.15 80 / 0.3)',
              fontSize: 12,
              color: 'oklch(0.85 0.1 80)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              <strong style={{ fontWeight: 600 }}>Browser compatibility</strong>
              {unavailableGroups.map(g => (
                <div key={g.browser}>
                  <span style={{ color: 'var(--fg-2)' }}>
                    {g.label} is not installed —{' '}
                    <span style={{ color: 'var(--fg-3)' }}>{g.contexts.join(', ')}</span>
                  </span>
                  <br />
                  <span style={{ color: 'oklch(0.75 0.08 80)' }}>
                    Will launch with {fallbackLabel} instead
                  </span>
                </div>
              ))}
            </div>
          )}

          {conflictingName && (
            <div style={{
              padding: '8px 10px',
              borderRadius: 8,
              background: 'oklch(0.6 0.2 25 / 0.12)',
              border: '0.5px solid oklch(0.6 0.2 25 / 0.3)',
              fontSize: 12,
              color: 'oklch(0.8 0.12 25)',
            }}>
              A profile named <strong>"{conflictingName}"</strong> already exists. Choose how to proceed:
            </div>
          )}

          {conflictingName && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                <input
                  type="radio"
                  name="import-mode"
                  checked={mode === 'rename'}
                  onChange={() => setMode('rename')}
                  style={{ marginTop: 2 }}
                />
                <span>
                  <span style={{ color: 'var(--fg)', fontWeight: 500 }}>Import as a new profile</span>
                  <br />
                  <span style={{ color: 'var(--fg-3)' }}>Keep the existing profile and import under a different name</span>
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                <input
                  type="radio"
                  name="import-mode"
                  checked={mode === 'replace'}
                  onChange={() => setMode('replace')}
                  style={{ marginTop: 2 }}
                />
                <span>
                  <span style={{ color: 'var(--fg)', fontWeight: 500 }}>Replace existing profile</span>
                  <br />
                  <span style={{ color: 'var(--fg-3)' }}>Delete "{conflictingName}" and import the new one</span>
                </span>
              </label>
            </div>
          )}

          {mode === 'rename' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Profile name
              </label>
              <input
                autoFocus
                className="profile-create-input"
                style={{ width: '100%' }}
                value={customName}
                onChange={e => { setCustomName(e.target.value); setNameError('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleImport() }}
              />
              {nameError && <div className="profile-create-error">{nameError}</div>}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            className={`btn ${mode === 'replace' ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleImport}
          >
            {mode === 'replace' ? 'Replace & Import' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
