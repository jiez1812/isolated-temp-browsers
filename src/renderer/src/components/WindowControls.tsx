import { useState } from 'react'

interface Props {
  onMini: () => void
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
function IconMinimize() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M3 8h10"/>
    </svg>
  )
}
function IconClose() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M4 4l8 8M12 4l-8 8"/>
    </svg>
  )
}

export default function WindowControls({ onMini }: Props) {
  const [pinned, setPinned] = useState(false)

  const handleTogglePin = async () => {
    const next = await window.api.toggleAlwaysOnTop()
    setPinned(next)
  }

  return (
    <>
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

      <div className="app-title-div"/>

      <button className="app-win-btn" onClick={() => window.api.minimizeWindow()} title="Minimize">
        <IconMinimize/>
      </button>

      <button className="app-win-btn danger" onClick={() => window.close()} title="Close">
        <IconClose/>
      </button>
    </>
  )
}
