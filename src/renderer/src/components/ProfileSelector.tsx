import React, { useState } from 'react'
import type { Profile } from '../../../shared/types'
import ConfirmModal from './ConfirmModal'

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
  const [nameError, setNameError] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const handleCreate = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    if (profiles.some(p => p.name === trimmed)) {
      setNameError('A profile with this name already exists')
      return
    }
    onCreate(trimmed)
    setNewName('')
    setNameError('')
    setCreating(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate()
    if (e.key === 'Escape') { setCreating(false); setNewName(''); setNameError('') }
  }

  const handleCancel = () => { setCreating(false); setNewName(''); setNameError('') }

  const activeProfile = profiles.find(p => p.id === activeProfileId)

  return (
    <>
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
            <div className="profile-input-wrap">
              <input
                autoFocus
                className={`profile-input${nameError ? ' profile-input--error' : ''}`}
                placeholder="Profile name"
                value={newName}
                onChange={e => { setNewName(e.target.value); setNameError('') }}
                onKeyDown={handleKeyDown}
              />
              {nameError && <span className="profile-input-error">{nameError}</span>}
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleCreate}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={handleCancel}>Cancel</button>
          </>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={() => setCreating(true)}>+ New</button>
        )}

        {activeProfileId && !creating && (
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </button>
        )}
      </div>

      {confirmingDelete && activeProfile && (
        <ConfirmModal
          title="Delete Profile"
          message={`Delete "${activeProfile.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => { onDelete(activeProfileId!); setConfirmingDelete(false) }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </>
  )
}
