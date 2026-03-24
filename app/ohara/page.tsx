'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

type MBResult = {
  mbid: string
  nome: string
  tipo: string | null
  pais: string | null
  score: number
  tags: string[]
  disambiguation: string | null
}

type ShowItem = {
  date: string
  venue: string | null
  city: string | null
  country: string | null
  tour: string | null
  url: string | null
  upcoming: boolean
}

type EnrichData = {
  identity: {
    mbid: string; name: string; type: string | null
    country: string | null; formedYear: string | null; endedYear: string | null
  }
  activity: {
    last_album: { title: string; year: string | null } | null
    current_tour: { name: string; url: string | null } | null
  }
  audience: { listeners: number; playcount: number }
  tags_editorial: string[]
  tags_behavioral: { name: string; count?: number }[]
  description: string | null
  extract: string | null
  thumbnail: string | null
  shows: {
    upcoming: ShowItem[]
    recent: ShowItem[]
    last_br: string | null
  }
  sources: Record<string, boolean>
}

function ShowLine({ s }: { s: ShowItem }) {
  const isBR = s.country === 'BR'
  const isPast = !s.upcoming
  const location = [s.city, s.country].filter(Boolean).join(', ')
  const label = [s.date, s.venue, location].filter(Boolean).join(' — ')

  const style: React.CSSProperties = {
    fontSize: '0.8rem',
    marginBottom: 3,
    fontWeight: isBR ? 'bold' : 'normal',
    opacity: isBR && isPast ? 0.35 : isBR ? 1 : 0.6,
    color: isBR && !isPast ? '#7fffb0' : 'inherit',
  }

  return (
    <div style={style}>
      {s.url
        ? <a href={s.url} target="_blank" rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {label}
        </a>
        : label
      }
    </div>
  )
}

export default function OharaPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MBResult[]>([])
  const [loading, setLoading] = useState(false)
  const [enriching, setEnriching] = useState<string | null>(null)
  const [panel, setPanel] = useState<EnrichData | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const searchParams = useSearchParams()

useEffect(() => {
  const prefill = searchParams.get('prefill')
  if (!prefill) return
  setQuery(prefill)
  // dispara busca automática
  fetch(`/api/musicbrainz?action=search&q=${encodeURIComponent(prefill)}`)
    .then(r => r.json())
    .then(data => {
      setResults(data.artists ?? [])
      setLoading(false)
    })
  setLoading(true)
  setPanel(null)
}, [])

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    setPanel(null)
    setSaved(false)
    const res = await fetch(`/api/musicbrainz?action=search&q=${encodeURIComponent(query)}`)
    const data = await res.json()
    setResults(data.artists ?? [])
    setLoading(false)
  }

  async function enrich(r: MBResult) {
    setEnriching(r.mbid)
    setSaved(false)
    setSaveError(null)
    const res = await fetch(`/api/enrich?mbid=${r.mbid}&name=${encodeURIComponent(r.nome)}`)
    const data = await res.json()
    setPanel(data)
    setEnriching(null)
  }

  async function save() {
    if (!panel) return
    setSaving(true)
    setSaveError(null)
    const res = await fetch('/api/artists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mbid: panel.identity.mbid,
        name: panel.identity.name,
        country: panel.identity.country,
        type: panel.identity.type,
        formedYear: panel.identity.formedYear,
        endedYear: panel.identity.endedYear,
        tags_editorial: panel.tags_editorial,
        tags_behavioral: panel.tags_behavioral,
        listeners: panel.audience.listeners,
        wikipedia_url: panel.sources.wikipedia ? `https://en.wikipedia.org/wiki/${encodeURIComponent(panel.identity.name.replace(/\s+/g, '_'))}` : null,
      }),
    })
    const data = await res.json()
    if (data.ok) { setSaved(true) }
    else { setSaveError(data.error ?? 'erro ao salvar') }
    setSaving(false)
  }

  const srcLabel: Record<string, string> = {
    musicbrainz: 'mb', lastfm: 'lfm', wikipedia: 'wp', setlistfm: 'setlist',
  }

  return (
    <main style={{
      maxWidth: 900,
      margin: '0 auto',
      padding: '2rem',
      fontFamily: 'monospace',
      color: '#c8d8e8',
      background: '#080c10',
      minHeight: '100vh',
    }}>
      <h1 style={{ fontSize: '1.4rem', marginBottom: '0.25rem', letterSpacing: 2 }}>OHARA</h1>
      <p style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '1.5rem' }}>
        enriquecimento de artistas — mb · lfm · wikipedia · setlist.fm
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="buscar artista..."
          style={{ flex: 1, padding: '0.5rem', fontSize: '1rem', background: '#111', color: '#eee', border: '1px solid #333' }}
        />
        <button onClick={search} disabled={loading}
          style={{ padding: '0.5rem 1.2rem', background: '#222', color: '#eee', border: '1px solid #444', cursor: 'pointer' }}>
          {loading ? '...' : 'buscar'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* Lista MB */}
        <div style={{ width: 280, flexShrink: 0 }}>
          {results.map(r => (
            <div key={r.mbid} onClick={() => enrich(r)}
              style={{
                padding: '0.75rem', border: '1px solid #2a2a2a', marginBottom: '0.5rem', cursor: 'pointer',
                background: panel?.identity.mbid === r.mbid ? '#1a1a2e' : '#111',
              }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{r.nome}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: 2 }}>
                {[r.tipo, r.pais].filter(Boolean).join(' · ')}
                <span style={{ float: 'right' }}>score {r.score}</span>
              </div>
              {r.disambiguation && (
                <div style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: 2 }}>{r.disambiguation}</div>
              )}
              {enriching === r.mbid && (
                <div style={{ fontSize: '0.7rem', color: '#4af', marginTop: 4 }}>enriquecendo...</div>
              )}
            </div>
          ))}
        </div>

        {/* Painel */}
        {panel && (
          <div style={{ flex: 1, border: '1px solid #2a2a2a', padding: '1.25rem', background: '#0d0d0d' }}>

            {/* Identidade */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              {panel.thumbnail && (
                <img src={panel.thumbnail} style={{ width: 80, height: 80, objectFit: 'cover', flexShrink: 0 }} />
              )}
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{panel.identity.name}</div>
                <div style={{ opacity: 0.5, fontSize: '0.85rem', marginTop: 2 }}>
                  {[panel.identity.type, panel.identity.country, panel.identity.formedYear && `desde ${panel.identity.formedYear}`].filter(Boolean).join(' · ')}
                </div>
                <div style={{ opacity: 0.5, fontSize: '0.75rem', marginTop: 2 }}>{panel.description}</div>
              </div>
            </div>

            {panel.extract && (
              <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '1rem', lineHeight: 1.5 }}>
                {panel.extract}
              </div>
            )}

            {/* Métricas */}
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ opacity: 0.5 }}>listeners </span>
                <strong>{panel.audience.listeners.toLocaleString('pt-BR')}</strong>
              </div>
              {panel.activity.last_album && (
                <div>
                  <span style={{ opacity: 0.5 }}>último álbum </span>
                  <strong>{panel.activity.last_album.title}</strong>
                  {panel.activity.last_album.year && (
                    <span style={{ opacity: 0.4 }}> ({panel.activity.last_album.year})</span>
                  )}
                </div>
              )}
              {panel.shows.last_br && (
                <div>
                  <span style={{ opacity: 0.5 }}>último BR </span>
                  <strong style={{ color: '#4f4' }}>{panel.shows.last_br}</strong>
                </div>
              )}
            </div>

            {/* Tour */}
            {panel.activity.current_tour && (
              <div style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                <span style={{ opacity: 0.5 }}>tour atual </span>
                {panel.activity.current_tour.url
                  ? <a href={panel.activity.current_tour.url} target="_blank" rel="noopener noreferrer"
                    style={{ color: '#aaf', textDecoration: 'none', borderBottom: '1px solid #334' }}>
                    {panel.activity.current_tour.name}
                  </a>
                  : <strong>{panel.activity.current_tour.name}</strong>
                }
              </div>
            )}

            {/* Tags */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.7rem', opacity: 0.4, marginBottom: '0.4rem' }}>TAGS — MB (editorial)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.6rem' }}>
                {panel.tags_editorial.length > 0
                  ? panel.tags_editorial.map((t, i) => (
                    <span key={i} style={{
                      background: '#1a2a1a', padding: '0.15rem 0.5rem',
                      borderRadius: 3, fontSize: '0.75rem', border: '1px solid #2a3a2a',
                    }}>{t}</span>
                  ))
                  : <span style={{ fontSize: '0.75rem', opacity: 0.3 }}>sem tags no MusicBrainz</span>
                }
              </div>
              <div style={{ fontSize: '0.7rem', opacity: 0.4, marginBottom: '0.4rem' }}>TAGS — Last.fm (comportamental)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {panel.tags_behavioral.map((t, i) => (
                  <span key={i} style={{
                    background: '#1a1a2a', padding: '0.15rem 0.5rem',
                    borderRadius: 3, fontSize: '0.75rem', border: '1px solid #2a2a3a',
                  }}>
                    {t.name}
                    {t.count && <span style={{ opacity: 0.35, fontSize: '0.65rem', marginLeft: 3 }}>{t.count}</span>}
                  </span>
                ))}
              </div>
            </div>

            {/* Shows */}
            {(panel.shows.upcoming.length > 0 || panel.shows.recent.length > 0) && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.4, marginBottom: '0.4rem' }}>SHOWS</div>
                {panel.shows.upcoming.map((s, i) => <ShowLine key={`u${i}`} s={s} />)}
                {panel.shows.upcoming.length > 0 && panel.shows.recent.length > 0 && (
                  <div style={{ borderTop: '1px solid #1a1a1a', margin: '0.4rem 0' }} />
                )}
                {panel.shows.recent.map((s, i) => <ShowLine key={`r${i}`} s={s} />)}
              </div>
            )}

            {/* Rodapé */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button onClick={save} disabled={saving || saved}
                style={{
                  padding: '0.5rem 1.5rem', background: saved ? '#1a3a1a' : '#1a1a3a',
                  color: saved ? '#4f4' : '#aaf', border: `1px solid ${saved ? '#4f4' : '#44f'}`,
                  cursor: 'pointer', fontSize: '0.9rem',
                }}>
                {saved ? '✓ salvo' : saving ? 'salvando...' : 'salvar artista'}
              </button>
              {saveError && <span style={{ fontSize: '0.75rem', color: '#f44' }}>{saveError}</span>}
              <div style={{ fontSize: '0.7rem', opacity: 0.3, marginLeft: 'auto' }}>
                {Object.entries(panel.sources)
                  .filter(([, v]) => v)
                  .map(([k]) => srcLabel[k] ?? k)
                  .join(' · ')}
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  )
}