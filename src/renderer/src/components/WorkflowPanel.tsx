import React, { useState, useEffect, useCallback } from 'react'
import type { Workflow, WorkflowStep, WorkflowParam } from '../../../shared/types'
import ConfirmModal from './ConfirmModal'

interface Props {
  workflows: Workflow[]
  onSave: (workflow: Workflow) => void
  onDelete: (id: string) => void
}

const STEP_LABELS: Record<WorkflowStep['type'], string> = {
  goto:         'Go to URL',
  fill:         'Fill input',
  click:        'Click',
  wait:         'Wait for element',
  assert:       'Assert visible',
  waitForText:  'Wait for text in URL',
  waitSeconds:  'Wait N seconds',
  closeBrowser: 'Close browser',
}

const STEP_GROUPS: { label: string; types: WorkflowStep['type'][] }[] = [
  { label: 'Navigation',  types: ['goto'] },
  { label: 'Interaction', types: ['fill', 'click'] },
  { label: 'Assertions',  types: ['assert', 'wait', 'waitForText'] },
  { label: 'Timing',      types: ['waitSeconds'] },
  { label: 'Control',     types: ['closeBrowser'] },
]

// ── Icons ──────────────────────────────────────────────────────────────────────

function IconBack() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 8H3m0 0l4-4m-4 4l4 4"/>
    </svg>
  )
}
function IconPlus() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M8 3v10M3 8h10"/>
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
function IconBolt() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M9 1L3 9h4l-1 6 6-8H8l1-6z"/>
    </svg>
  )
}
function IconTrash() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4.5h10M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4.5 4.5L5 13a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l.5-8.5"/>
    </svg>
  )
}
function IconExport() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 13h10"/>
    </svg>
  )
}
function IconGrip() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
      <circle cx="3" cy="2" r="1.2"/><circle cx="7" cy="2" r="1.2"/>
      <circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/>
      <circle cx="3" cy="12" r="1.2"/><circle cx="7" cy="12" r="1.2"/>
    </svg>
  )
}

// ── Workflow list panel ────────────────────────────────────────────────────────

export default function WorkflowPanel({ workflows, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState<Workflow | 'new' | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const deletingWorkflow = workflows.find(w => w.id === deletingId)

  if (editing !== null) {
    const workflow = editing === 'new' ? null : editing
    const existingNames = workflows
      .filter(w => editing === 'new' || w.id !== (editing as Workflow).id)
      .map(w => w.name)
    return (
      <WorkflowEditor
        workflow={workflow}
        existingNames={existingNames}
        onSave={w => { onSave(w); setEditing(null) }}
        onCancel={() => setEditing(null)}
        onDelete={workflow ? () => { onDelete(workflow.id); setEditing(null) } : undefined}
      />
    )
  }

  return (
    <>
      <div className="workflow-panel">
        <div className="workflow-panel-header">
          <h2>Automation Workflows</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
            <IconPlus/> New Workflow
          </button>
        </div>

        <div className="workflow-panel-body">
          {workflows.length === 0 ? (
            <div className="wf-list-empty">
              <div className="wf-empty-ico"><IconBolt/></div>
              <p>No workflows yet. Create one to automate browser actions.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
                <IconPlus/> Create Workflow
              </button>
            </div>
          ) : (
            <div className="wf-list">
              {workflows.map(w => (
                <div key={w.id} className="wf-list-item">
                  <div className="wf-icon"><IconBolt/></div>
                  <div className="wf-list-info">
                    <span className="wf-list-name">{w.name}</span>
                    <div className="wf-list-meta">
                      <span className="wf-list-pill">{w.steps.length} step{w.steps.length !== 1 ? 's' : ''}</span>
                      <span className="wf-list-pill">{w.params.length} param{w.params.length !== 1 ? 's' : ''}</span>
                      {w.params.length > 0 && <span>{w.params.map(p => p.name).join(' · ')}</span>}
                    </div>
                  </div>
                  <div className="wf-list-actions">
                    <button className="btn btn-sm" onClick={() => setEditing(w)}>Edit</button>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => setDeletingId(w.id)}
                      title="Delete workflow"
                    >
                      <IconX/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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

// ── Full-page workflow editor ──────────────────────────────────────────────────

function WorkflowEditor({
  workflow,
  existingNames,
  onSave,
  onCancel,
  onDelete,
}: {
  workflow: Workflow | null
  existingNames: string[]
  onSave: (w: Workflow) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const isNew = workflow === null
  const [name, setName] = useState(workflow?.name ?? '')
  const [nameError, setNameError] = useState('')
  const [params, setParams] = useState<WorkflowParam[]>(workflow?.params ?? [])
  const [steps, setSteps] = useState<WorkflowStep[]>(
    workflow?.steps ?? [{ type: 'goto', url: '' }]
  )

  const canSave = name.trim() !== '' && steps.length > 0

  const handleSave = useCallback(() => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (existingNames.includes(trimmed)) {
      setNameError('A workflow with this name already exists')
      return
    }
    onSave({ id: workflow?.id ?? crypto.randomUUID(), name: trimmed, params, steps })
  }, [name, existingNames, workflow, params, steps, onSave])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canSave) handleSave()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, handleSave, canSave])

  const addParam = () =>
    setParams(p => [...p, { name: '', label: '', defaultValue: '', masked: false }])
  const removeParam = (i: number) => setParams(p => p.filter((_, j) => j !== i))
  const updateParam = (i: number, patch: Partial<WorkflowParam>) =>
    setParams(p => p.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  const addStep = () => setSteps(s => [...s, { type: 'goto', url: '' }])
  const removeStep = (i: number) => setSteps(s => s.filter((_, j) => j !== i))
  const updateStep = (i: number, patch: Partial<WorkflowStep>) =>
    setSteps(s => s.map((x, j) => (j === i ? ({ ...x, ...patch } as WorkflowStep) : x)))

  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  const moveStep = (from: number, to: number) =>
    setSteps(s => {
      const arr = [...s]
      arr.splice(to, 0, arr.splice(from, 1)[0])
      return arr
    })

  const handleExport = () => {
    const blob = new Blob(
      [JSON.stringify({ name, params, steps }, null, 2)],
      { type: 'application/json' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(name || 'workflow').toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = () => {
    if (window.confirm(`Delete "${name}"? Browsers assigned to it will lose their automation.`)) {
      onDelete?.()
    }
  }

  return (
    <div className="wf-editor">
      {/* Header */}
      <div className="wf-editor-hd">
        <button className="wf-editor-back" onClick={onCancel} aria-label="Back">
          <IconBack/>
        </button>
        <span className="wf-editor-title">{isNew ? 'New Workflow' : 'Edit Workflow'}</span>
        <div className="wf-editor-actions">
          {!isNew && (
            <button className="btn btn-ghost btn-sm" onClick={handleExport}>
              <IconExport/> Export
            </button>
          )}
          {!isNew && onDelete && (
            <button className="btn btn-ghost btn-sm" onClick={handleDelete}>
              <IconTrash/> Delete
            </button>
          )}
        </div>
      </div>

      {/* Two-column body */}
      <div className="wf-editor-body">

        {/* Name — full width, row 1 */}
        <div className="wf-ed-section wf-ed-name-card">
          <div className="wf-ed-section-hd">
            <label>Workflow name</label>
            <span className="ed-hint">A short label, e.g. "NUHS Customer Login"</span>
          </div>
          <div className="wf-ed-section-body">
            <input
              autoFocus
              className={`form-input wf-ed-name-input${nameError ? ' form-input--error' : ''}`}
              value={name}
              onChange={e => { setName(e.target.value); setNameError('') }}
              placeholder="e.g. Download Online Data"
            />
            {nameError && <span className="form-input-error">{nameError}</span>}
          </div>
        </div>

        {/* Parameters — left column, row 2 */}
        <div className="wf-ed-section">
          <div className="wf-ed-section-hd">
            <label>Parameters</label>
            <span className="ed-hint">
              {params.length > 0 ? `${params.length} · ` : ''}
              use as <code className="ed-code">{'{{key}}'}</code>
            </span>
            <button className="btn btn-ghost btn-sm wf-ed-add" onClick={addParam}>
              <IconPlus/> Add
            </button>
          </div>
          <div className="wf-ed-section-body flush">
            <div className="wf-ed-params">
              {params.length === 0 ? (
                <div className="wf-ed-empty">
                  <div className="wf-ed-empty-ico">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M3 6h10M3 10h7"/><circle cx="13" cy="10" r="1.2"/>
                    </svg>
                  </div>
                  <span>No parameters yet</span>
                  <button className="btn btn-sm" onClick={addParam}><IconPlus/> Add parameter</button>
                </div>
              ) : params.map((p, i) => (
                <div key={i} className="wf-ed-param-card">
                  <div className="wf-ed-param-card-hd">
                    <span className="wf-ed-param-num">{i + 1}</span>
                    <span>Parameter</span>
                    <button className="wf-ed-param-x" onClick={() => removeParam(i)} title="Remove">
                      <IconX/>
                    </button>
                  </div>
                  <div className="wf-ed-pair">
                    <div className="wf-ed-field">
                      <span className="wf-ed-field-lbl">Key</span>
                      <input
                        className="form-input"
                        value={p.name}
                        onChange={e => updateParam(i, { name: e.target.value })}
                        placeholder="email"
                      />
                    </div>
                    <div className="wf-ed-field">
                      <span className="wf-ed-field-lbl">Display label</span>
                      <input
                        className="form-input"
                        value={p.label}
                        onChange={e => updateParam(i, { label: e.target.value })}
                        placeholder="Email address"
                      />
                    </div>
                  </div>
                  <div className="wf-ed-field">
                    <span className="wf-ed-field-lbl">Default value</span>
                    <input
                      className="form-input"
                      value={p.defaultValue ?? ''}
                      onChange={e => updateParam(i, { defaultValue: e.target.value })}
                      placeholder="(optional)"
                    />
                  </div>
                  <label className="wf-ed-param-mask">
                    <span>Mask value (password)</span>
                    <input
                      type="checkbox"
                      className="toggle-switch"
                      checked={p.masked ?? false}
                      onChange={e => updateParam(i, { masked: e.target.checked })}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Steps — right column, row 2 */}
        <div className="wf-ed-section">
          <div className="wf-ed-section-hd">
            <label>Steps</label>
            <span className="ed-hint">{steps.length} · run top-to-bottom</span>
            <button className="btn btn-ghost btn-sm wf-ed-add" onClick={addStep}>
              <IconPlus/> Add step
            </button>
          </div>
          <div className="wf-ed-section-body flush">
            <div className="wf-ed-steps">
              {steps.length === 0 ? (
                <div className="wf-ed-empty">
                  <div className="wf-ed-empty-ico"><IconBolt/></div>
                  <span>No steps yet</span>
                  <button className="btn btn-sm" onClick={addStep}><IconPlus/> Add first step</button>
                </div>
              ) : steps.map((step, i) => (
                <StepRow
                  key={i}
                  step={step}
                  index={i}
                  onUpdate={patch => updateStep(i, patch)}
                  onRemove={() => removeStep(i)}
                  dragging={draggingIdx === i}
                  over={overIdx === i && draggingIdx !== i}
                  onDragStart={() => setDraggingIdx(i)}
                  onDragEnter={() => { if (i !== draggingIdx) setOverIdx(i) }}
                  onDragLeave={() => setOverIdx(null)}
                  onDrop={() => {
                    if (draggingIdx !== null && draggingIdx !== i) moveStep(draggingIdx, i)
                    setDraggingIdx(null)
                    setOverIdx(null)
                  }}
                  onDragEnd={() => { setDraggingIdx(null); setOverIdx(null) }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="wf-editor-foot">
        <div className="wf-editor-foot-left">
          <span>{params.length} param{params.length === 1 ? '' : 's'}</span>
          <span>·</span>
          <span>{steps.length} step{steps.length === 1 ? '' : 's'}</span>
          <span className="wf-editor-foot-pill">Ctrl Enter to save</span>
        </div>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={!canSave}>
          Save Workflow
        </button>
      </div>
    </div>
  )
}

// ── Step row ──────────────────────────────────────────────────────────────────

function StepRow({
  step, index, onUpdate, onRemove,
  dragging, over, onDragStart, onDragEnter, onDragLeave, onDrop, onDragEnd,
}: {
  step: WorkflowStep
  index: number
  onUpdate: (patch: Partial<WorkflowStep>) => void
  onRemove: () => void
  dragging: boolean
  over: boolean
  onDragStart: () => void
  onDragEnter: () => void
  onDragLeave: () => void
  onDrop: () => void
  onDragEnd: () => void
}) {
  const changeType = (type: WorkflowStep['type']) =>
    onUpdate({ type, selector: undefined, url: undefined, value: undefined, timeout: undefined })

  const renderFields = () => {
    switch (step.type) {
      case 'goto':
        return (
          <input
            className="form-input wf-ed-step-single"
            value={step.url ?? ''}
            onChange={e => onUpdate({ url: e.target.value })}
            placeholder="https://example.com or {{param}}"
          />
        )
      case 'click':
        return (
          <input
            className="form-input wf-ed-step-single"
            value={step.selector ?? ''}
            onChange={e => onUpdate({ selector: e.target.value })}
            placeholder="CSS selector, e.g. button[type=submit]"
          />
        )
      case 'assert':
        return (
          <input
            className="form-input wf-ed-step-single"
            value={step.selector ?? ''}
            onChange={e => onUpdate({ selector: e.target.value })}
            placeholder="CSS selector"
          />
        )
      case 'fill':
        return (
          <>
            <input
              className="form-input"
              value={step.selector ?? ''}
              onChange={e => onUpdate({ selector: e.target.value })}
              placeholder="CSS selector"
            />
            <input
              className="form-input"
              value={step.value ?? ''}
              onChange={e => onUpdate({ value: e.target.value })}
              placeholder="Value or {{param}}"
            />
          </>
        )
      case 'wait':
        return (
          <>
            <input
              className="form-input"
              value={step.selector ?? ''}
              onChange={e => onUpdate({ selector: e.target.value })}
              placeholder="CSS selector to wait for"
            />
            <TimeoutCell step={step} onUpdate={onUpdate}/>
          </>
        )
      case 'waitForText':
        return (
          <>
            <input
              className="form-input"
              value={step.value ?? ''}
              onChange={e => onUpdate({ value: e.target.value })}
              placeholder="e.g. order_id= or {{param}}"
            />
            <TimeoutCell step={step} onUpdate={onUpdate}/>
          </>
        )
      case 'waitSeconds':
        return (
          <input
            className="form-input wf-ed-step-single"
            type="number"
            min="0"
            step="0.5"
            value={step.timeout != null ? step.timeout / 1000 : ''}
            onChange={e => onUpdate({ timeout: e.target.value ? Math.round(parseFloat(e.target.value) * 1000) : undefined })}
            placeholder="seconds, e.g. 3"
          />
        )
      case 'closeBrowser':
        return <div className="wf-ed-step-no-fields">— no additional fields required —</div>
    }
  }

  return (
    <div
      className={['wf-ed-step', dragging ? 'wf-ed-step--dragging' : '', over ? 'wf-ed-step--over' : ''].filter(Boolean).join(' ')}
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
      onDragEnter={e => { e.preventDefault(); onDragEnter() }}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
      onDragLeave={e => {
        if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) onDragLeave()
      }}
      onDrop={e => { e.preventDefault(); onDrop() }}
      onDragEnd={onDragEnd}
    >
      <div className="wf-ed-step-handle" title="Drag to reorder"><IconGrip/></div>
      <div className="wf-ed-step-num">{index + 1}</div>
      <select
        className="form-select"
        value={step.type}
        onChange={e => changeType(e.target.value as WorkflowStep['type'])}
      >
        {STEP_GROUPS.map(g => (
          <optgroup key={g.label} label={g.label}>
            {g.types.map(t => (
              <option key={t} value={t}>{STEP_LABELS[t]}</option>
            ))}
          </optgroup>
        ))}
      </select>
      {renderFields()}
      <button className="wf-ed-step-x" onClick={onRemove} title="Remove step">
        <IconX/>
      </button>
    </div>
  )
}

function TimeoutCell({
  step, onUpdate,
}: {
  step: WorkflowStep
  onUpdate: (patch: Partial<WorkflowStep>) => void
}) {
  return (
    <div className="wf-ed-timeout-cell">
      {step.timeout !== 0 && (
        <input
          className="form-input"
          type="number"
          min="0"
          step="0.5"
          value={step.timeout != null ? step.timeout / 1000 : ''}
          onChange={e =>
            onUpdate({ timeout: e.target.value ? Math.round(parseFloat(e.target.value) * 1000) : undefined })
          }
          placeholder={step.type === 'waitForText' ? '30 s' : '10 s'}
        />
      )}
      <button
        type="button"
        className={`wf-step-infinite${step.timeout === 0 ? ' wf-step-infinite--on' : ''}`}
        onClick={() => onUpdate({ timeout: step.timeout === 0 ? undefined : 0 })}
        title={step.timeout === 0 ? 'Infinite wait — click to set a timeout' : 'No timeout limit'}
      >∞</button>
    </div>
  )
}
