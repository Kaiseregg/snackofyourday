import React from 'react'

export default function Modal({ open, onClose, children }) {
  if (!open) return null
  return (
    <div className='modalOverlay' onMouseDown={onClose}>
      <div className='modal' onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
