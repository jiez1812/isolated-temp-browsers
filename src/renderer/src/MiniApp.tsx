import type { ReactElement } from 'react'
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
  const allRunning = activeContexts.length > 0 && activeContexts.every(c => runningContextIds.has(c.id))

  return (
    <div className="mini-app">
      <div className="mini-drag">
        <span className="mini-drag-label">Mini mode</span>
        <button className="mini-restore-btn" onClick={onRestore} title="Restore full window">
          Restore
        </button>
      </div>

      <div className="mini-profile-row">
        <select
          className="mini-profile-select"
          value={activeProfileId ?? ''}
          onChange={e => onSelectProfile(e.target.value || null)}
        >
          {profiles.length === 0 && <option value="">No profiles</option>}
          {profiles.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="mini-context-list">
        {activeContexts.length === 0 ? (
          <div className="mini-empty">No browsers in this profile</div>
        ) : (
          activeContexts.map(ctx => {
            const running = runningContextIds.has(ctx.id)
            return (
              <div key={ctx.id} className="mini-context-row">
                <div className="mini-color-bar" style={{ background: ctx.color ?? '#555570' }} />
                <span className="mini-context-name">{ctx.name}</span>
                <button
                  className={`mini-toggle-btn${running ? ' mini-toggle-btn--running' : ''}`}
                  onClick={() => onToggle(ctx)}
                  title={running ? 'Stop' : 'Launch'}
                />
              </div>
            )
          })
        )}
      </div>

      <div className="mini-footer">
        <button
          className="mini-launch-all-btn"
          onClick={onLaunchAll}
          disabled={allRunning || activeContexts.length === 0}
        >
          {allRunning ? 'All Running' : 'Launch All'}
        </button>
      </div>
    </div>
  )
}
