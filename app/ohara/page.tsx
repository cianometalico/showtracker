import { Suspense } from 'react'
import { OharaSearch } from '@/components/ohara-search'
import { ImportClient } from '../dados/import-client'
import { DiagnosticsSection } from '../dados/diagnostics-section'
import { DadosOperationsClient } from '../dados/dados-operations-client'

export default function OharaPage() {
  return (
    <div style={{
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

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2rem 0' }} />

      {/* Diagnóstico */}
      <Suspense fallback={
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          carregando diagnóstico...
        </p>
      }>
        <DiagnosticsSection />
      </Suspense>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.5rem 0 2rem' }} />

      {/* Importar shows */}
      <ImportClient />

      {/* Enriquecer + Consolidar */}
      <DadosOperationsClient />

      {/* Exportar */}
      <section style={{ marginBottom: '2rem' }}>
        <p className="section-label">exportar</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          em breve — exportar shows, artistas e estoque em CSV
        </p>
      </section>
    </div>
  )
}
