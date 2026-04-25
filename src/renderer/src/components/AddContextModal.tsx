import React, { useState, useEffect } from 'react'
import type { ContextBrowserConfig, Workflow } from '../../../shared/types'

interface Props {
  workflows: Workflow[]
  initialConfig?: ContextBrowserConfig
  onSave: (config: ContextBrowserConfig) => void
  onCancel: () => void
}

export const PALETTE = ['#e05c5c', '#e07c3c', '#d4b44a', '#5cc05c', '#3cb8b8', '#5b8af0', '#9b6be0', '#d45cb8']

export default function AddContextModal({ workflows, initialConfig, onSave, onCancel }: Props) {
  const isEdit = !!initialConfig
  const [name, setName] = useState(initialConfig?.name ?? '')
  const [url, setUrl] = useState(initialConfig?.startupUrl ?? 'https://')
  const [width, setWidth] = useState(String(initialConfig?.windowSize.width ?? 1280))
  const [height, setHeight] = useState(String(initialConfig?.windowSize.height ?? 800))
  const [workflowId, setWorkflowId] = useState(initialConfig?.workflowId ?? '')
  const [color, setColor] = useState(initialConfig?.color ?? PALETTE[0])

  useEffect(() => {
    if (initialConfig) {
      setName(initialConfig.name)
      setUrl(initialConfig.startupUrl)
      setWidth(String(initialConfig.windowSize.width))
      setHeight(String(initialConfig.windowSize.height))
      setWorkflowId(initialConfig.workflowId ?? '')
      setColor(initialConfig.color ?? PALETTE[0])
    }
  }, [initialConfig?.id])

  const isValidUrl = (u: string) => /^https?:\/\//i.test(u.trim())

  const handleSave = () => {
    const trimName = name.trim()
    const trimUrl = url.trim()
    if (!trimName || !isValidUrl(trimUrl)) return

    onSave({
      id: initialConfig?.id ?? crypto.randomUUID(),
      name: trimName,
      color,
      startupUrl: trimUrl,
      windowSize: { width: parseInt(width) || 1280, height: parseInt(height) || 800 },
      workflowId: workflowId || undefined,
      workflowParams: initialConfig?.workflowParams,
      runWorkflowOnLaunch: initialConfig?.runWorkflowOnLaunch
    })
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onCancel()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel()
  }

  const isValid = name.trim().length > 0 && isValidUrl(url)

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} onKeyDown={handleKeyDown}>
      <div className="modal">
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Context Browser' : 'Add Context Browser'}</h2>
          <button className="btn-icon" onClick={onCancel} aria-label="Close">×</button>
        </div>

        <div className="modal-body">
          <div className="form-row">
            <label className="form-label">Name</label>
            <input
              autoFocus
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. User A"
            />
          </div>

          <div className="form-row">
            <label className="form-label">Startup URL</label>
            <input
              className="form-input"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="form-row form-row--inline">
            <div className="form-field">
              <label className="form-label">Width</label>
              <input
                className="form-input form-input--sm"
                type="number"
                min="400"
                max="3840"
                value={width}
                onChange={e => setWidth(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Height</label>
              <input
                className="form-input form-input--sm"
                type="number"
                min="300"
                max="2160"
                value={height}
                onChange={e => setHeight(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">Color</label>
            <div className="color-palette">
              {PALETTE.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch${color === c ? ' color-swatch--selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">Automation Workflow</label>
            <select className="form-input" value={workflowId} onChange={e => setWorkflowId(e.target.value)}>
              <option value="">None</option>
              {workflows.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!isValid}>
            {isEdit ? 'Save Changes' : 'Add Browser'}
          </button>
        </div>
      </div>
    </div>
  )
}
