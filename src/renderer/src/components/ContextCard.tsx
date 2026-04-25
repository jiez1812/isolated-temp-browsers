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

function IconBolt({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M9 1L3 9h4l-1 6 6-8H8l1-6z"/>
    </svg>
  )
}
function IconX() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M4 4l8 8M12 4l-8 8"/>
    </svg>
  )
}
function IconPlay() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 3l9 5-9 5V3z"/>
    </svg>
  )
}
function IconStop() {
  return (
    <svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor">
      <rect x="3" y="3" width="10" height="10" rx="1.5"/>
    </svg>
  )
}
function IconEdit() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2l3 3-8 8H3v-3l8-8z"/>
    </svg>
  )
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

  const cardAccent = context.color ?? 'oklch(0.64 0.17 265)'

  return (
    <>
      <div
        className="context-card"
        data-running={isRunning}
        style={{ '--card-accent': cardAccent } as React.CSSProperties}
      >
        {/* Head: status pill + remove button */}
        <div className="context-card-head">
          <span className={`status-pill${isRunning ? ' running' : ''}`}>
            <span className="dot"/>
            {isRunning ? 'LIVE' : 'IDLE'}
          </span>
          <button
            className="context-card-close"
            onClick={() => setShowDeleteConfirm(true)}
            title="Remove browser"
          >
            <IconX/>
          </button>
        </div>

        {/* Name, URL, meta */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="context-card-name">
              <span className="context-card-name-dot"/>
              {context.name}
            </div>
            <button
              className="context-card-edit"
              onClick={onEdit}
              title="Edit browser"
            >
              <IconEdit/>
            </button>
          </div>
          <div style={{ height: 8 }}/>
          <div className="context-url" title={context.startupUrl}>{context.startupUrl}</div>
          <div style={{ height: 8 }}/>
          <div className="context-meta">
            <span>{context.windowSize.width}×{context.windowSize.height}</span>
            <span>·</span>
            <span>isolated context</span>
          </div>
        </div>

        {/* Launch / Stop */}
        {isRunning ? (
          <button className="btn btn-danger btn-wide" onClick={onClose}>
            <IconStop/>Stop
          </button>
        ) : (
          <button className="btn btn-primary btn-wide" onClick={onLaunch}>
            <IconPlay/>Launch
          </button>
        )}

        {/* Workflow section */}
        {workflow ? (
          <div className="card-workflow">
            <div className="card-workflow-head">
              <IconBolt className="bolt"/>
              <span>{workflow.name}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10.5, color: 'var(--fg-3)', fontFamily: 'var(--mono)' }}>
                  {workflow.steps.length} steps
                </span>
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  title="Change workflow"
                  onClick={() => setShowWorkflowPicker(v => !v)}
                >
                  <IconX/>
                </button>
              </div>
            </div>
            <div className="card-workflow-body">
              {showWorkflowPicker && (
                <select
                  className="workflow-picker-select"
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
                <span>Auto-run on launch</span>
                <input
                  type="checkbox"
                  className="toggle-switch"
                  checked={context.runWorkflowOnLaunch ?? false}
                  onChange={e => onToggleAutoRun(e.target.checked)}
                />
              </div>

              {workflow.params.length > 0 && workflow.params.map(p => (
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

              <button
                className="btn btn-secondary btn-sm btn-wide"
                onClick={handleRunWorkflow}
                disabled={!isRunning}
                title={isRunning ? undefined : 'Launch browser first'}
              >
                Run Workflow
              </button>
            </div>
          </div>
        ) : (
          <div className="card-workflow">
            <div className="card-workflow-body" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="workflow-none">No workflow</span>
              {allWorkflows.length > 0 ? (
                showWorkflowPicker ? (
                  <select
                    className="workflow-picker-select"
                    defaultValue=""
                    autoFocus
                    onChange={e => {
                      if (e.target.value) {
                        onSetWorkflow(e.target.value)
                        setShowWorkflowPicker(false)
                      }
                    }}
                    onBlur={() => setShowWorkflowPicker(false)}
                    style={{ flex: 1, marginLeft: 8 }}
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
