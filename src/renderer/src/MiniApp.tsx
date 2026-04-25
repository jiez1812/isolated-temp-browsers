import { useState, type ReactElement } from 'react'
import type { ContextBrowserConfig, Profile } from '../../shared/types'

interface Props {
  profiles: Profile[]
  activeProfileId: string | null
  onSelectProfile: (id: string | null) => void
  activeContexts: ContextBrowserConfig[]
  runningContextIds: Set<string>
  onToggle: (ctx: ContextBrowserConfig) => void
  onLaunchAll: () => void
  onRestore: () => void
}

function IconRestore() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6V2h4"/><path d="M12 8v4H8"/>
      <path d="M2 2l4.5 4.5"/><path d="M12 12L7.5 7.5"/>
    </svg>
  )
}
function IconBrowser() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="2" y="3" width="12" height="10" rx="1.5"/>
      <path d="M2 6h12"/>
    </svg>
  )
}
function IconChev() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M3 5l3 3 3-3"/>
    </svg>
  )
}
function IconPlay() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <path d="M2 1.5v7l6-3.5z"/>
    </svg>
  )
}

export default function MiniView({
  profiles,
  activeProfileId,
  onSelectProfile,
  activeContexts,
  runningContextIds,
  onToggle,
  onLaunchAll,
  onRestore
}: Props): ReactElement {
  const [pickerOpen, setPickerOpen] = useState(false)
  const activeProfile = profiles.find(p => p.id === activeProfileId)

  const getState = (ctx: ContextBrowserConfig) => runningContextIds.has(ctx.id) ? 'running' : 'idle'

  return (
    <div className="mini-app" style={{ position: 'relative' }}>
      {/* Header */}
      <div className="mini-head">
        <div className="mini-dot"/>
        <div className="mini-title-block">
          <div className="mini-title">Context Browser</div>
          <div className="mini-sub">mini · {activeContexts.length} browser{activeContexts.length === 1 ? '' : 's'}</div>
        </div>
        <div className="spacer"/>
        <button className="mini-btn" onClick={onRestore} title="Restore full window">
          <IconRestore/> Restore
        </button>
      </div>

      {/* Profile picker */}
      <div style={{ position: 'relative' }}>
        <button
          className="mini-prof"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen(o => !o)}
        >
          <IconBrowser/>
          <span>{activeProfile?.name ?? '— select —'}</span>
          <span className="mini-prof-count">{activeContexts.length}</span>
          <IconChev/>
        </button>

        {pickerOpen && (
          <div className="mini-proflist" role="listbox" onMouseLeave={() => setPickerOpen(false)}>
            {profiles.map(p => (
              <button
                key={p.id}
                className={`mini-proflist-item${p.id === activeProfileId ? ' active' : ''}`}
                onClick={() => { onSelectProfile(p.id); setPickerOpen(false) }}
              >
                <IconBrowser/>
                {p.name}
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--fg-2)', fontFamily: 'var(--mono)' }}>
                  {p.contextIds?.length ?? 0}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Browser list */}
      <div className="mini-list">
        {activeContexts.length === 0 ? (
          <div className="mini-empty">No browsers in this profile</div>
        ) : (
          activeContexts.map(ctx => {
            const state = getState(ctx)
            return (
              <button
                key={ctx.id}
                className="mini-row"
                data-state={state}
                style={{ '--c': ctx.color ?? 'oklch(0.64 0.17 265)' } as React.CSSProperties}
                onClick={() => onToggle(ctx)}
              >
                <span className="mini-row-name">{ctx.name}</span>
                <span className="mini-row-status">
                  <span className="mini-row-pip"/>
                  {state}
                </span>
              </button>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="mini-footer">
        <button className="mini-btn mini-launch-all" onClick={onLaunchAll} disabled={activeContexts.length === 0}>
          <IconPlay/> Launch all
        </button>
      </div>
    </div>
  )
}
