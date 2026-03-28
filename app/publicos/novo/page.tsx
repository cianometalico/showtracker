import Link from 'next/link'
import { NichoFormClient } from '../nicho-form-client'
import { createNicho } from '../[id]/actions'

export default function NovaNichoPage() {
  return (
    <div style={{ padding: '1.5rem', maxWidth: 700 }}>
      <Link href="/publicos" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
        ← públicos
      </Link>

      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', margin: '1.25rem 0 2rem', letterSpacing: '-0.01em' }}>
        novo nicho
      </h1>

      <NichoFormClient action={createNicho} />
    </div>
  )
}
