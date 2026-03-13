// app/shows/[id]/show-history-block.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type SFShow = {
  data: string; venue_nome: string | null; cidade: string | null
  tour: string | null; setlist_url: string | null
}

type ShowRow = {
  id: string; data: string; nome_evento: string | null
  artistas: string[]; resultado_geral: string | null
  status_ingresso: string; participou: boolean
}

type Props = {
  venueId:       string | null
  venueNome:     string | null
  showAtualId:   string
  showAtualData: string
  lineup:        { artist_id: string; nome: string; mbid?: string | null }[]
  showsDoVenue:  ShowRow[]
}

function fmtISO(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}
function fmtSF(ddmmyyyy: string) {
  const p = ddmmyyyy.split('-')
  if (p.length !== 3) return ddmmyyyy
  return new Date(`${p[2]}-${p[1]}-${p[0]}T12:00:00Z`).toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}
function parseSFTs(s: string): number {
  const p = s.split('-')
  if (p.length !== 3) return 0
  return new Date(`${p[2]}-${p[1]}-${p[0]}T12:00:00Z`).getTime()
}

export function ShowHistoryBlock({ venueId, showAtualId, showAtualData, lineup }: Props) {
  const [aba, setAba] = useState<'brasil' | 'tour'>('brasil')
  if (lineup.length === 0) return null
  const headliner = lineup[0]

  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Histórico</h2>
      <div className="flex gap-1 mb-5">
        {(['brasil', 'Rota da Tour'] as const).map((item, i) => {
          const key = i === 0 ? 'brasil' : 'tour'
          return (
            <button key={key}
              onClick={() => setAba(key as 'brasil' | 'tour')}
              className={`px-3 py-1 text-xs rounded cursor-pointer transition-colors ${
                aba === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {i === 0 ? 'Brasil' : 'Rota da Tour'}
            </button>
          )
        })}
      </div>

      {aba === 'brasil' && (
        <SFBlock
          key={`brasil-${headliner.artist_id}`}
          mbid={headliner.mbid ?? null}
          artistId={headliner.artist_id}
          artistNome={headliner.nome}
          showAtualData={showAtualData}
        />
      )}
      {aba === 'tour' && (
        <RotaBlock
          key={`tour-${lineup.map(l => l.artist_id).join('-')}`}
          lineup={lineup}
        />
      )}
    </div>
  )
}

// ── BLOCO COMPARTILHADO: busca SF e renderiza com zoom ────────

function SFBlock({ mbid, artistId, artistNome, showAtualData }: {
  mbid:          string | null
  artistId:      string
  artistNome:    string
  showAtualData: string
}) {
  const [shows,   setShows]   = useState<SFShow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!mbid) {
      setShows([])
      setError('Artista sem MBID — enriqueça no perfil')
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/setlistfm?action=shows_brasil&mbid=${mbid}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.error) throw new Error(data.error)
        setShows(data.shows ?? [])
      })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [mbid])

  if (loading) return <p className="text-xs text-gray-400 animate-pulse">Carregando Setlist.fm…</p>
  if (error)   return (
    <div>
      <p className="text-xs text-red-400 mb-2">{error}</p>
      <Link href={`/database/artistas/${artistId}`} className="text-xs text-gray-400 hover:text-gray-600">
        Ir para perfil do artista →
      </Link>
    </div>
  )
  if (shows === null) return null
  if (shows.length === 0) return (
    <div>
      <p className="text-sm text-gray-400 mb-2">Nenhuma passagem pelo Brasil encontrada no Setlist.fm.</p>
      <Link href={`/database/artistas/${artistId}`} className="text-xs text-gray-400 hover:text-gray-600">
        Ver perfil do artista →
      </Link>
    </div>
  )

  return (
    <ZoomedTimeline
      shows={shows}
      showAtualData={showAtualData}
      footer={
        <Link href={`/database/artistas/${artistId}`} className="text-xs text-gray-400 hover:text-gray-600 mt-4 inline-block">
          Ver perfil do artista →
        </Link>
      }
      label={`${shows.length} passagem${shows.length !== 1 ? 's' : ''} pelo Brasil · ${artistNome}`}
    />
  )
}

// ── ROTA DA TOUR ──────────────────────────────────────────────

type SFShowGlobal = SFShow & { pais?: string | null }

function RotaBlock({ lineup }: {
  lineup: { artist_id: string; nome: string; mbid?: string | null }[]
}) {
  const [idx,     setIdx]     = useState(0)
  const [shows,   setShows]   = useState<SFShowGlobal[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const artist = lineup[idx]

  useEffect(() => {
    if (!artist.mbid) {
      setShows([]); setError('Artista sem MBID — enriqueça no perfil'); return
    }
    let cancelled = false
    setLoading(true); setError(null); setShows(null)
    fetch(`/api/setlistfm?action=shows_global&mbid=${artist.mbid}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setShows(data.shows ?? []) })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [artist.artist_id, artist.mbid])

  const recentes = (shows ?? [])
    .sort((a, b) => parseSFTs(b.data) - parseSFTs(a.data))
    .slice(0, 10)

  return (
    <div>
      {lineup.length > 1 && (
        <div className="flex gap-1 mb-4 flex-wrap">
          {lineup.map((a, i) => (
            <button key={a.artist_id} onClick={() => setIdx(i)}
              className={`px-2 py-1 text-xs rounded cursor-pointer transition-colors ${
                idx === i ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {a.nome}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-xs text-gray-400 animate-pulse">Carregando Setlist.fm…</p>}
      {error   && <p className="text-xs text-red-400">{error}</p>}
      {!loading && shows !== null && shows.length === 0 && !error && (
        <p className="text-sm text-gray-400">Nenhum show encontrado no Setlist.fm.</p>
      )}
      {!loading && shows !== null && shows.length > 0 && (
        <>
          <p className="text-xs text-gray-400 mb-3">{shows.length} shows registrados · {artist.nome}</p>
          {recentes.map((s, i) => <SFRow key={`r${i}`} show={s} opacity={1 - i * 0.07} showPais />)}
          <Link href={`/database/artistas/${artist.artist_id}`}
            className="text-xs text-gray-400 hover:text-gray-600 mt-4 inline-block">
            Ver perfil do artista →
          </Link>
        </>
      )}
    </div>
  )
}

// ── LINHA DO TEMPO COM ZOOM ───────────────────────────────────

function ZoomedTimeline({ shows, showAtualData, footer, label }: {
  shows:         SFShow[]
  showAtualData: string
  footer?:       React.ReactNode
  label?:        string
}) {
  const showAtualTs = new Date(showAtualData + 'T12:00:00').getTime()

  const antes  = shows
    .filter(s => parseSFTs(s.data) < showAtualTs && Math.abs(parseSFTs(s.data) - showAtualTs) > 43200000)
    .sort((a, b) => parseSFTs(b.data) - parseSFTs(a.data))
  const depois = shows
    .filter(s => parseSFTs(s.data) > showAtualTs && Math.abs(parseSFTs(s.data) - showAtualTs) > 43200000)
    .sort((a, b) => parseSFTs(a.data) - parseSFTs(b.data))

  const maxDist = Math.max(
    ...shows.map(s => Math.abs(parseSFTs(s.data) - showAtualTs)), 1
  )
  function op(s: SFShow) {
    return 1.0 - (Math.abs(parseSFTs(s.data) - showAtualTs) / maxDist) * 0.55
  }

  const temShows = antes.length > 0 || depois.length > 0

  return (
    <div>
      {label && <p className="text-xs text-gray-400 mb-3">{label}</p>}
      {antes.map((s, i)  => <SFRow key={`a${i}`} show={s} opacity={op(s)} />)}
      {temShows && (
        <div className="flex items-center gap-2 py-2 px-2 -mx-2 my-2 border-l-2 border-gray-900">
          <span className="text-xs font-bold text-gray-900 tabular-nums">{fmtISO(showAtualData)}</span>
        </div>
      )}
      {depois.map((s, i) => <SFRow key={`d${i}`} show={s} opacity={op(s)} />)}
      {footer}
    </div>
  )
}

function SFRow({ show, opacity, showPais }: { show: SFShow & { pais?: string | null }; opacity: number; showPais?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded" style={{ opacity }}>
      <span className="text-xs text-gray-400 w-28 shrink-0 tabular-nums">{fmtSF(show.data)}</span>
      <span className="flex-1 text-xs text-gray-600 truncate">{show.venue_nome ?? '—'}</span>
      <span className="text-xs text-gray-400 shrink-0 w-20 truncate text-right">{show.cidade ?? '—'}{showPais && show.pais ? ` · ${show.pais}` : ''}</span>
      {show.tour && (
        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0 max-w-[100px] truncate" title={show.tour}>
          {show.tour}
        </span>
      )}
      {show.setlist_url && (
        <a href={show.setlist_url} target="_blank" rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-600 shrink-0">↗</a>
      )}
    </div>
  )
}