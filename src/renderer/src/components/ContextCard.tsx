import React, { useState, useEffect } from 'react'
import type { ContextBrowserConfig, Workflow } from '../../../shared/types'
import ConfirmModal from './ConfirmModal'

interface Props {
  context: ContextBrowserConfig
  workflow?: Workflow
  allWorkflows: Workflow[]
  isRunning: boolean
  onLaunch: () => void
  onClose: () => void
  onEdit: () => void
  onSetWorkflow: (workflowId: string) => void
  onToggleAutoRun: (value: boolean) => void
  onRunWorkflow: (workflowId: string, params: Record<string, string>) => void
  onSaveParams: (params: Record<string, string>) => void
  onDelete: () => void
}

export default function ContextCard({
  context, workflow, allWorkflows, isRunning,
  onLaunch, onClose, onEdit, onSetWorkflow, onToggleAutoRun, onRunWorkflow, onSaveParams, onDelete
}: Props) {
  const [paramValues, setParamValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (workflow?.params ?? []).map(p => [p.name, context.workflowParams?.[p.name] ?? p.defaultValue ?? ''])
    )
  )
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showWorkflowPicker, setShowWorkflowPicker] = useState(false)

  useEffect(() => {
    setParamValues(
      Object.fromEntries(
        (workflow?.params ?? []).map(p => [p.name, context.workflowParams?.[p.name] ?? p.defaultValue ?? ''])
      )
    )
  }, [workflow?.id, context.workflowParams])

  const handleRunWorkflow = () => {
    if (workflow) onRunWorkflow(workflow.id, paramValues)
  }

  const cardStyle: React.CSSProperties = context.color
    ? { borderLeftColor: context.color, borderLeftWidth: '3px' }
    : {}

  return (
    <>
      <div className={`context-card${isRunning ? ' context-card--running' : ''}`} style={cardStyle}>
        <div className="context-card-header">
          <div className="context-card-title">
            <span className={`status-badge${isRunning ? ' status-badge--running' : ' status-badge--idle'}`}>
              {isRunning ? 'Running' : 'Idle'}
            </span>
            <div className="context-name-row">
              {context.color && <span className="context-color-dot" style={{ background: context.color }} />}
              <h3 className="context-name">{context.name}</h3>
            </div>
          </div>
          <div className="context-card-actions">
            <button className="btn-icon" onClick={onEdit} title="Edit browser">✎</button>
            <button
              className="btn-icon btn-icon--danger"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete browser"
            >
              ×
            </button>
          </div>
        </div>

        <div className="context-url" title={context.startupUrl}>{context.startupUrl}</div>
        <div className="context-meta">{context.windowSize.width} × {context.windowSize.height}</div>

        <div className="context-actions">
          {isRunning ? (
            <button className="btn btn-danger btn-sm" onClick={onClose}>Close</button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={onLaunch}>Launch</button>
          )}
        </div>

        {workflow ? (
          <div className="context-workflow">
            <div className="workflow-name-row">
              <span className="workflow-name">⚡ {workflow.name}</span>
              <button
                className="btn-icon workflow-change-btn"
                title="Change workflow"
                onClick={() => setShowWorkflowPicker(v => !v)}
              >
                ✎
              </button>
            </div>

            {showWorkflowPicker && (
              <select
                className="form-input"
                value={context.workflowId ?? ''}
                autoFocus
                onChange={e => { onSetWorkflow(e.target.value); setShowWorkflowPicker(false) }}
                onBlur={() => setShowWorkflowPicker(false)}
              >
                <option value="">None — remove workflow</option>
                {allWorkflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            )}

            <div className="workflow-autorun-row">
              <span className="workflow-autorun-label">Auto-run on launch</span>
              <button
                className={`toggle-switch${context.runWorkflowOnLaunch ? ' toggle-switch--on' : ''}`}
                onClick={() => onToggleAutoRun(!context.runWorkflowOnLaunch)}
                role="switch"
                aria-checked={context.runWorkflowOnLaunch ?? false}
                title={context.runWorkflowOnLaunch ? 'Will run automatically on launch' : 'Manual run only'}
              />
            </div>

            {workflow.params.length > 0 && (
              <div className="workflow-params">
                {workflow.params.map(p => (
                  <div key={p.name} className="param-row">
                    <label className="param-label">{p.label}</label>
                    <input
                      className="param-input"
                      type={p.masked ? 'password' : 'text'}
                      value={paramValues[p.name] ?? ''}
                      onChange={e => setParamValues(prev => ({ ...prev, [p.name]: e.target.value }))}
                      onBlur={() => onSaveParams(paramValues)}
                      placeholder={p.defaultValue}
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn btn-secondary btn-sm"
              onClick={handleRunWorkflow}
              disabled={!isRunning}
              title={isRunning ? undefined : 'Launch browser first'}
            >
              Run Workflow
            </button>
          </div>
        ) : (
          <div className="context-workflow context-workflow--empty">
            <span className="workflow-none">No workflow</span>
            {allWorkflows.length > 0 ? (
              showWorkflowPicker ? (
                <select
                  className="form-input workflow-picker-select"
                  defaultValue=""
                  autoFocus
                  onChange={e => { if (e.target.value) onSetWorkflow(e.target.value); setShowWorkflowPicker(false) }}
                  onBlur={() => setShowWorkflowPicker(false)}
                >
                  <option value="" disabled>Select workflow…</option>
                  {allWorkflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => setShowWorkflowPicker(true)}>
                  + Set Workflow
                </button>
              )
            ) : (
              <span className="workflow-hint">Create a workflow first</span>
            )}
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Browser"
          message={`Delete "${context.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => { setShowDeleteConfirm(false); onDelete() }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  )
}
