import React from 'react'

export interface ToastItem {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

interface Props {
  toasts: ToastItem[]
}

export default function ToastContainer({ toasts }: Props) {
  if (toasts.length === 0) return null
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
