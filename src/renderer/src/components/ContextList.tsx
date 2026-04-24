import React, { useState, useMemo } from 'react'
import type { ContextBrowserConfig, Workflow } from '../../../shared/types'
import { reorder } from '../utils/reorder'
import ContextCard from './ContextCard'

interface Props {
  contexts: ContextBrowserConfig[]
  workflows: Workflow[]
  runningContextIds: Set<string>
  onLaunch: (id: string) => void
  onClose: (id: string) => void
  onRunWorkflow: (contextId: string, workflowId: string, params: Record<string, string>) => void
  onEdit: (context: ContextBrowserConfig) => void
  onSetWorkflow: (contextId: string, workflowId: string) => void
  onToggleAutoRun: (contextId: string, value: boolean) => void
  onSaveParams: (contextId: string, params: Record<string, string>) => void
  onReorder: (newIds: string[]) => void
  onDelete: (id: string) => void
  onAddContext: () => void
  onLaunchAll: () => void
  onCloseAll: () => void
}

export default function ContextList({
  contexts, workflows, runningContextIds,
  onLaunch, onClose, onRunWorkflow, onEdit, onSetWorkflow, onToggleAutoRun, onSaveParams, onReorder, onDelete,
  onAddContext, onLaunchAll, onCloseAll
}: Props) {
  const anyRunning = contexts.some(c => runningContextIds.has(c.id))
  const allRunning = contexts.length > 0 && contexts.every(c => runningContextIds.has(c.id))

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const displayedContexts = useMemo(() => {
    if (!draggingId || !overId || draggingId === overId) return contexts
    const ids = reorder(contexts.map(c => c.id), draggingId, overId)
    return ids.map(id => contexts.find(c => c.id === id)!)
  }, [contexts, draggingId, overId])

  const handleDrop = (targetId: string) => {
    if (draggingId && draggingId !== targetId) {
      onReorder(reorder(contexts.map(c => c.id), draggingId, targetId))
    }
    setDraggingId(null)
    setOverId(null)
  }

  return (
    <div>
      <div className="context-list-header">
        <span className="context-count">
          {contexts.length} browser{contexts.length !== 1 ? 's' : ''}
        </span>
        <div className="context-list-actions">
          {contexts.length > 0 && (
            allRunning ? (
              <button className="btn btn-danger btn-sm" onClick={onCloseAll}>
                Close All
              </button>
            ) : (
              <button
                className="btn btn-secondary btn-sm"
                onClick={onLaunchAll}
                title="Launch all idle browsers"
              >
                {anyRunning ? 'Launch Remaining' : 'Launch All'}
              </button>
            )
          )}
          <button className="btn btn-primary btn-sm" onClick={onAddContext}>+ Add Browser</button>
        </div>
      </div>

      {contexts.length === 0 ? (
        <div className="empty-state">
          <p>No context browsers in this profile.</p>
          <button className="btn btn-primary" onClick={onAddContext}>Add your first browser</button>
        </div>
      ) : (
        <div className="context-grid">
          {displayedContexts.map(ctx => (
            <div
              key={ctx.id}
              className={[
                'context-card-wrapper',
                draggingId === ctx.id ? 'context-card-wrapper--dragging' : '',
                overId === ctx.id && draggingId !== ctx.id ? 'context-card-wrapper--over' : ''
              ].filter(Boolean).join(' ')}
              draggable
              onDragStart={e => {
                e.dataTransfer.effectAllowed = 'move'
                setDraggingId(ctx.id)
              }}
              onDragEnter={e => {
                e.preventDefault()
                if (ctx.id !== draggingId) setOverId(ctx.id)
              }}
              onDragOver={e => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
              }}
              onDragLeave={e => {
                // Only clear when truly leaving the card, not when moving to a child element
                const wrapper = e.currentTarget as HTMLElement
                if (!wrapper.contains(e.relatedTarget as Node | null)) setOverId(null)
              }}
              onDrop={e => { e.preventDefault(); handleDrop(ctx.id) }}
              onDragEnd={() => { setDraggingId(null); setOverId(null) }}
            >
              <ContextCard
                context={ctx}
                workflow={workflows.find(w => w.id === ctx.workflowId)}
                allWorkflows={workflows}
                isRunning={runningContextIds.has(ctx.id)}
                onLaunch={() => onLaunch(ctx.id)}
                onClose={() => onClose(ctx.id)}
                onEdit={() => onEdit(ctx)}
                onSetWorkflow={workflowId => onSetWorkflow(ctx.id, workflowId)}
                onToggleAutoRun={value => onToggleAutoRun(ctx.id, value)}
                onRunWorkflow={(workflowId, params) => onRunWorkflow(ctx.id, workflowId, params)}
                onSaveParams={params => onSaveParams(ctx.id, params)}
                onDelete={() => onDelete(ctx.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
