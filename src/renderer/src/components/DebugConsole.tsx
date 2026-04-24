import React, { useState, useEffect, useRef } from 'react'
import type { DebugLogEvent } from '../../../shared/ipc'

interface Props {
  logs: DebugLogEvent[]
  onClear: () => void
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  const ss = d.getSeconds().toString().padStart(2, '0')
  const ms = d.getMilliseconds().toString().padStart(3, '0')
  return `${hh}:${mm}:${ss}.${ms}`
}

export default function DebugConsole({ logs, onClear }: Props): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!collapsed && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [logs, collapsed])

  return (
    <div className="debug-console">
      <div className="debug-console-header" onClick={() => setCollapsed(c => !c)}>
        <span className="debug-console-title">
          Debug Console
          {logs.length > 0 && <span className="debug-console-badge">{logs.length}</span>}
        </span>
        <span className="debug-console-actions" onClick={e => e.stopPropagation()}>
          <button className="debug-console-clear" onClick={onClear} disabled={logs.length === 0}>
            Clear
          </button>
          <span className="debug-console-chevron">{collapsed ? '▲' : '▼'}</span>
        </span>
      </div>
      {!collapsed && (
        <div className="debug-console-body" ref={bodyRef}>
          {logs.length === 0 ? (
            <span className="debug-console-empty">No log entries yet.</span>
          ) : (
            logs.map((entry, i) => (
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
