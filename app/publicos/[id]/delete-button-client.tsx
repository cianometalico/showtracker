'use client'

import { useState, useTransition } from 'react'
import { deleteNicho } from './actions'

export function NichoDeleteButton({ nichoId }: { nichoId: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function handleDelete() {
    if (!confirm('excluir este nicho? não pode ser desfeito.')) return
    setError(null)
    start(async () => {
      const res = await deleteNicho(nichoId)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <>
      <button
        onClick={handleDelete}
        disabled={pending}
        style={{
          fontSize: '0.75rem', color: 'var(--red)', background: 'none',
          border: '1px solid var(--red)', padding: '0.2rem 0.65rem',
          borderRadius: 4, cursor: 'pointer', opacity: pending ? 0.5 : 1,
        }}
      >
        {pending ? 'excluindo…' : 'excluir'}
      </button>
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--red)' }}>{error}</span>}
    </>
  )
}
