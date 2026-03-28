'use client'

import { useState } from 'react'

export function TooltipIcon({ text }: { text: string }) {
  const [show, setShow] = useState(false)

  return (
    <span style={{ position: 'relative', display: 'inline-block', marginLeft: 4, verticalAlign: 'middle' }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(s => !s)}
        style={{
          fontSize: '0.6rem', color: 'var(--text-muted)', cursor: 'pointer',
          userSelect: 'none', lineHeight: 1,
        }}
      >ⓘ</span>
      {show && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 4px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          color: 'var(--text-muted)', fontSize: '0.72rem', lineHeight: 1.4,
          padding: '0.35rem 0.65rem', borderRadius: 4,
          whiteSpace: 'nowrap', zIndex: 20, pointerEvents: 'none',
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        }}>
          {text}
        </span>
      )}
    </span>
  )
}
