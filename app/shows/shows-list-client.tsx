'use client'

import { useState, useMemo, useRef, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { getShowDisplayName, isShowPast } from '@/lib/show-utils'
import { removeAccents } from '@/lib/text-utils'
import { updateParticipou, updateResultadoOnly } from './[id]/actions'

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

// ── Filter types ──────────────────────────────────────────────

type FiltroTempo        = 'este-mes' | 'futuros' | 'passados' | null
type FiltroParticipacao = 'todos' | 'sim' | 'nao' | null

// Module-level date constants — evaluated once per page load
const _now      = new Date()
const ANO_ATUAL = _now.getFullYear()
const MES_ATUAL = _now.getMonth()

function isMesAtual(data: string): boolean {
  const d = new Date(data + 'T12:00:00')
  return d.getFullYear() === ANO_ATUAL && d.getMonth() === MES_ATUAL
}

function applyTempo(shows: Show[], t: FiltroTempo): Show[] {
  if (t === 'este-mes') return shows.filter(s => isMesAtual(s.data))
  if (t === 'futuros')  return shows.filter(s => !isShowPast(s.data))
  if (t === 'passados') return shows.filter(s => isShowPast(s.data))
  return shows
}

function applyParticipacao(shows: Show[], p: FiltroParticipacao): Show[] {
  if (p === 'sim') return shows.filter(s => s.participou === true)
  if (p === 'nao') return shows.filter(s => s.participou === false)
  return shows // 'todos' ou null
}

function sortShows(shows: Show[], tempo: FiltroTempo): Show[] {
  const asc = tempo === 'este-mes' || tempo === 'futuros'
  return [...shows].sort((a, b) =>
    asc ? a.data.localeCompare(b.data) : b.data.localeCompare(a.data)
  )
}

const PAGE_SIZE = 10

// ── Pill style helper ─────────────────────────────────────────

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding:       '0.25rem 0.7rem',
    fontSize:      '0.68rem',
    fontFamily:    'var(--font-mono)',
    letterSpacing: '0.06em',
    borderRadius:  99,
    cursor:        'pointer',
    background:    'none',
    border:        active ? '1px solid var(--accent-structure)' : '1px solid transparent',
    color:         active ? 'var(--text)' : 'var(--text-dim)',
  }
}

// ── Component ─────────────────────────────────────────────────

export function ShowsListClient({ shows, totalRows }: { shows: Show[]; totalRows: number }) {
  const [tempo,        setTempo]        = useState<FiltroTempo>('este-mes')
  const [participacao, setParticipacao] = useState<FiltroParticipacao>('todos')
  const [busca,        setBusca]        = useState('')
  const [pagina,       setPagina]       = useState(1)

  const todayMarkerRef = useRef<HTMLDivElement>(null)
  const listTopRef     = useRef<HTMLDivElement>(null)

  const isDefault = tempo === 'este-mes' && participacao === 'todos'

  // Contadores: cada eixo usa o filtro do outro eixo como base
  const baseParaTempo        = useMemo(() => applyParticipacao(shows, participacao), [shows, participacao])
  const baseParaParticipacao = useMemo(() => applyTempo(shows, tempo),              [shows, tempo])

  const countsTempo = useMemo(() => ({
    'este-mes': applyTempo(baseParaTempo, 'este-mes').length,
    'futuros':  applyTempo(baseParaTempo, 'futuros').length,
    'passados': applyTempo(baseParaTempo, 'passados').length,
  }), [baseParaTempo])

  const countsParticipacao = useMemo(() => ({
    'todos': baseParaParticipacao.length,
    'sim':   baseParaParticipacao.filter(s => s.participou === true).length,
    'nao':   baseParaParticipacao.filter(s => s.participou === false).length,
  }), [baseParaParticipacao])

  const filtered = useMemo(() => {
    let list = applyParticipacao(applyTempo(shows, tempo), participacao)
    list = sortShows(list, tempo)
    if (busca.trim()) {
      const q = removeAccents(busca.toLowerCase())
      list = list.filter(s =>
        removeAccents((s.nome_evento ?? '').toLowerCase()).includes(q) ||
        s.artistas.some(a => removeAccents(a.toLowerCase()).includes(q)) ||
        removeAccents((s.venue?.nome ?? '').toLowerCase()).includes(q)
      )
    }
    return list
  }, [shows, tempo, participacao, busca])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page       = Math.min(pagina, totalPages)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Marcador "hoje": só quando lista é cronológica com mistura passado/futuro
  const showTodayMarker = tempo === 'este-mes' || tempo === null
  const firstFutureIndexInPage = useMemo(() =>
    showTodayMarker ? paginated.findIndex(s => !isShowPast(s.data)) : -1,
    [paginated, showTodayMarker]
  )

  // Scroll para hoje ao montar ESTE MÊS ou ao limpar filtros
  useEffect(() => {
    if ((tempo === 'este-mes' || tempo === null) && todayMarkerRef.current) {
      todayMarkerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [tempo])

  function handleTempo(t: FiltroTempo) {
    setTempo(t)
    setPagina(1)
  }

  function handleParticipacao(p: FiltroParticipacao) {
    setParticipacao(p)
    setPagina(1)
  }

  function limparFiltros() {
    setTempo(null)
    setParticipacao(null)
    setPagina(1)
  }

  function handleBusca(val: string) {
    setBusca(val)
    setPagina(1)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--text)', margin: 0, flexShrink: 0 }}>Shows</h1>
        <input
          value={busca}
          onChange={e => handleBusca(e.target.value)}
          placeholder="buscar..."
          style={{
            flex: 1, fontSize: '0.8rem', background: 'none',
            border: 'none', borderBottom: '1px solid var(--border)',
            color: 'var(--text)', outline: 'none', padding: '0.2rem 0.25rem',
          }}
        />
        <Link href="/shows/new" style={{
          padding: '0.4rem 1rem', fontSize: '0.8rem', flexShrink: 0,
          background: 'var(--surface-raised)', color: 'var(--text)',
          border: '1px solid var(--border)', borderRadius: 4, textDecoration: 'none',
        }}>
          + novo show
        </Link>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <button onClick={() => handleTempo('este-mes')} style={pillStyle(tempo === 'este-mes')}>
          ESTE MÊS <span style={{ opacity: 0.6 }}>({countsTempo['este-mes']})</span>
        </button>
        <button onClick={() => handleTempo('futuros')} style={pillStyle(tempo === 'futuros')}>
          FUTUROS <span style={{ opacity: 0.6 }}>({countsTempo['futuros']})</span>
        </button>
        <button onClick={() => handleTempo('passados')} style={pillStyle(tempo === 'passados')}>
          PASSADOS <span style={{ opacity: 0.6 }}>({countsTempo['passados']})</span>
        </button>

        <span style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0, alignSelf: 'center' }} />

        <button onClick={() => handleParticipacao('todos')} style={pillStyle(participacao === 'todos')}>
          TODOS <span style={{ opacity: 0.6 }}>({countsParticipacao['todos']})</span>
        </button>
        <button onClick={() => handleParticipacao('sim')} style={pillStyle(participacao === 'sim')}>
          SIM <span style={{ opacity: 0.6 }}>({countsParticipacao['sim']})</span>
        </button>
        <button onClick={() => handleParticipacao('nao')} style={pillStyle(participacao === 'nao')}>
          NÃO <span style={{ opacity: 0.6 }}>({countsParticipacao['nao']})</span>
        </button>

        {!isDefault && (
          <button onClick={limparFiltros} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)',
            flexShrink: 0,
          }}>
            limpar
          </button>
        )}
      </div>

      {/* Contador */}
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
        {filtered.length <= PAGE_SIZE
          ? `${filtered.length} show${filtered.length !== 1 ? 's' : ''}`
          : `${Math.min(page * PAGE_SIZE, filtered.length)} de ${filtered.length}`}
      </p>

      {/* Lista */}
      {filtered.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', padding: '2rem 0.5rem' }}>Nenhum show encontrado.</p>
      ) : (
        <div ref={listTopRef}>
          {paginated.map((show, idx) => (
            <div key={show.id}>
              {showTodayMarker && firstFutureIndexInPage >= 0 && idx === firstFutureIndexInPage && (
                <div ref={todayMarkerRef} style={{
                  fontSize:      '0.65rem',
                  fontFamily:    'var(--font-mono)',
                  color:         'var(--accent-structure)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding:       '4px 0',
                  borderTop:     '1px solid var(--accent-structure)',
                  marginBottom:  4,
                }}>
                  hoje
                </div>
              )}
              <ShowRow show={show} />
            </div>
          ))}

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', marginTop: '1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              <button
                onClick={() => { setPagina(p => Math.max(1, p - 1)); listTopRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
                disabled={page <= 1}
                style={{ background: 'none', border: 'none', cursor: page <= 1 ? 'default' : 'pointer', color: page <= 1 ? 'var(--text-muted)' : 'var(--text-primary)', padding: 0 }}
              >
                ← anterior
              </button>
              <span style={{ color: 'var(--text-dim)' }}>página {page} de {totalPages}</span>
              <button
                onClick={() => { setPagina(p => Math.min(totalPages, p + 1)); listTopRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
                disabled={page >= totalPages}
                style={{ background: 'none', border: 'none', cursor: page >= totalPages ? 'default' : 'pointer', color: page >= totalPages ? 'var(--text-muted)' : 'var(--text-primary)', padding: 0 }}
              >
                próxima →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── ShowRow ───────────────────────────────────────────────────

function ShowRow({ show }: { show: Show }) {
  const [localParticipou, setLocalParticipou] = useState(show.participou)
  const [localResultado,  setLocalResultado]  = useState(show.resultado_geral)
  const [, startTransition] = useTransition()

  const past    = isShowPast(show.data)
  const opacity = !past ? 1 : localParticipou === true ? 0.55 : 0.45
  const nome    = getShowDisplayName(show.nome_evento, show.artistas)
  const venue   = show.venue?.nome ?? null

  function toggleParticipou(e: React.MouseEvent) {
    e.stopPropagation()
    const prev = localParticipou
    const next = !localParticipou
    setLocalParticipou(next)
    startTransition(async () => {
      try {
        await updateParticipou(show.id, next)
      } catch {
        setLocalParticipou(prev)
      }
    })
  }

  function handleResultado(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation()
    const prev = localResultado
    const next = e.target.value || null
    setLocalResultado(next)
    startTransition(async () => {
      try {
        await updateResultadoOnly(show.id, next)
      } catch {
        setLocalResultado(prev)
      }
    })
  }

  const dotFilled = localParticipou === true

  return (
    <div style={{ padding: '0.6rem 0', borderBottom: '1px solid var(--border)', opacity }}>
      {/* Linha 1: nome + ações */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <Link href={`/shows/${show.id}`} style={{
          flex: 1, minWidth: 0, textDecoration: 'none',
        }}>
          <p style={{
            fontFamily: 'var(--font-serif)', fontSize: '0.95rem', color: 'var(--text)',
            margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {nome}
          </p>
        </Link>

        {/* Dot toggle participação */}
        <button
          onClick={toggleParticipou}
          title={localParticipou ? 'participei' : 'não participei'}
          style={{
            padding: '0.6rem 0.5rem',
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" style={{ display: 'block' }}>
            {dotFilled
              ? <circle cx="4" cy="4" r="4" fill="var(--accent-structure)" />
              : <circle cx="4" cy="4" r="3.5" fill="none" stroke="var(--text-muted)" strokeWidth="1" />
            }
          </svg>
        </button>

        {/* Select resultado — só para shows passados */}
        {past && (
          <select
            value={localResultado ?? ''}
            onChange={handleResultado}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: localResultado ? corResultado(localResultado) : 'var(--text-muted)',
              outline: 'none',
              padding: '0.6rem 0.1rem',
              flexShrink: 0,
            }}
          >
            <option value="">—</option>
            <option value="sucesso_total">sucesso total</option>
            <option value="sucesso">sucesso</option>
            <option value="medio">médio</option>
            <option value="fracasso">fracasso</option>
          </select>
        )}
      </div>

      {/* Linha 2: metadados */}
      <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', flexWrap: 'wrap', marginTop: 2 }}>
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
        {show.tour && (
          <>
            <span style={{ margin: '0 5px', opacity: 0.4 }}>|</span>
            <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>{show.tour}</span>
          </>
        )}
      </div>
    </div>
  )
}
