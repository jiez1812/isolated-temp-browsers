import React, { useState, useEffect, useRef } from 'react'
import { FaChevronDown } from 'react-icons/fa'
import type { DebugLogEvent } from '../../../shared/ipc'

interface Props {
  logs: DebugLogEvent[]
  onClear: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

type LevelFilter = 'all' | 'info' | 'warn' | 'error'

function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  const ss = d.getSeconds().toString().padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export default function DebugConsole({ logs, onClear, open, onOpenChange }: Props): React.JSX.Element {
  const [filterLevel, setFilterLevel] = useState<LevelFilter>('all')
  const [filterText, setFilterText] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)

  const visibleLogs = logs.filter(e =>
    (filterLevel === 'all' || e.level === filterLevel) &&
    (!filterText || e.message.toLowerCase().includes(filterText.toLowerCase()))
  )

  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [visibleLogs.length, open])

  const badgeLabel = logs.length > 0 ? String(logs.length) : null

  return (
    <div className="debug-console" style={{ height: open ? 160 : 30 }}>
      {/* Header bar */}
      <div className="debug-console-header" onClick={() => onOpenChange(!open)}>
        <span className="debug-console-title">
          Debug Console
          {badgeLabel && <span className="debug-console-badge">{badgeLabel}</span>}
        </span>

        {open && (
          <>
            <div className="debug-seg" onClick={e => e.stopPropagation()}>
              {(['all', 'info', 'warn', 'error'] as LevelFilter[]).map(l => (
                <button
                  key={l}
                  className={`debug-seg-btn${filterLevel === l ? ' active' : ''}`}
                  onClick={() => setFilterLevel(l)}
                >
                  {l}
                </button>
              ))}
            </div>
            <input
              className="debug-filter-text"
              placeholder="filter…"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </>
        )}

        <div className="debug-console-actions" onClick={e => e.stopPropagation()}>
          {open && (
            <button className="btn btn-ghost btn-sm" onClick={onClear} disabled={logs.length === 0}>
              Clear
            </button>
          )}
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onOpenChange(!open)} title={open ? 'Collapse' : 'Expand'}>
            <FaChevronDown size={11} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}/>
          </button>
        </div>
      </div>

      {/* Log body */}
      {open && (
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
      )}
    </div>
  )
}
