'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TerminalSpinner } from '@/components/terminal-spinner'
import { countryName } from '@/lib/countries'

type Candidate = {
  mbid:           string
  nome:           string
  pais:           string | null
  tipo:           string | null
  score:          number
  disambiguation: string | null
  begin_year:     number | null
}

type Phase = 'idle' | 'searching' | 'candidates' | 'enriching' | 'done' | 'error'

export function OharaInlinePanel({ artistId, artistName }: { artistId: string; artistName: string }) {
  const router = useRouter()
  const [phase,      setPhase]      = useState<Phase>('idle')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [errMsg,     setErrMsg]     = useState('')

  async function handleSearch() {
    setPhase('searching')
    setErrMsg('')
    try {
      const res  = await fetch(`/api/musicbrainz?action=search&q=${encodeURIComponent(artistName)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro na busca')
      const found: Candidate[] = (data.artists ?? []).slice(0, 5)
      if (found.length === 0) throw new Error('Nenhum resultado no MusicBrainz')
      setCandidates(found)
      setPhase('candidates')
    } catch (e: any) {
      setErrMsg(e.message ?? 'Erro desconhecido')
      setPhase('error')
    }
  }

  async function handleConfirm(candidate: Candidate) {
    setPhase('enriching')
    setErrMsg('')
    try {
      const enrichRes  = await fetch(`/api/enrich?mbid=${candidate.mbid}&name=${encodeURIComponent(artistName)}`)
      const enrichData = await enrichRes.json()
      if (enrichData.error) throw new Error(enrichData.error)

      const saveRes = await fetch('/api/artists', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mbid:            enrichData.identity?.mbid ?? candidate.mbid,
          name:            enrichData.identity?.name ?? artistName,
          country:         enrichData.identity?.country ?? candidate.pais,
          type:            enrichData.identity?.type ?? candidate.tipo,
          founded_year:    enrichData.identity?.formedYear
            ? parseInt(enrichData.identity.formedYear)
            : null,
          tags_editorial:  enrichData.tags_editorial,
          tags_behavioral: enrichData.tags_behavioral,
          listeners:       enrichData.audience?.listeners,
          wikipedia_url:   enrichData.sources?.wikipedia
            ? `https://en.wikipedia.org/wiki/${encodeURIComponent((enrichData.identity?.name ?? artistName).replace(/\s+/g, '_'))}`
            : null,
        }),
      })
      const saved = await saveRes.json()
      if (!saved.id) throw new Error('Erro ao salvar artista')

      setPhase('done')
      router.refresh()
    } catch (e: any) {
      setErrMsg(e.message ?? 'Erro desconhecido')
      setPhase('error')
    }
  }

  function handleNone() {
    setCandidates([])
    setPhase('idle')
  }

  function handleRetry() {
    setCandidates([])
    setPhase('idle')
  }

  // ── Render ──────────────────────────────────────────────────

  if (phase === 'idle') {
    return (
      <div style={panelBase}>
        <p style={sectionLabelStyle}>IDENTIFICAR ARTISTA</p>
        <button onClick={handleSearch} style={idleBtn}>
          identificar artista
        </button>
      </div>
    )
  }

  if (phase === 'searching') {
    return (
      <div style={panelBase}>
        <p style={sectionLabelStyle}>IDENTIFICAR ARTISTA</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...monoSmall }}>
          <TerminalSpinner size={13} />
          <span>buscando no MusicBrainz...</span>
        </div>
      </div>
    )
  }

  if (phase === 'enriching') {
    return (
      <div style={panelBase}>
        <p style={sectionLabelStyle}>IDENTIFICAR ARTISTA</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...monoSmall }}>
          <TerminalSpinner size={13} />
          <span>enriquecendo...</span>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div style={panelBase}>
        <p style={{ ...monoSmall, color: 'var(--amber)' }}>enriquecido</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div style={panelBase}>
        <p style={sectionLabelStyle}>IDENTIFICAR ARTISTA</p>
        <p style={{ ...monoSmall, color: 'var(--status-neg)', marginBottom: '0.5rem' }}>{errMsg}</p>
        <button onClick={handleRetry} style={idleBtn}>tentar novamente</button>
      </div>
    )
  }

  // candidates
  return (
    <div style={panelBase}>
      <p style={sectionLabelStyle}>IDENTIFICAR ARTISTA</p>
      <div>
        {candidates.map((c, i) => (
          <div key={c.mbid}>
            {i > 0 && <hr style={{ border: 'none', borderTop: '1px solid color-mix(in srgb, var(--border) 50%, transparent)', margin: '0.6rem 0' }} />}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{
                    fontFamily: 'var(--font-serif)', fontSize: '0.95rem',
                    color: 'var(--text)', lineHeight: 1.3,
                  }}>
                    {c.nome}
                  </span>
                  {c.disambiguation && (
                    <span style={{ ...monoSmall, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {c.disambiguation}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0 4px', marginTop: 2 }}>
                  {[
                    c.pais ? countryName(c.pais) : null,
                    c.begin_year ? `desde ${c.begin_year}` : null,
                    c.tipo ?? null,
                  ].filter(Boolean).map((seg, si, arr) => (
                    <span key={si} style={{ ...monoSmall, color: 'var(--text-dim)' }}>
                      {seg}{si < arr.length - 1 && <span style={{ margin: '0 4px', opacity: 0.4 }}>|</span>}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <a
                  href={`https://musicbrainz.org/artist/${c.mbid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...monoSmall, color: 'var(--text-muted)', textDecoration: 'none' }}
                >
                  MB ↗
                </a>
                <button onClick={() => handleConfirm(c)} style={confirmBtn}>
                  confirmar
                </button>
              </div>
            </div>
          </div>
        ))}

        <div style={{ marginTop: '0.75rem' }}>
          <button onClick={handleNone} style={noneBtn}>nenhum destes</button>
        </div>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────

const panelBase: React.CSSProperties = {
  background: 'var(--surface-raised)',
  borderRadius: 6,
  padding: '1rem 1.1rem',
  marginBottom: '1.5rem',
}

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.65rem',
  fontWeight: 500,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--accent-structure)',
  margin: '0 0 0.75rem',
}

const monoSmall: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  color: 'var(--text-dim)',
}

const idleBtn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.78rem',
  padding: '0.35rem 0.9rem',
  background: 'none',
  color: 'var(--text-dim)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  cursor: 'pointer',
}

const confirmBtn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  padding: '0.25rem 0.7rem',
  background: 'none',
  color: 'var(--amber)',
  border: '1px solid color-mix(in srgb, var(--amber) 40%, transparent)',
  borderRadius: 4,
  cursor: 'pointer',
}

const noneBtn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.72rem',
  background: 'none',
  color: 'var(--text-muted)',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
}
