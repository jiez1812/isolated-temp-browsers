import React, { useState, useRef, useEffect } from 'react'
import type { Profile } from '../../../shared/types'

interface Props {
  profiles: Profile[]
  activeProfileId: string | null
  onSelect: (id: string | null) => void
  onCreate: (name: string) => void
  onImport: () => void
}

function IconChev() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M3 5l3 3 3-3"/>
    </svg>
  )
}

export default function ProfileSelector({ profiles, activeProfileId, onSelect, onCreate, onImport }: Props) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [nameError, setNameError] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  const activeProfile = profiles.find(p => p.id === activeProfileId)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
        setNewName('')
        setNameError('')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const handleCreate = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    if (profiles.some(p => p.name === trimmed)) {
      setNameError('Name already exists')
      return
    }
    onCreate(trimmed)
    setNewName('')
    setNameError('')
    setCreating(false)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate()
    if (e.key === 'Escape') { setCreating(false); setNewName(''); setNameError('') }
  }

  return (
    <>
      <div className="profile-selector" ref={wrapRef} style={{ position: 'relative' }}>
        {/* Pill button showing active profile */}
        <button
          className="profile-pick-btn"
          onClick={() => setOpen(o => !o)}
          title="Switch profile"
        >
          <span className="profile-pip"/>
          {activeProfile?.name ?? '— select —'}
          <span className={`profile-chevron${open ? ' open' : ''}`}>
            <IconChev/>
          </span>
        </button>

        {/* Popover */}
        {open && (
          <div className="profile-popover" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            {profiles.map(p => (
              <button
                key={p.id}
                className={`profile-popover-item${p.id === activeProfileId ? ' active' : ''}`}
                onClick={() => { onSelect(p.id); setOpen(false) }}
              >
                <span className="profile-pip" style={{ opacity: p.id === activeProfileId ? 1 : 0.4 }}/>
                {p.name}
                <span className="count">{p.contextIds?.length ?? 0}</span>
              </button>
            ))}

            {profiles.length > 0 && <div className="profile-popover-divider"/>}

            {creating ? (
              <>
                <div className="profile-create-row">
                  <input
                    autoFocus
                    className="profile-create-input"
                    placeholder="Profile name"
                    value={newName}
                    onChange={e => { setNewName(e.target.value); setNameError('') }}
                    onKeyDown={handleKeyDown}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleCreate}>Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setCreating(false); setNewName(''); setNameError('') }}>✕</button>
                </div>
                {nameError && <div className="profile-create-error">{nameError}</div>}
              </>
            ) : (
              <button className="profile-popover-action" onClick={() => setCreating(true)}>
                + New profile
              </button>
            )}

            {!creating && (
              <>
                <div className="profile-popover-divider"/>
                <button
                  className="profile-popover-action"
                  onClick={() => { onImport(); setOpen(false) }}
                >
                  Import profile…
                </button>
              </>
            )}
          </div>
        )}
      </div>

    </>
  )
}
