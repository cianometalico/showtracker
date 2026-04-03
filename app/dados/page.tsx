'use client'

import { useState } from 'react'
import { ImportClient } from './import-client'

type EnrichResult = {
  total: number
  ok: number
  skip: number
  fail: number
  message?: string
}

type EnrichState = 'idle' | 'loading' | 'done' | 'error'

type ConsolidateResult = {
  consolidated: number
  shows_deleted: number
  artists_moved: number
  errors: string[]
}

export default function DadosPage() {
  const [enrichState,  setEnrichState]  = useState<EnrichState>('idle')
  const [enrichResult, setEnrichResult] = useState<EnrichResult | null>(null)
  const [enrichError,  setEnrichError]  = useState('')

  const [consState,  setConsState]  = useState<EnrichState>('idle')
  const [consResult, setConsResult] = useState<ConsolidateResult | null>(null)
  const [consError,  setConsError]  = useState('')

  async function handleConsolidate() {
    setConsState('loading')
    setConsResult(null)
    setConsError('')
    try {
      const res  = await fetch('/api/consolidate-shows', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      setConsResult(data)
      setConsState('done')
    } catch (e: any) {
      setConsError(e.message ?? 'Erro desconhecido')
      setConsState('error')
    }
  }

  async function handleEnrichAll() {
    setEnrichState('loading')
    setEnrichResult(null)
    setEnrichError('')
    try {
      const res  = await fetch('/api/enrich-all')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      setEnrichResult(data)
      setEnrichState('done')
    } catch (e: any) {
      setEnrichError(e.message ?? 'Erro desconhecido')
      setEnrichState('error')
    }
  }

  return (
    <div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text)', margin: 0,
        }}>
          dados
        </h1>
      </div>

      {/* Enriquecer em massa */}
      <section style={{ marginBottom: '2rem' }}>
        <p className="section-label">enriquecer em massa</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
          Processa artistas sem MBID — busca MusicBrainz, Last.fm, Wikipedia, Setlist.fm
        </p>
        <button
          onClick={handleEnrichAll}
          disabled={enrichState === 'loading'}
          style={{
            padding: '0.45rem 1.1rem', fontSize: '0.8rem',
            background: 'var(--surface)', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: 4,
            cursor: enrichState === 'loading' ? 'default' : 'pointer',
            opacity: enrichState === 'loading' ? 0.6 : 1,
          }}
        >
          {enrichState === 'loading' ? 'processando...' : 'enriquecer artistas sem mbid'}
        </button>

        {enrichState === 'done' && enrichResult && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            total: {enrichResult.total} | ok: {enrichResult.ok} | sem match: {enrichResult.skip} | erros: {enrichResult.fail}
          </p>
        )}
        {enrichState === 'error' && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--status-neg)' }}>{enrichError}</p>
        )}
      </section>

      {/* Importar shows */}
      <ImportClient />

      {/* Consolidar shows multi-artista */}
      <section style={{ marginBottom: '2rem' }}>
        <p className="section-label">consolidar shows multi-artista</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
          Agrupa shows legado com mesmo festival + data + venue em um único show com múltiplos artistas
        </p>
        <button
          onClick={handleConsolidate}
          disabled={consState === 'loading'}
          style={{
            padding: '0.45rem 1.1rem', fontSize: '0.8rem',
            background: 'var(--surface)', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: 4,
            cursor: consState === 'loading' ? 'default' : 'pointer',
            opacity: consState === 'loading' ? 0.6 : 1,
          }}
        >
          {consState === 'loading' ? 'processando...' : 'consolidar shows multi-artista'}
        </button>

        {consState === 'done' && consResult && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            {consResult.consolidated} grupos consolidados | {consResult.shows_deleted} shows deletados | {consResult.artists_moved} artistas migrados
            {consResult.errors.length > 0 && (
              <span style={{ color: 'var(--status-neg)' }}> | {consResult.errors.length} erros</span>
            )}
          </p>
        )}
        {consState === 'error' && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--status-neg)' }}>{consError}</p>
        )}
      </section>

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
