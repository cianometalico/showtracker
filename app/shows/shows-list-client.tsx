'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { getShowDisplayName, isShowPast } from '@/lib/show-utils'
import { removeAccents } from '@/lib/text-utils'

type Show = {
  id: string
  data: string
  nome_evento: string | null
  artistas: string[]
  venue: { id: string; nome: string; cidade: string } | null
  status_ingresso: string | null
  clima_estimado: string | null
  concorrencia: string | null
  participou: boolean | null
  resultado_geral: string | null
  legado: boolean
  tour: string | null
}

const LABEL_RESULTADO: Record<string, string> = {
  sucesso_total: 'Sucesso Total',
  sucesso:       'Sucesso',
  medio:         'Médio',
  fracasso:      'Fracasso',
}

const ICONE_CLIMA: Record<string, string> = {
  sol: '☀', nublado: '☁', chuva: '🌧', frio: '🥶',
}

function corResultado(r: string): string {
  switch (r) {
    case 'sucesso_total': return 'var(--status-pos)'
    case 'sucesso':       return 'var(--status-pos)'
    case 'medio':         return 'var(--status-neut)'
    case 'fracasso':      return 'var(--status-neg)'
    default:              return 'var(--text-dim)'
  }
}

function corStatusIngresso(status: string | null): string {
  switch (status) {
    case 'sold out':    return 'var(--status-pos)'
    case 'bem vendido': return 'var(--status-neut-p)'
    case 'mal vendido': return 'var(--status-neg)'
    default:            return 'var(--text-muted)'
  }
}

function formatData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  })
}

// ── Filter definitions ────────────────────────────────────────

type ShowFilter = 'a-participar' | 'nao-participarei' | 'participados' | 'nao-participados' | 'todos'

const FILTERS: { value: ShowFilter; label: string }[] = [
  { value: 'a-participar',     label: 'A PARTICIPAR' },
  { value: 'nao-participarei', label: 'NÃO PARTICIPAREI' },
  { value: 'participados',     label: 'PARTICIPADOS' },
  { value: 'nao-participados', label: 'NÃO PARTICIPADOS' },
  { value: 'todos',            label: 'TODOS' },
]

function applyFilter(shows: Show[], filtro: ShowFilter): Show[] {
  switch (filtro) {
    case 'a-participar':
      return shows
        .filter(s => !isShowPast(s.data) && s.participou === true)
        .sort((a, b) => a.data.localeCompare(b.data))
    case 'nao-participarei':
      return shows
        .filter(s => !isShowPast(s.data) && s.participou === false)
        .sort((a, b) => a.data.localeCompare(b.data))
    case 'participados':
      return shows
        .filter(s => isShowPast(s.data) && s.participou === true)
        .sort((a, b) => b.data.localeCompare(a.data))
    case 'nao-participados':
      return shows
        .filter(s => isShowPast(s.data) && s.participou === false)
        .sort((a, b) => b.data.localeCompare(a.data))
    case 'todos':
      return [...shows].sort((a, b) => a.data.localeCompare(b.data))
  }
}

// ── Component ─────────────────────────────────────────────────

export function ShowsListClient({ shows, totalRows }: { shows: Show[]; totalRows: number }) {
  const [filtro, setFiltro] = useState<ShowFilter>(() =>
    shows.some(s => !isShowPast(s.data) && s.participou === true) ? 'a-participar' : 'todos'
  )
  const [busca, setBusca] = useState('')
  const todayMarkerRef = useRef<HTMLDivElement>(null)

  // Per-filter counts (no busca applied — always reflect full dataset)
  const counts = useMemo<Record<ShowFilter, number>>(() => ({
    'a-participar':     shows.filter(s => !isShowPast(s.data) && s.participou === true).length,
    'nao-participarei': shows.filter(s => !isShowPast(s.data) && s.participou === false).length,
    'participados':     shows.filter(s =>  isShowPast(s.data) && s.participou === true).length,
    'nao-participados': shows.filter(s =>  isShowPast(s.data) && s.participou === false).length,
    'todos':            shows.length,
  }), [shows])

  const filtered = useMemo(() => {
    let list = applyFilter(shows, filtro)
    if (busca.trim()) {
      const q = removeAccents(busca.toLowerCase())
      list = list.filter(s =>
        removeAccents((s.nome_evento ?? '').toLowerCase()).includes(q) ||
        s.artistas.some(a => removeAccents(a.toLowerCase()).includes(q)) ||
        removeAccents((s.venue?.nome ?? '').toLowerCase()).includes(q)
      )
    }
    return list
  }, [shows, filtro, busca])

  // Index of first future show in 'todos' list (for "hoje" marker)
  const firstFutureIndex = useMemo(() =>
    filtro === 'todos' ? filtered.findIndex(s => !isShowPast(s.data)) : -1,
    [filtered, filtro]
  )

  // Scroll to "hoje" marker when switching to 'todos'
  useEffect(() => {
    if (filtro === 'todos' && todayMarkerRef.current) {
      todayMarkerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [filtro])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--text)', margin: 0 }}>Shows</h1>
        <Link href="/shows/new" style={{
          padding: '0.4rem 1rem', fontSize: '0.8rem',
          background: 'var(--surface-raised)', color: 'var(--text)',
          border: '1px solid var(--border)', borderRadius: 4, textDecoration: 'none',
        }}>
          + novo show
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setFiltro(f.value)} style={{
              padding: '0.3rem 0.75rem', fontSize: '0.68rem', borderRadius: 99,
              cursor: 'pointer', border: '1px solid var(--border)',
              fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
              background: filtro === f.value ? 'var(--text)' : 'var(--surface)',
              color:      filtro === f.value ? 'var(--nav-bg)' : 'var(--text-dim)',
            }}>
              {f.label}
              <span style={{ marginLeft: '0.35em', opacity: 0.6 }}>({counts[f.value]})</span>
            </button>
          ))}
        </div>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="buscar..."
          style={{
            marginLeft: 'auto', fontSize: '0.8rem', background: 'none',
            border: 'none', borderBottom: '1px solid var(--border)',
            color: 'var(--text)', outline: 'none', padding: '0.2rem 0.25rem', width: 140,
          }} />
      </div>

      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>
        {filtered.length} show{filtered.length !== 1 ? 's' : ''}
      </p>

      {filtered.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', padding: '2rem 0.5rem' }}>Nenhum show encontrado.</p>
      ) : (
        <div>
          {filtered.map((show, idx) => (
            <div key={show.id}>
              {filtro === 'todos' && idx === firstFutureIndex && (
                <div ref={todayMarkerRef} style={{
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--cyan)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '4px 0',
                  borderTop: '1px solid var(--cyan)',
                  marginBottom: 4,
                }}>
                  hoje
                </div>
              )}
              <ShowRow show={show} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── ShowRow ───────────────────────────────────────────────────

function statusBadge(show: Show): { text: string; color: string } {
  const past = isShowPast(show.data)
  if (show.legado && show.participou === null && past) {
    return { text: 'confirmar', color: 'var(--amber)' }
  }
  if (show.legado) {
    return { text: 'leg.', color: 'var(--text-muted)' }
  }
  if (!past) {
    return { text: '—', color: 'var(--text-dim)' }
  }
  if (show.resultado_geral) {
    return {
      text:  LABEL_RESULTADO[show.resultado_geral] ?? show.resultado_geral,
      color: corResultado(show.resultado_geral),
    }
  }
  if (show.participou === null) {
    return { text: 'confirmar', color: 'var(--amber)' }
  }
  if (show.participou === false) {
    return { text: '—', color: 'var(--text-muted)' }
  }
  return { text: 'pend.', color: 'var(--text-dim)' }
}

function ShowRow({ show }: { show: Show }) {
  const past    = isShowPast(show.data)
  const opacity = !past ? 1 : show.participou === false ? 0.45 : 0.55
  const badge   = statusBadge(show)
  const nome    = getShowDisplayName(show.nome_evento, show.artistas)
  const venue   = show.venue?.nome ?? null

  return (
    <Link href={`/shows/${show.id}`} style={{
      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
      padding: '0.6rem 0', borderBottom: '1px solid var(--border)',
      textDecoration: 'none', opacity,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: 'var(--font-serif)', fontSize: '0.95rem', color: 'var(--text)',
          margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {nome}
          {show.legado && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: 6 }}>
              leg.
            </span>
          )}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
          <span>{formatData(show.data)}</span>
          {venue && (
            <>
              <span style={{ margin: '0 5px', opacity: 0.4 }}>|</span>
              <span>{venue}</span>
            </>
          )}
          {show.status_ingresso && (
            <>
              <span style={{ margin: '0 5px', opacity: 0.4 }}>|</span>
              <span style={{ color: corStatusIngresso(show.status_ingresso) }}>{show.status_ingresso}</span>
            </>
          )}
        </div>
        {show.tour && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '2px 0 0' }}>
            {show.tour}
          </p>
        )}
      </div>
      <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: badge.color, flexShrink: 0, paddingTop: 2 }}>
        {badge.text}
      </span>
    </Link>
  )
}
