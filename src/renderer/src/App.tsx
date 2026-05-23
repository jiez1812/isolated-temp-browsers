import React, { useState, useEffect, useCallback } from 'react'
import {
  FaFileExport as IconExport,
  FaMagic as IconWand,
  FaThLarge as IconGrid,
  FaTrashAlt as IconTrash,
} from 'react-icons/fa'
import appIcon from '@images/icon.ico'
import type {
  AppInfo,
  AppSettings,
  ContextBrowserConfig,
  Profile,
  Workflow,
  AvailableBrowsers,
  ProfileExport,
} from '../../shared/types'
import type { DebugLogEvent, WorkflowStepEvent } from '../../shared/ipc'
import ProfileSelector from './components/ProfileSelector'
import ImportProfileModal from './components/ImportProfileModal'
import ConfirmModal from './components/ConfirmModal'
import ContextList from './components/ContextList'
import AddContextModal from './components/AddContextModal'
import WorkflowPanel from './components/WorkflowPanel'
import SettingsPage from './components/SettingsPage'
import ToastContainer, { type ToastItem } from './components/Toast'
import WindowControls from './components/WindowControls'
import DebugConsole from './components/DebugConsole'
import MiniView from './MiniApp'
import {
  closeSettingsView,
  debugConsoleOpenFromSettings,
  openSettingsView,
  type AppView,
} from './utils/settingsView'

type Tab = 'browsers' | 'workflows'

export interface DebugStepState {
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  duration?: number
}

export interface DebugRunState {
  workflowId: string
  slowMo: number
  steps: DebugStepState[]
  finished: boolean
}

function App(): React.JSX.Element {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const [allContexts, setAllContexts] = useState<ContextBrowserConfig[]>([])
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [runningContextIds, setRunningContextIds] = useState<Set<string>>(new Set())
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [debugLogs, setDebugLogs] = useState<DebugLogEvent[]>([])
  const [debugStates, setDebugStates] = useState<Map<string, DebugRunState>>(new Map())
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null)
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [activeView, setActiveView] = useState<AppView>('main')
  const [debugConsoleOpen, setDebugConsoleOpen] = useState(true)
  const [showAddContext, setShowAddContext] = useState(false)
  const [editingContext, setEditingContext] = useState<ContextBrowserConfig | null>(null)
  const [copyingContext, setCopyingContext] = useState<ContextBrowserConfig | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('browsers')
  const [isMini, setIsMini] = useState(false)
  const [availableBrowsers, setAvailableBrowsers] = useState<AvailableBrowsers>({ edge: true, chrome: false, firefox: false })
  const [pendingImport, setPendingImport] = useState<{ data: ProfileExport; conflictName: string | null } | null>(null)
  const [confirmingDeleteProfile, setConfirmingDeleteProfile] = useState(false)

  const addToast = useCallback((type: ToastItem['type'], message: string) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }, [])

  const loadProfiles = useCallback(async () => {
    const list = await window.api.listProfiles()
    setProfiles(list)
    return list
  }, [])

  const loadContexts = useCallback(async () => {
    const list = await window.api.listContexts()
    setAllContexts(list)
    return list
  }, [])

  const loadWorkflows = useCallback(async () => {
    const list = await window.api.listWorkflows()
    setWorkflows(list)
    return list
  }, [])

  const loadAppSettings = useCallback(async () => {
    const [settings, info] = await Promise.all([
      window.api.loadSettings(),
      window.api.getAppInfo(),
    ])
    setAppSettings(settings)
    setAppInfo(info)
    setDebugConsoleOpen(debugConsoleOpenFromSettings(settings))
  }, [])

  const reloadProfileData = useCallback(async () => {
    const [profileList, contextList, workflowList] = await Promise.all([
      window.api.listProfiles(),
      window.api.listContexts(),
      window.api.listWorkflows(),
    ])
    setProfiles(profileList)
    setAllContexts(contextList)
    setWorkflows(workflowList)
    setActiveProfileId(prev =>
      prev && profileList.some(profile => profile.id === prev) ? prev : null
    )
  }, [])

  const handleSettingsChanged = useCallback((settings: AppSettings) => {
    setAppSettings(settings)
    setDebugConsoleOpen(debugConsoleOpenFromSettings(settings))
    void reloadProfileData()
  }, [reloadProfileData])

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
    loadAppSettings()
    window.api.detectBrowsers().then(setAvailableBrowsers)

    const unsubStatus = window.api.onWorkflowStatus(event => {
      const type = event.status === 'success' ? 'success' : event.status === 'error' ? 'error' : 'info'
      const detail = event.message ? `: ${event.message}` : ''
      addToast(type, `[${event.workflowName}] ${event.status}${detail}`)
      if (event.status === 'success' || event.status === 'error') {
        setDebugStates(prev => {
          const cur = prev.get(event.contextId)
          if (!cur) return prev
          const next = new Map(prev)
          next.set(event.contextId, { ...cur, finished: true })
          return next
        })
      }
    })
    const unsubDebug = window.api.onDebugLog(entry => setDebugLogs(prev => [...prev.slice(-499), entry]))
    const unsubStep = window.api.onWorkflowStep((event: WorkflowStepEvent) => {
      setDebugStates(prev => {
        const cur = prev.get(event.contextId)
        if (!cur) return prev
        const steps = cur.steps.map((s, i) =>
          i === event.stepIndex ? { label: event.label, status: event.status, duration: event.duration } : s
        )
        const next = new Map(prev)
        next.set(event.contextId, { ...cur, steps })
        return next
      })
    })
    const unsubClosed = window.api.onContextClosed(contextId => {
      setRunningContextIds(prev => { const s = new Set(prev); s.delete(contextId); return s })
    })
    return () => { unsubStatus(); unsubDebug(); unsubStep(); unsubClosed() }
  }, [loadProfiles, loadContexts, loadWorkflows, loadAppSettings, addToast])

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

  const handleExportProfile = async (id: string) => {
    try {
      await window.api.exportProfile(id)
    } catch (err) {
      addToast('error', `Export failed: ${err}`)
    }
  }

  const handleImportProfile = async () => {
    try {
      const result = await window.api.importProfile()
      if (result.status === 'cancelled') return
      if (result.status === 'error') { addToast('error', result.message); return }
      const conflictName = profiles.some(p => p.name === result.data.profile.name)
        ? result.data.profile.name
        : null
      setPendingImport({ data: result.data, conflictName })
    } catch (err) {
      addToast('error', `Import failed: ${err}`)
    }
  }

  const handleConfirmImport = async (
    data: ProfileExport,
    resolvedName: string,
    replaceExistingId: string | null
  ) => {
    setPendingImport(null)
    try {
      if (replaceExistingId) await window.api.deleteProfile(replaceExistingId)

      // Assign new IDs to workflows, build name→id map for context references
      const workflowNameToId = new Map<string, string>()
      for (const wf of data.profile.workflows ?? []) {
        const id = crypto.randomUUID()
        workflowNameToId.set(wf.name, id)
        const workflow: import('../../shared/types').Workflow = {
          id,
          name: wf.name,
          steps: wf.steps,
          params: wf.params,
          ...(wf.retryCount != null && { retryCount: wf.retryCount }),
          ...(wf.retryDelay != null && { retryDelay: wf.retryDelay }),
        }
        await window.api.saveWorkflow(workflow)
      }

      // Determine fallback browser for unavailable types
      const fallbackBrowser = availableBrowsers.edge ? 'edge' : availableBrowsers.chrome ? 'chrome' : 'firefox'

      // Assign new IDs to contexts
      const contextIds: string[] = []
      for (const ctx of data.profile.contexts) {
        const id = crypto.randomUUID()
        contextIds.push(id)
        const resolvedBrowser = ctx.browserType && !availableBrowsers[ctx.browserType]
          ? fallbackBrowser
          : ctx.browserType
        const config: ContextBrowserConfig = {
          id,
          name: ctx.name,
          startupUrl: ctx.startupUrl,
          windowSize: ctx.windowSize,
          ...(ctx.color && { color: ctx.color }),
          ...(resolvedBrowser && { browserType: resolvedBrowser }),
          ...(ctx.workflowRef && workflowNameToId.has(ctx.workflowRef) && { workflowId: workflowNameToId.get(ctx.workflowRef) }),
          ...(ctx.workflowParams && { workflowParams: ctx.workflowParams }),
          ...(ctx.runWorkflowOnLaunch && { runWorkflowOnLaunch: true }),
        }
        await window.api.saveContext(config)
      }

      const profile: Profile = {
        id: crypto.randomUUID(),
        name: resolvedName,
        contextIds,
        workflowIds: Array.from(workflowNameToId.values()),
      }
      await window.api.saveProfile(profile)
      await loadProfiles()
      await loadContexts()
      await loadWorkflows()
      setActiveProfileId(profile.id)
      addToast('success', `Profile "${resolvedName}" imported`)
    } catch (err) {
      addToast('error', `Import failed: ${err}`)
    }
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

  const handleRunWorkflow = async (
    contextId: string,
    workflowId: string,
    params: Record<string, string>,
    debug?: boolean,
    slowMo?: number
  ) => {
    if (debug) {
      const wf = workflows.find(w => w.id === workflowId)
      if (wf) {
        setDebugStates(prev => new Map(prev).set(contextId, {
          workflowId,
          slowMo: slowMo ?? 0,
          steps: wf.steps.map(() => ({ label: '', status: 'pending' })),
          finished: false,
        }))
      }
    }
    try {
      await window.api.runWorkflow(contextId, workflowId, params, debug ? { debug, slowMo } : undefined)
    } catch (err) {
      addToast('error', `Failed to run workflow: ${err}`)
    }
  }

  const handleClearDebug = (contextId: string) => {
    setDebugStates(prev => { const next = new Map(prev); next.delete(contextId); return next })
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

  const handleCopyContext = (contextId: string) => {
    const source = allContexts.find(c => c.id === contextId)
    if (!source) return
    setCopyingContext({ ...source, id: crypto.randomUUID(), name: '', workflowParams: undefined })
  }

  const handleSaveCopy = async (config: ContextBrowserConfig) => {
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
    setCopyingContext(null)
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
        <div className="app-logo"><img src={appIcon} width={16} height={16} alt=""/></div>
        <span className="app-brand">Context Browser Launcher</span>
        <div className="app-title-div"/>
        <span className="app-title-label">Profile</span>

        <ProfileSelector
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSelect={setActiveProfileId}
          onCreate={handleCreateProfile}
          onImport={handleImportProfile}
        />

        <div className="app-title-spacer"/>

        <WindowControls
          onSettings={() => setActiveView(openSettingsView())}
          onMini={handleEnterMini}
        />
      </div>

      {/* Tab bar */}
      {activeView === 'main' && activeProfileId && (
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
          <div style={{ flex: 1 }}/>
          <button className="app-tab" onClick={() => handleExportProfile(activeProfileId)} title="Export profile">
            <IconExport/>
            Export
          </button>
          <button className="app-tab app-tab--danger" onClick={() => setConfirmingDeleteProfile(true)} title="Delete profile">
            <IconTrash/>
            Delete
          </button>
        </div>
      )}

      {/* Body */}
      <div className="app-body">
        {activeView === 'settings' ? (
          <SettingsPage
            settings={appSettings}
            appInfo={appInfo}
            onBack={() => setActiveView(closeSettingsView())}
            onSettingsChanged={handleSettingsChanged}
            onNotify={addToast}
          />
        ) : !activeProfileId ? (
          <div className="empty-state">
            <p>Select or create a profile to get started.</p>
          </div>
        ) : activeTab === 'browsers' ? (
          <ContextList
            contexts={activeContexts}
            workflows={activeWorkflows}
            runningContextIds={runningContextIds}
            debugStates={debugStates}
            onLaunch={handleLaunch}
            onClose={handleClose}
            onRunWorkflow={handleRunWorkflow}
            onClearDebug={handleClearDebug}
            onEdit={setEditingContext}
            onSetWorkflow={handleSetWorkflow}
            onToggleAutoRun={handleToggleAutoRun}
            onSaveParams={handleSaveParams}
            onReorder={handleReorder}
            onDelete={handleDeleteContext}
            onCopy={handleCopyContext}
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

      {activeView === 'main' && showAddContext && (
        <AddContextModal
          workflows={activeWorkflows}
          availableBrowsers={availableBrowsers}
          onSave={handleSaveContext}
          onCancel={() => setShowAddContext(false)}
        />
      )}

      {activeView === 'main' && editingContext && (
        <AddContextModal
          workflows={activeWorkflows}
          availableBrowsers={availableBrowsers}
          initialConfig={editingContext}
          onSave={handleSaveEdit}
          onCancel={() => setEditingContext(null)}
        />
      )}

      {activeView === 'main' && copyingContext && (
        <AddContextModal
          workflows={activeWorkflows}
          availableBrowsers={availableBrowsers}
          initialConfig={copyingContext}
          onSave={handleSaveCopy}
          onCancel={() => setCopyingContext(null)}
        />
      )}

      {activeView === 'main' && pendingImport && (
        <ImportProfileModal
          data={pendingImport.data}
          conflictingName={pendingImport.conflictName}
          existingProfiles={profiles}
          availableBrowsers={availableBrowsers}
          onImport={handleConfirmImport}
          onCancel={() => setPendingImport(null)}
        />
      )}

      {activeView === 'main' && confirmingDeleteProfile && activeProfile && (
        <ConfirmModal
          title="Delete Profile"
          message={`Delete "${activeProfile.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => { handleDeleteProfile(activeProfileId!); setConfirmingDeleteProfile(false) }}
          onCancel={() => setConfirmingDeleteProfile(false)}
        />
      )}

      <DebugConsole
        logs={debugLogs}
        onClear={() => setDebugLogs([])}
        open={debugConsoleOpen}
        onOpenChange={setDebugConsoleOpen}
      />
      <ToastContainer toasts={toasts} />
    </div>
  )
}

export default App
