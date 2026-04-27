import React, { useState, useEffect, useCallback } from 'react'
import type { ContextBrowserConfig, Profile, Workflow } from '../../shared/types'
import type { DebugLogEvent } from '../../shared/ipc'
import ProfileSelector from './components/ProfileSelector'
import ContextList from './components/ContextList'
import AddContextModal from './components/AddContextModal'
import WorkflowPanel from './components/WorkflowPanel'
import ToastContainer, { type ToastItem } from './components/Toast'
import WindowControls from './components/WindowControls'
import DebugConsole from './components/DebugConsole'
import MiniView from './MiniApp'

type Tab = 'browsers' | 'workflows'

// Tiny SVG icons (inline to avoid extra deps)
function IconGrid() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/>
      <rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>
    </svg>
  )
}
function IconWand() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13l7-7M9 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z"/>
    </svg>
  )
}
function IconLogo() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3.5" width="12" height="9" rx="1.5"/>
      <path d="M2 6.5h12"/>
      <circle cx="4.2" cy="5" r=".5" fill="white"/>
    </svg>
  )
}

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
  const [activeTab, setActiveTab] = useState<Tab>('browsers')
  const [isMini, setIsMini] = useState(false)

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
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '1') setActiveTab('browsers')
      if (e.ctrlKey && e.key === '2') setActiveTab('workflows')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
  const activeWorkflows = activeProfile
    ? workflows.filter(w => (activeProfile.workflowIds ?? []).includes(w.id))
    : []

  // ── Profile handlers ─────────────────────────────────────────────────────────

  const handleCreateProfile = async (name: string) => {
    const profile: Profile = { id: crypto.randomUUID(), name, contextIds: [], workflowIds: [] }
    await window.api.saveProfile(profile)
    await loadProfiles()
    setActiveProfileId(profile.id)
  }

  const handleDeleteProfile = async (id: string) => {
    await window.api.deleteProfile(id)
    await loadProfiles()
    if (activeProfileId === id) setActiveProfileId(null)
  }

  // ── Browser launch/close handlers ────────────────────────────────────────────

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

  // ── Workflow execution ────────────────────────────────────────────────────────

  const handleRunWorkflow = async (contextId: string, workflowId: string, params: Record<string, string>) => {
    try {
      await window.api.runWorkflow(contextId, workflowId, params)
    } catch (err) {
      addToast('error', `Failed to run workflow: ${err}`)
    }
  }

  // ── Context CRUD ──────────────────────────────────────────────────────────────

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
    if (activeProfile && !(activeProfile.workflowIds ?? []).includes(workflow.id)) {
      const updated: Profile = {
        ...activeProfile,
        workflowIds: [...(activeProfile.workflowIds ?? []), workflow.id]
      }
      await window.api.saveProfile(updated)
      await loadProfiles()
    }
    await loadWorkflows()
  }

  const handleDeleteWorkflow = async (id: string) => {
    await window.api.deleteWorkflow(id)
    if (activeProfile) {
      const updated: Profile = {
        ...activeProfile,
        workflowIds: (activeProfile.workflowIds ?? []).filter(wid => wid !== id)
      }
      await window.api.saveProfile(updated)
      await loadProfiles()
    }
    await loadWorkflows()
  }

  const handleEnterMini = () => {
    setIsMini(true)
    window.api.enterMiniMode()
  }

  const handleExitMini = () => {
    setIsMini(false)
    window.api.exitMiniMode()
  }

  if (isMini) {
    return (
      <MiniView
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSelectProfile={setActiveProfileId}
        activeContexts={activeContexts}
        runningContextIds={runningContextIds}
        onToggle={ctx => runningContextIds.has(ctx.id) ? handleClose(ctx.id) : handleLaunch(ctx.id)}
        onLaunchAll={handleLaunchAll}
        onRestore={handleExitMini}
      />
    )
  }

  return (
    <div className="app">
      {/* V1 Titlebar */}
      <div className="app-title">
        <div className="app-logo"><IconLogo/></div>
        <span className="app-brand">Context Browser Launcher</span>
        <div className="app-title-div"/>
        <span className="app-title-label">Profile</span>

        <ProfileSelector
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSelect={setActiveProfileId}
          onCreate={handleCreateProfile}
          onDelete={handleDeleteProfile}
        />

        <div className="app-title-spacer"/>

        <WindowControls onMini={handleEnterMini}/>
      </div>

      {/* Tab bar */}
      {activeProfileId && (
        <div className="app-tabs">
          <button
            className={`app-tab${activeTab === 'browsers' ? ' active' : ''}`}
            onClick={() => setActiveTab('browsers')}
          >
            <IconGrid/>
            Browsers
            <span className="app-tab-count">{activeContexts.length}</span>
            <span className="app-kbd">Ctrl 1</span>
          </button>
          <button
            className={`app-tab${activeTab === 'workflows' ? ' active' : ''}`}
            onClick={() => setActiveTab('workflows')}
          >
            <IconWand/>
            Workflows
            <span className="app-tab-count">{activeWorkflows.length}</span>
            <span className="app-kbd">Ctrl 2</span>
          </button>
        </div>
      )}

      {/* Body */}
      <div className="app-body">
        {!activeProfileId ? (
          <div className="empty-state">
            <p>Select or create a profile to get started.</p>
          </div>
        ) : activeTab === 'browsers' ? (
          <ContextList
            contexts={activeContexts}
            workflows={activeWorkflows}
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
        ) : (
          <WorkflowPanel
            workflows={activeWorkflows}
            onSave={handleSaveWorkflow}
            onDelete={handleDeleteWorkflow}
          />
        )}
      </div>

      {showAddContext && (
        <AddContextModal
          workflows={activeWorkflows}
          onSave={handleSaveContext}
          onCancel={() => setShowAddContext(false)}
        />
      )}

      {editingContext && (
        <AddContextModal
          workflows={activeWorkflows}
          initialConfig={editingContext}
          onSave={handleSaveEdit}
          onCancel={() => setEditingContext(null)}
        />
      )}

      <DebugConsole logs={debugLogs} onClear={() => setDebugLogs([])} />
      <ToastContainer toasts={toasts} />
    </div>
  )
}

export default App
