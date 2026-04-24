import React, { useState } from 'react'
import type { Profile } from '../../../shared/types'

interface Props {
  profiles: Profile[]
  activeProfileId: string | null
  onSelect: (id: string | null) => void
  onCreate: (name: string) => void
  onDelete: (id: string) => void
}

export default function ProfileSelector({ profiles, activeProfileId, onSelect, onCreate, onDelete }: Props) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const handleCreate = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    onCreate(trimmed)
    setNewName('')
    setCreating(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate()
    if (e.key === 'Escape') { setCreating(false); setNewName('') }
  }

  return (
    <div className="profile-selector">
      <label className="profile-label">Profile</label>
      <select
        className="profile-dropdown"
        value={activeProfileId ?? ''}
        onChange={e => onSelect(e.target.value || null)}
      >
        <option value="">— select —</option>
        {profiles.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {creating ? (
        <>
          <input
            autoFocus
            className="profile-input"
            placeholder="Profile name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="btn btn-primary btn-sm" onClick={handleCreate}>Save</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setCreating(false); setNewName('') }}>Cancel</button>
        </>
      ) : (
        <button className="btn btn-ghost btn-sm" onClick={() => setCreating(true)}>+ New</button>
      )}

      {activeProfileId && !creating && (
        <button
          className="btn btn-danger btn-sm"
          onClick={() => { if (confirm('Delete this profile?')) onDelete(activeProfileId) }}
        >
          Delete
        </button>
      )}
    </div>
  )
}
