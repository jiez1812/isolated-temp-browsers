import { useState, type ReactElement } from 'react'
import {
  FaChevronDown as IconChev,
  FaPlay as IconPlay,
  FaWindowMaximize as IconBrowser,
  FaWindowRestore as IconRestore,
} from 'react-icons/fa'
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
