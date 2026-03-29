'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { getShowDisplayName } from '@/lib/show-utils'
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
    case 'medio':         return 'var(--amber)'
    case 'fracasso':      return 'var(--status-neg)'
    default:              return 'var(--text-dim)'
  }
}

function formatData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  })
}

function isPast(iso: string) {
  return new Date(iso + 'T23:59:59') < new Date()
}

function todayMidnight() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

type FilterKey = 'proximos' | 'agenda' | 'realizados' | 'legado'

const FILTROS: { key: FilterKey; label: string }[] = [
  { key: 'proximos',   label: 'próximos' },
  { key: 'agenda',     label: 'agenda' },
  { key: 'realizados', label: 'realizados' },
  { key: 'legado',     label: 'legado' },
]

export function ShowsListClient({ shows, totalRows }: { shows: Show[]; totalRows: number }) {
  const [filtro, setFiltro] = useState<FilterKey>('proximos')
  const [busca,  setBusca]  = useState('')

  const filtered = useMemo(() => {
    let list = [...shows]
    const today = todayMidnight()
    const limit5 = new Date(today)
    limit5.setDate(limit5.getDate() + 5)

    switch (filtro) {
      case 'proximos':
        list = list.filter(s => {
          const d = new Date(s.data + 'T12:00:00')
          return d >= today && d <= limit5
        })
        list.sort((a, b) => a.data.localeCompare(b.data))
        break
      case 'agenda':
        list = list.filter(s => new Date(s.data + 'T12:00:00') >= today)
        list.sort((a, b) => a.data.localeCompare(b.data))
        break
      case 'realizados':
        list = list.filter(s => isPast(s.data))
        list.sort((a, b) => b.data.localeCompare(a.data))
        break
      case 'legado':
        list = list.filter(s => s.legado)
        list.sort((a, b) => b.data.localeCompare(a.data))
        break
    }

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

  return (
    <div style={{ padding: '1.5rem', maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Shows</h1>
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
          {FILTROS.map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)} style={{
              padding: '0.3rem 0.75rem', fontSize: '0.75rem', borderRadius: 99,
              cursor: 'pointer', border: '1px solid var(--border)',
              background: filtro === f.key ? 'var(--text)' : 'var(--surface)',
              color: filtro === f.key ? 'var(--nav-bg)' : 'var(--text-dim)',
            }}>
              {f.label}
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

      {/* Header */}
      <div style={{ display: 'flex', gap: '1rem', padding: '0 0.5rem 0.5rem', borderBottom: '1px solid var(--border)', marginBottom: 2 }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 160, flexShrink: 0 }}>Data</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flex: 1 }}>Evento</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 140, flexShrink: 0 }}>local</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 90, flexShrink: 0, textAlign: 'right' }}>status</span>
      </div>

      {filtered.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', padding: '2rem 0.5rem' }}>Nenhum show encontrado.</p>
      ) : (
        <div>
          {filtered.map(show => <ShowRow key={show.id} show={show} />)}
        </div>
      )}
    </div>
  )
}

function statusBadge(show: Show): { text: string; color: string } {
  const past = isPast(show.data)
  // Legado not yet confirmed
  if (show.legado && show.participou === null && past) {
    return { text: 'confirmar', color: 'var(--amber)' }
  }
  if (show.legado) {
    return { text: 'leg.', color: 'var(--text-muted)' }
  }
  // Future: no participou badge
  if (!past) {
    return { text: '—', color: 'var(--text-dim)' }
  }
  if (show.resultado_geral) {
    return {
      text: LABEL_RESULTADO[show.resultado_geral] ?? show.resultado_geral,
      color: corResultado(show.resultado_geral),
    }
  }
  // Past without confirmed participation
  if (show.participou === null) {
    return { text: 'confirmar', color: 'var(--amber)' }
  }
  if (show.participou === false) {
    return { text: '—', color: 'var(--text-muted)' }
  }
  return { text: 'pend.', color: 'var(--text-dim)' }
}

function ShowRow({ show }: { show: Show }) {
  const past    = isPast(show.data)
  const opacity = !past ? 1 : show.participou === false ? 0.45 : 0.55
  const badge   = statusBadge(show)

  return (
    <Link href={`/shows/${show.id}`} style={{
      display: 'flex', alignItems: 'center', gap: '1rem',
      padding: '0.55rem 0.5rem', borderBottom: '1px solid var(--border)',
      textDecoration: 'none', opacity,
    }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 160, flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
        {formatData(show.data)}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {getShowDisplayName(show.nome_evento, show.artistas)}
        </p>
        {show.nome_evento && show.artistas.length > 0 && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {show.artistas.join(' / ')}
          </p>
        )}
      </div>

      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 140, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {show.venue?.nome ?? '—'}
      </span>

      <span style={{ fontSize: '0.75rem', width: 90, flexShrink: 0, textAlign: 'right', color: badge.color }}>
        {badge.text}
      </span>
    </Link>
  )
}
