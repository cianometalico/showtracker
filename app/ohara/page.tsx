import { Suspense } from 'react'
import { OharaSearch } from '@/components/ohara-search'

export default function OharaPage() {
  return (
    <div style={{
      padding: '1.5rem',
      maxWidth: 720,
      borderTop: '1px solid var(--amber)',
      background: 'linear-gradient(180deg, rgba(232,184,48,0.06) 0%, transparent 300px)',
      minHeight: '100vh',
    }}>
      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '1.5rem',
        fontWeight: 400,
        color: 'var(--amber)',
        margin: '0 0 0.25rem',
        textTransform: 'lowercase',
      }}>
        ohara
      </h1>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: 'var(--text-dim)',
        margin: '0 0 1.5rem',
      }}>
        pipeline de enriquecimento — buscar, enriquecer e navegar para artistas
      </p>

      <Suspense fallback={null}>
        <OharaSearch defaultExpanded />
      </Suspense>
    </div>
  )
}
