import { useState } from 'react'

interface Props {
  onSettings: () => void
  onMini: () => void
}

function IconSettings() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.1"/>
      <path d="M8 1.8v2M8 12.2v2M3.6 3.6L5 5M11 11l1.4 1.4M1.8 8h2M12.2 8h2M3.6 12.4L5 11M11 5l1.4-1.4"/>
    </svg>
  )
}

function IconPin() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2.5L13.5 6.5M6.5 6l3 3-4 4-3-3 4-4zM9 5.5l2-2 1.5 1.5-2 2"/>
    </svg>
  )
}
function IconMini() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="4" width="10" height="6" rx="1.2"/>
      <path d="M4 7h6"/>
    </svg>
  )
}

export default function WindowControls({ onSettings, onMini }: Props) {
  const [pinned, setPinned] = useState(false)

  const handleTogglePin = async () => {
    const next = await window.api.toggleAlwaysOnTop()
    setPinned(next)
  }

  return (
    <>
      <button className="app-pin-btn" onClick={onSettings} title="Open settings">
        <IconSettings/> Settings
      </button>

      <button
        className={`app-pin-btn${pinned ? ' active' : ''}`}
        onClick={handleTogglePin}
        title={pinned ? 'Unpin window' : 'Always on top'}
      >
        <IconPin/>
        {pinned ? 'Always on top' : 'Pin'}
      </button>

      <button className="app-pin-btn" onClick={onMini} title="Collapse to mini mode">
        <IconMini/> Mini
      </button>

    </>
  )
}
