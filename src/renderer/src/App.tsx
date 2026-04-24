import React, { useState, useEffect, useCallback } from 'react'
import type { ContextBrowserConfig, Profile, Workflow } from '../../shared/types'
import type { DebugLogEvent } from '../../shared/ipc'
import ProfileSelector from './components/ProfileSelector'
import ContextList from './components/ContextList'
import AddContextModal from './components/AddContextModal'
import WorkflowManagerModal from './components/WorkflowManagerModal'
import ToastContainer, { type ToastItem } from './components/Toast'
import WindowControls from './components/WindowControls'
import DebugConsole from './components/DebugConsole'

function App(): React.JSX.Element {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const [allContexts, setAllContexts] = useState<ContextBrowserConfig[]>([])
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [runningContextIds, setRunningContextIds] = useState<Set<string>>(new Set())
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [debugLogs, setDebugLogs] = useState<DebugLogEvent[]>([])
  const [showAddContext, setShowAddContext] = useState(false)
  const [editingContext, setEditingContext] = useState<ContextBrowserConfig | null>(null)
  const [showWorkflowManager, setShowWorkflowManager] = useState(false)

  const addToast = useCallback((type: ToastItem['type'], message: string) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }, [])

  const loadProfiles = useCallback(async () => {
    const list = await window.api.listProfiles()
    setProfiles(list)
  }, [])

  const loadContexts = useCallback(async () => {
    const list = await window.api.listContexts()
    setAllContexts(list)
  }, [])

  const loadWorkflows = useCallback(async () => {
    const list = await window.api.listWorkflows()
    setWorkflows(list)
  }, [])

  useEffect(() => {
    loadProfiles()
    loadContexts()
    loadWorkflows()

    const unsubStatus = window.api.onWorkflowStatus(event => {
      const type = event.status === 'success' ? 'success' : event.status === 'error' ? 'error' : 'info'
      const detail = event.message ? `: ${event.message}` : ''
      addToast(type, `[${event.workflowName}] ${event.status}${detail}`)
    })
    const unsubDebug = window.api.onDebugLog(entry => setDebugLogs(prev => [...prev.slice(-499), entry]))
    const unsubClosed = window.api.onContextClosed(contextId => {
      setRunningContextIds(prev => { const s = new Set(prev); s.delete(contextId); return s })
    })
    return () => { unsubStatus(); unsubDebug(); unsubClosed() }
  }, [loadProfiles, loadContexts, loadWorkflows, addToast])

  const activeProfile = profiles.find(p => p.id === activeProfileId) ?? null
  const activeContexts = activeProfile
    ? activeProfile.contextIds
        .map(id => allContexts.find(c => c.id === id))
        .filter((c): c is ContextBrowserConfig => c != null)
    : []

  // ── Profile handlers ────────────────────────────────────────────────────────

  const handleCreateProfile = async (name: string) => {
    const profile: Profile = { id: crypto.randomUUID(), name, contextIds: [] }
    await window.api.saveProfile(profile)
    await loadProfiles()
    setActiveProfileId(profile.id)
  }

  const handleDeleteProfile = async (id: string) => {
    await window.api.deleteProfile(id)
    await loadProfiles()
    if (activeProfileId === id) setActiveProfileId(null)
  }

  // ── Browser launch/close handlers ───────────────────────────────────────────

  const handleLaunch = async (contextId: string) => {
    try {
      await window.api.launchContext(contextId)
      setRunningContextIds(prev => new Set([...prev, contextId]))
    } catch (err) {
      addToast('error', `Failed to launch: ${err}`)
    }
  }

  const handleClose = async (contextId: string) => {
    try {
      await window.api.closeContext(contextId)
      setRunningContextIds(prev => { const s = new Set(prev); s.delete(contextId); return s })
    } catch (err) {
      addToast('error', `Failed to close: ${err}`)
    }
  }

  const handleLaunchAll = async () => {
    const notRunning = activeContexts.filter(c => !runningContextIds.has(c.id))
    await Promise.allSettled(notRunning.map(c => handleLaunch(c.id)))
  }

  const handleCloseAll = async () => {
    const running = activeContexts.filter(c => runningContextIds.has(c.id))
    await Promise.allSettled(running.map(c => handleClose(c.id)))
  }

  // ── Workflow execution ───────────────────────────────────────────────────────

  const handleRunWorkflow = async (contextId: string, workflowId: string, params: Record<string, string>) => {
    try {
      await window.api.runWorkflow(contextId, workflowId, params)
    } catch (err) {
      addToast('error', `Failed to run workflow: ${err}`)
    }
  }

  // ── Context CRUD ─────────────────────────────────────────────────────────────

  const handleSaveContext = async (config: ContextBrowserConfig) => {
    await window.api.saveContext(config)
    if (activeProfile) {
      const updated: Profile = {
        ...activeProfile,
        contextIds: [...new Set([...activeProfile.contextIds, config.id])]
      }
      await window.api.saveProfile(updated)
      await loadProfiles()
    }
    await loadContexts()
    setShowAddContext(false)
  }

  const handleSaveEdit = async (config: ContextBrowserConfig) => {
    await window.api.saveContext(config)
    await loadContexts()
    setEditingContext(null)
  }

  const handleSetWorkflow = async (contextId: string, workflowId: string) => {
    const ctx = allContexts.find(c => c.id === contextId)
    if (!ctx) return
    await window.api.saveContext({ ...ctx, workflowId: workflowId || undefined })
    await loadContexts()
  }

  const handleSaveParams = async (contextId: string, params: Record<string, string>) => {
    const ctx = allContexts.find(c => c.id === contextId)
    if (!ctx) return
    await window.api.saveContext({ ...ctx, workflowParams: params })
    await loadContexts()
  }

  const handleToggleAutoRun = async (contextId: string, value: boolean) => {
    const ctx = allContexts.find(c => c.id === contextId)
    if (!ctx) return
    await window.api.saveContext({ ...ctx, runWorkflowOnLaunch: value })
    await loadContexts()
  }

  const handleReorder = async (newIds: string[]) => {
    if (!activeProfile) return
    const updated: Profile = { ...activeProfile, contextIds: newIds }
    await window.api.saveProfile(updated)
    await loadProfiles()
  }

  const handleDeleteContext = async (contextId: string) => {
    await window.api.deleteContext(contextId)
    if (activeProfile) {
      const updated: Profile = {
        ...activeProfile,
        contextIds: activeProfile.contextIds.filter(id => id !== contextId)
      }
      await window.api.saveProfile(updated)
      await loadProfiles()
    }
    await loadContexts()
  }

  // ── Workflow CRUD ─────────────────────────────────────────────────────────────

  const handleSaveWorkflow = async (workflow: Workflow) => {
    await window.api.saveWorkflow(workflow)
    await loadWorkflows()
  }

  const handleDeleteWorkflow = async (id: string) => {
    await window.api.deleteWorkflow(id)
    await loadWorkflows()
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Context Browser Launcher</h1>
        <ProfileSelector
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSelect={setActiveProfileId}
          onCreate={handleCreateProfile}
          onDelete={handleDeleteProfile}
        />
        <button className="btn btn-ghost btn-sm header-workflows-btn" onClick={() => setShowWorkflowManager(true)}>
          Workflows
        </button>
        <WindowControls />
      </header>

      <main className="app-main">
        {!activeProfileId ? (
          <div className="empty-state">
            <p>Select or create a profile to get started.</p>
          </div>
        ) : (
          <ContextList
            contexts={activeContexts}
            workflows={workflows}
            runningContextIds={runningContextIds}
            onLaunch={handleLaunch}
            onClose={handleClose}
            onRunWorkflow={handleRunWorkflow}
            onEdit={setEditingContext}
            onSetWorkflow={handleSetWorkflow}
            onToggleAutoRun={handleToggleAutoRun}
            onSaveParams={handleSaveParams}
            onReorder={handleReorder}
            onDelete={handleDeleteContext}
            onAddContext={() => setShowAddContext(true)}
            onLaunchAll={handleLaunchAll}
            onCloseAll={handleCloseAll}
          />
        )}
      </main>

      {showAddContext && (
        <AddContextModal
          workflows={workflows}
          onSave={handleSaveContext}
          onCancel={() => setShowAddContext(false)}
        />
      )}

      {editingContext && (
        <AddContextModal
          workflows={workflows}
          initialConfig={editingContext}
          onSave={handleSaveEdit}
          onCancel={() => setEditingContext(null)}
        />
      )}

      {showWorkflowManager && (
        <WorkflowManagerModal
          workflows={workflows}
          onSave={handleSaveWorkflow}
          onDelete={handleDeleteWorkflow}
          onClose={() => setShowWorkflowManager(false)}
        />
      )}

      <DebugConsole logs={debugLogs} onClear={() => setDebugLogs([])} />
      <ToastContainer toasts={toasts} />
    </div>
  )
}

export default App
