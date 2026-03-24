'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

type Show = {
  id: string
  data: string
  nome_evento: string | null
  artistas: string[]
  venue: { id: string; nome: string; cidade: string } | null
  status_ingresso: string | null
  clima_estimado: string | null
  concorrencia: string | null
  participou: boolean
  resultado_geral: string | null
}

const LABEL_STATUS: Record<string, string> = {
  'sold out':    'Sold Out',
  'bem vendido': 'Bem Vendido',
  'mal vendido': 'Mal Vendido',
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
    case 'sucesso_total': return 'var(--green)'
    case 'sucesso':       return 'var(--green)'
    case 'medio':         return 'var(--amber)'
    case 'fracasso':      return 'var(--red)'
    default:              return 'var(--text-dim)'
  }
}

function corIngresso(s: string | null): string {
  switch (s) {
    case 'sold out':    return 'var(--green)'
    case 'bem vendido': return 'var(--amber)'
    case 'mal vendido': return 'var(--red)'
    default:            return 'var(--text-dim)'
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

type FilterKey = 'todos' | 'proximos' | 'realizados' | 'sem_resultado'

const FILTROS: { key: FilterKey; label: string }[] = [
  { key: 'todos',         label: 'Todos' },
  { key: 'proximos',      label: 'Próximos' },
  { key: 'realizados',    label: 'Realizados' },
  { key: 'sem_resultado', label: 'Sem resultado' },
]

export function ShowsListClient({ shows, totalRows }: { shows: Show[]; totalRows: number }) {
  const [filtro, setFiltro] = useState<FilterKey>('proximos')
  const [busca,  setBusca]  = useState('')

  const filtered = useMemo(() => {
    let list = [...shows]
    switch (filtro) {
      case 'proximos':
        list = list.filter(s => !isPast(s.data))
        break
      case 'realizados':
        list = list.filter(s => isPast(s.data) && s.participou).reverse()
        break
      case 'sem_resultado':
        list = list.filter(s => s.participou && isPast(s.data) && !s.resultado_geral).reverse()
        break
    }
    if (busca.trim()) {
      const q = busca.toLowerCase()
      list = list.filter(s =>
        (s.nome_evento ?? '').toLowerCase().includes(q) ||
        s.artistas.some(a => a.toLowerCase().includes(q)) ||
        (s.venue?.nome ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [shows, filtro, busca])

  const semResultado = shows.filter(s => s.participou && isPast(s.data) && !s.resultado_geral)

  return (
    <div style={{ padding: '1.5rem', maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Shows</h1>
        <Link href="/shows/new" style={{
          padding: '0.4rem 1rem', fontSize: '0.8rem',
          background: 'var(--surface-2)', color: 'var(--text)',
          border: '1px solid var(--border)', borderRadius: 4, textDecoration: 'none',
        }}>
          + Novo show
        </Link>
      </div>

      {semResultado.length > 0 && filtro !== 'sem_resultado' && (
        <button onClick={() => setFiltro('sem_resultado')} style={{
          width: '100%', marginBottom: '1rem', textAlign: 'left',
          padding: '0.6rem 0.75rem', background: '#1a1500',
          border: '1px solid var(--amber)', borderRadius: 4,
          fontSize: '0.8rem', color: 'var(--amber)', cursor: 'pointer',
        }}>
          ⚠ {semResultado.length} show{semResultado.length > 1 ? 's' : ''} sem resultado — ver →
        </button>
      )}

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
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..."
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
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 30, flexShrink: 0, textAlign: 'center' }}>Clima</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 140, flexShrink: 0 }}>Venue</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 90, flexShrink: 0, textAlign: 'right' }}>Status</span>
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

function ShowRow({ show }: { show: Show }) {
  const past      = isPast(show.data)
  const climaIcon = show.clima_estimado ? ICONE_CLIMA[show.clima_estimado] ?? '' : ''
  const opacity   = past && !show.participou ? 0.25 : past ? 0.55 : 1

  return (
    <Link href={`/shows/${show.id}`} style={{
      display: 'flex', alignItems: 'center', gap: '1rem',
      padding: '0.55rem 0.5rem', borderBottom: '1px solid var(--border)',
      textDecoration: 'none', opacity,
    }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 160, flexShrink: 0, fontFamily: 'monospace' }}>
        {formatData(show.data)}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {show.nome_evento ? (
          <>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {show.nome_evento}
            </p>
            {show.artistas.length > 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {show.artistas.join(' / ')}
              </p>
            )}
          </>
        ) : (
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {show.artistas.length > 0 ? show.artistas.join(' / ') : '(sem nome)'}
          </p>
        )}
      </div>

      <span style={{ fontSize: '0.85rem', width: 30, flexShrink: 0, textAlign: 'center' }}>{climaIcon}</span>

      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 140, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {show.venue?.nome ?? '—'}
      </span>

      <span style={{
        fontSize: '0.75rem', width: 90, flexShrink: 0, textAlign: 'right',
        color: show.resultado_geral ? corResultado(show.resultado_geral) : corIngresso(show.status_ingresso),
      }}>
        {show.resultado_geral
          ? LABEL_RESULTADO[show.resultado_geral] ?? show.resultado_geral
          : LABEL_STATUS[show.status_ingresso ?? ''] ?? show.status_ingresso ?? '—'}
      </span>
    </Link>
  )
}