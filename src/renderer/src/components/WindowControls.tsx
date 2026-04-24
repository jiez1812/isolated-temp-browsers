import React, { useState } from 'react'

export default function WindowControls() {
  const [pinned, setPinned] = useState(false)

  const handleTogglePin = async () => {
    const next = await window.api.toggleAlwaysOnTop()
    setPinned(next)
  }

  return (
    <div className="window-controls">
      <button
        className={`btn-window${pinned ? ' btn-window--active' : ''}`}
        onClick={handleTogglePin}
        title={pinned ? 'Unpin window' : 'Always on top'}
      >
        Always on Top
      </button>
      <button
        className="btn-window"
        onClick={() => window.api.minimizeWindow()}
        title="Minimize"
      >
        &#x2212;
      </button>
    </div>
  )
}
