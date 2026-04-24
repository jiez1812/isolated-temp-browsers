import { useState } from 'react'

interface Props {
  onMini: () => void
}

export default function WindowControls({ onMini }: Props) {
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
        onClick={onMini}
        title="Mini mode"
      >
        &#x2B1C;
      </button>
    </div>
  )
}
