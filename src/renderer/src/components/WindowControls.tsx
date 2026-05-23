import { useState } from 'react'
import {
  FaCog as IconSettings,
  FaCompressAlt as IconMini,
  FaThumbtack as IconPin,
} from 'react-icons/fa'

interface Props {
  onSettings: () => void
  onMini: () => void
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
