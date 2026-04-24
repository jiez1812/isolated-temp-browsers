import React from 'react'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }: Props) {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onCancel()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal modal--sm">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn-icon" onClick={onCancel} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          <p className="confirm-message">{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
