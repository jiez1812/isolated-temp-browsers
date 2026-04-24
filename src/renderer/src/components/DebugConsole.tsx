import React, { useState, useEffect, useRef } from 'react'
import type { DebugLogEvent } from '../../../shared/ipc'

interface Props {
  logs: DebugLogEvent[]
  onClear: () => void
}

type LevelFilter = 'all' | 'info' | 'warn' | 'error'

function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  const ss = d.getSeconds().toString().padStart(2, '0')
  const ms = d.getMilliseconds().toString().padStart(3, '0')
  return `${hh}:${mm}:${ss}.${ms}`
}

function formatEntry(entry: DebugLogEvent): string {
  return `${formatTime(entry.timestamp)} [${entry.level.toUpperCase()}] ${entry.message}`
}

export default function DebugConsole({ logs, onClear }: Props): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false)
  const [filterLevel, setFilterLevel] = useState<LevelFilter>('all')
  const [filterText, setFilterText] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)

  const visibleLogs = logs.filter(e =>
    (filterLevel === 'all' || e.level === filterLevel) &&
    (!filterText || e.message.toLowerCase().includes(filterText.toLowerCase()))
  )

  const isFiltered = filterLevel !== 'all' || filterText !== ''

  useEffect(() => {
    if (!collapsed && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [visibleLogs, collapsed])

  const handleCopy = () => {
    const text = visibleLogs.map(formatEntry).join('\n')
    navigator.clipboard.writeText(text)
  }

  const handleExport = () => {
    const text = visibleLogs.map(formatEntry).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const badgeLabel = isFiltered && logs.length > 0
    ? `${visibleLogs.length}/${logs.length}`
    : logs.length > 0 ? String(logs.length) : null

  return (
    <div className="debug-console">
      <div className="debug-console-header" onClick={() => setCollapsed(c => !c)}>
        <span className="debug-console-title">
          Debug Console
          {badgeLabel && <span className="debug-console-badge">{badgeLabel}</span>}
        </span>
        <span className="debug-console-actions" onClick={e => e.stopPropagation()}>
          <button className="debug-console-clear" onClick={onClear} disabled={logs.length === 0}>
            Clear
          </button>
          <button className="debug-console-copy" onClick={handleCopy} disabled={visibleLogs.length === 0} title="Copy visible entries">
            Copy
          </button>
          <button className="debug-console-export" onClick={handleExport} disabled={visibleLogs.length === 0} title="Export as .txt">
            Export
          </button>
          <span className="debug-console-chevron">{collapsed ? '▲' : '▼'}</span>
        </span>
      </div>

      {!collapsed && (
        <>
          <div className="debug-filter-bar">
            {(['all', 'info', 'warn', 'error'] as LevelFilter[]).map(l => (
              <button
                key={l}
                className={`debug-filter-btn${filterLevel === l ? ' debug-filter-btn--active' : ''}`}
                onClick={() => setFilterLevel(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
            <input
              className="debug-filter-text"
              placeholder="filter…"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
            />
            {isFiltered && (
              <button
                className="debug-filter-reset"
                onClick={() => { setFilterLevel('all'); setFilterText('') }}
                title="Clear filters"
              >
                ✕
              </button>
            )}
          </div>

          <div className="debug-console-body" ref={bodyRef}>
            {visibleLogs.length === 0 ? (
              <span className="debug-console-empty">
                {logs.length === 0 ? 'No log entries yet.' : 'No entries match the current filter.'}
              </span>
            ) : (
              visibleLogs.map((entry, i) => (
                <div key={i} className={`debug-log-entry debug-log-entry--${entry.level}`}>
                  <span className="debug-log-time">{formatTime(entry.timestamp)}</span>
                  <span className="debug-log-level">{entry.level.toUpperCase()}</span>
                  <span className="debug-log-message">{entry.message}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
