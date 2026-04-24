import React, { useState } from 'react'
import type { Workflow, WorkflowStep, WorkflowParam } from '../../../shared/types'
import ConfirmModal from './ConfirmModal'

interface Props {
  workflows: Workflow[]
  onSave: (workflow: Workflow) => void
  onDelete: (id: string) => void
}

export default function WorkflowManagerModal({ workflows, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState<Workflow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleNew = () =>
    setEditing({ id: crypto.randomUUID(), name: '', steps: [], params: [] })

  if (editing) {
    const existingNames = workflows
      .filter(w => w.id !== editing.id)
      .map(w => w.name)
    return (
      <WorkflowEditor
        workflow={editing}
        existingNames={existingNames}
        onSave={w => { onSave(w); setEditing(null) }}
        onCancel={() => setEditing(null)}
      />
    )
  }

  const deletingWorkflow = workflows.find(w => w.id === deletingId)

  return (
    <>
      <div className="workflow-panel">
        <div className="workflow-panel-header">
          <h2>Automation Workflows</h2>
        </div>

        <div className="workflow-panel-body">
          {workflows.length === 0 ? (
            <div className="wf-list-empty">
              <p>No workflows yet. Create one to automate browser actions.</p>
            </div>
          ) : (
            <div className="wf-list">
              {workflows.map(w => (
                <div key={w.id} className="wf-list-item">
                  <div className="wf-list-info">
                    <span className="wf-list-name">{w.name}</span>
                    <span className="wf-list-meta">
                      {w.steps.length} step{w.steps.length !== 1 ? 's' : ''}
                      {w.params.length > 0 ? ` · ${w.params.length} param${w.params.length !== 1 ? 's' : ''}` : ''}
                    </span>
                  </div>
                  <div className="wf-list-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(w)}>Edit</button>
                    <button
                      className="btn-icon btn-icon--danger"
                      onClick={() => setDeletingId(w.id)}
                      title="Delete workflow"
                    >×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="workflow-panel-footer">
          <button className="btn btn-primary" onClick={handleNew}>+ New Workflow</button>
        </div>
      </div>

      {deletingId && deletingWorkflow && (
        <ConfirmModal
          title="Delete Workflow"
          message={`Delete "${deletingWorkflow.name}"? Browsers assigned to it will lose their automation.`}
          confirmLabel="Delete"
          onConfirm={() => { onDelete(deletingId); setDeletingId(null) }}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </>
  )
}

// ── Workflow editor ────────────────────────────────────────────────────────────

const STEP_LABELS: Record<WorkflowStep['type'], string> = {
  goto: 'Go to URL',
  fill: 'Fill input',
  click: 'Click',
  wait: 'Wait for element',
  assert: 'Assert visible'
}

function WorkflowEditor({
  workflow,
  existingNames,
  onSave,
  onCancel
}: {
  workflow: Workflow
  existingNames: string[]
  onSave: (w: Workflow) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(workflow.name)
  const [nameError, setNameError] = useState('')
  const [steps, setSteps] = useState<WorkflowStep[]>(workflow.steps)
  const [params, setParams] = useState<WorkflowParam[]>(workflow.params)

  const addStep = () => setSteps(prev => [...prev, { type: 'goto', url: '' }])
  const removeStep = (i: number) => setSteps(prev => prev.filter((_, idx) => idx !== i))
  const updateStep = (i: number, partial: Partial<WorkflowStep>) =>
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, ...partial } : s))

  const addParam = () => setParams(prev => [...prev, { name: '', label: '', defaultValue: '' }])
  const removeParam = (i: number) => setParams(prev => prev.filter((_, idx) => idx !== i))
  const updateParam = (i: number, partial: Partial<WorkflowParam>) =>
    setParams(prev => prev.map((p, idx) => idx === i ? { ...p, ...partial } : p))

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (existingNames.includes(trimmed)) {
      setNameError('A workflow with this name already exists')
      return
    }
    onSave({ ...workflow, name: trimmed, steps, params })
  }

  const isNew = !workflow.name

  return (
    <div className="modal-overlay">
      <div className="modal modal--lg">
        <div className="modal-header">
          <h2>{isNew ? 'New Workflow' : 'Edit Workflow'}</h2>
          <button className="btn-icon" onClick={onCancel} aria-label="Back">←</button>
        </div>

        <div className="modal-body modal-body--scroll">
          <div className="form-row">
            <label className="form-label">Workflow Name</label>
            <input
              autoFocus
              className={`form-input${nameError ? ' form-input--error' : ''}`}
              value={name}
              onChange={e => { setName(e.target.value); setNameError('') }}
              placeholder="e.g. Login Flow"
            />
            {nameError && <span className="form-input-error">{nameError}</span>}
          </div>

          {/* Parameters */}
          <div className="wf-section">
            <div className="wf-section-header">
              <span className="wf-section-title">Parameters</span>
              <button className="btn btn-ghost btn-sm" onClick={addParam}>+ Add</button>
            </div>
            {params.length === 0 ? (
              <p className="wf-hint">Parameters let you customize values at runtime using {'{{name}}'} in step fields.</p>
            ) : (
              <div className="wf-param-header">
                <span>Key name</span><span>Display label</span><span>Default value</span><span>Mask</span>
              </div>
            )}
            {params.map((p, i) => (
              <div key={i} className="wf-param-row">
                <input
                  className="form-input"
                  value={p.name}
                  onChange={e => updateParam(i, { name: e.target.value })}
                  placeholder="username"
                />
                <input
                  className="form-input"
                  value={p.label}
                  onChange={e => updateParam(i, { label: e.target.value })}
                  placeholder="Username"
                />
                <input
                  className="form-input"
                  value={p.defaultValue ?? ''}
                  onChange={e => updateParam(i, { defaultValue: e.target.value })}
                  placeholder="(optional)"
                />
                <button
                  type="button"
                  className={`toggle-switch wf-param-mask-toggle${p.masked ? ' toggle-switch--on' : ''}`}
                  onClick={() => updateParam(i, { masked: !p.masked })}
                  role="switch"
                  aria-checked={p.masked ?? false}
                  title={p.masked ? 'Masked — input hidden in UI and debug log' : 'Not masked'}
                />
                <button className="btn-icon btn-icon--danger" onClick={() => removeParam(i)}>×</button>
              </div>
            ))}
          </div>

          {/* Steps */}
          <div className="wf-section">
            <div className="wf-section-header">
              <span className="wf-section-title">Steps</span>
              <button className="btn btn-ghost btn-sm" onClick={addStep}>+ Add Step</button>
            </div>
            {steps.length === 0 && (
              <p className="wf-hint">Steps run in order against the browser context.</p>
            )}
            {steps.map((step, i) => (
              <div key={i} className="wf-step-row">
                <span className="wf-step-num">{i + 1}</span>
                <select
                  className="form-input wf-step-type"
                  value={step.type}
                  onChange={e => {
                    const type = e.target.value as WorkflowStep['type']
                    updateStep(i, { type, selector: undefined, url: undefined, value: undefined, timeout: undefined })
                  }}
                >
                  {(Object.keys(STEP_LABELS) as WorkflowStep['type'][]).map(t => (
                    <option key={t} value={t}>{STEP_LABELS[t]}</option>
                  ))}
                </select>

                {step.type === 'goto' && (
                  <input
                    className="form-input"
                    value={step.url ?? ''}
                    onChange={e => updateStep(i, { url: e.target.value })}
                    placeholder="https://example.com or {{param}}"
                  />
                )}
                {(step.type === 'fill' || step.type === 'click' || step.type === 'wait' || step.type === 'assert') && (
                  <input
                    className="form-input"
                    value={step.selector ?? ''}
                    onChange={e => updateStep(i, { selector: e.target.value })}
                    placeholder="CSS selector"
                  />
                )}
                {step.type === 'fill' && (
                  <input
                    className="form-input"
                    value={step.value ?? ''}
                    onChange={e => updateStep(i, { value: e.target.value })}
                    placeholder="value or {{param}}"
                  />
                )}
                {(step.type === 'wait' || step.type === 'assert') && (
                  <input
                    className="form-input wf-step-timeout"
                    type="number"
                    value={step.timeout ?? ''}
                    onChange={e => updateStep(i, { timeout: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="ms"
                  />
                )}
                <button className="btn-icon btn-icon--danger" onClick={() => removeStep(i)}>×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!name.trim()}>
            Save Workflow
          </button>
        </div>
      </div>
    </div>
  )
}
