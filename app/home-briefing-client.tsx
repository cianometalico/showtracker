'use client'

import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────

export type ProximoShowCard = {
  id: string
  data: string
  nomeShow: string
  participou: boolean | null
  venue: {
    id: string
    nome: string
    capacidade_praticavel: number | null
    risco_fiscalizacao: string | null
    bairro: string | null
  } | null
  nichos: { nome: string; underground_score: number | null }[]
  designs: { id: string; nome: string; saldo_atual: number }[]
  clima: { icon: string; temp: number } | null
}

export type PendenciaShow   = { id: string; data: string; nomeShow: string }
export type PendenciaDesign = { id: string; nome: string; artistaNome: string | null }

type Props = {
  dataLabel: string
  countHoje: number
  countEsteMes: number
  countTotal: number
  proximosShows: ProximoShowCard[]
  semResultado: PendenciaShow[]
  semResultadoTotal: number
  semEstoque: PendenciaDesign[]
  presencaIndefini: PendenciaShow[]
  melhorResultado:    { venue: string; resultado: string; data: string } | null
  nichoMaisFrequente: { nome: string; count: number } | null
  venueMaisVisitado:  { nome: string; total: number; participados: number } | null
}

// ── Helpers ───────────────────────────────────────────────────

function riscoColor(r: string): string {
  return r === 'high' ? 'var(--status-neg)' : r === 'medium' ? 'var(--status-neut)' : 'var(--status-pos)'
}

function formatDataCurta(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  // e.g. "seg., 14 de abr." → clean up to "seg, 14 abr"
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  const day     = d.getDate()
  const month   = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return `${weekday}, ${day} ${month}`
}

function formatDataPendencia(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  const day   = d.getDate()
  const month = d.toLocaleDateString('pt-BR', { month: 'short' })
  return `${day} ${month}`
}

const LABEL_RESULTADO: Record<string, string> = {
  sucesso_total: 'sucesso total',
  sucesso:       'sucesso',
  medio:         'médio',
  fracasso:      'fracasso',
}

// ── Main Component ────────────────────────────────────────────

export function HomeBriefingClient({
  dataLabel, countHoje, countEsteMes, countTotal,
  proximosShows,
  semResultado, semResultadoTotal, semEstoque, presencaIndefini,
  melhorResultado, nichoMaisFrequente, venueMaisVisitado,
}: Props) {
  const hasPendencias  = semResultado.length > 0 || semEstoque.length > 0 || presencaIndefini.length > 0
  const hasInteligencia = !!(melhorResultado || nichoMaisFrequente || venueMaisVisitado)

  return (
    <div>

      {/* 1. HEADER */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          color: 'var(--text-dim)', margin: '0 0 4px',
        }}>
          {dataLabel}
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0 }}>
          {countHoje === 0
            ? 'nenhum show hoje'
            : `${countHoje} show${countHoje !== 1 ? 's' : ''} hoje`}
          {' | '}
          {countEsteMes} este mês
          {' | '}
          {countTotal} no acervo
        </p>
      </div>

      {/* 2. PRÓXIMOS SHOWS */}
      {proximosShows.length > 0 && (
        <section style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-md)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Próximos shows
            </span>
            <Link href="/shows" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
              ver todos →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {proximosShows.map(s => <ShowCard key={s.id} show={s} />)}
          </div>
        </section>
      )}

      {/* 3. PENDÊNCIAS OPERACIONAIS */}
      {hasPendencias && (
        <section style={{ marginBottom: 'var(--space-xl)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '0 0 var(--space-md)' }}>
            Pendências
          </p>

          {/* a: shows sem resultado */}
          {semResultado.length > 0 && (
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '0 0 var(--space-sm)' }}>
                shows sem resultado ({semResultadoTotal})
              </p>
              <div>
                {semResultado.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-sm)', padding: '4px 0' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0, minWidth: 48 }}>
                      {formatDataPendencia(s.data)}
                    </span>
                    <span style={{ flex: 1, fontFamily: 'var(--font-serif)', fontSize: '0.85rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.nomeShow}
                    </span>
                    <Link href={`/shows/${s.id}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--accent-structure)', textDecoration: 'none', flexShrink: 0 }}>
                      registrar →
                    </Link>
                  </div>
                ))}
                {semResultadoTotal > 5 && (
                  <div style={{ paddingTop: 4 }}>
                    <Link href="/shows?filtro=participados" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
                      e mais {semResultadoTotal - 5} →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* b: designs sem estoque */}
          {semEstoque.length > 0 && (
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '0 0 var(--space-sm)' }}>
                designs sem estoque ({semEstoque.length})
              </p>
              <div>
                {semEstoque.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-sm)', padding: '4px 0' }}>
                    <span style={{ flex: 1, fontFamily: 'var(--font-serif)', fontSize: '0.85rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.nome}{d.artistaNome ? ` · ${d.artistaNome}` : ''}
                    </span>
                    <Link href={`/estoque/${d.id}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--accent-structure)', textDecoration: 'none', flexShrink: 0 }}>
                      ver →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* c: presença indefinida */}
          {presencaIndefini.length > 0 && (
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '0 0 var(--space-sm)' }}>
                presença indefinida ({presencaIndefini.length})
              </p>
              <div>
                {presencaIndefini.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-sm)', padding: '4px 0' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0, minWidth: 48 }}>
                      {formatDataPendencia(s.data)}
                    </span>
                    <span style={{ flex: 1, fontFamily: 'var(--font-serif)', fontSize: '0.85rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.nomeShow}
                    </span>
                    <Link href={`/shows/${s.id}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--accent-structure)', textDecoration: 'none', flexShrink: 0 }}>
                      decidir →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 4. INTELIGÊNCIA RÁPIDA */}
      {hasInteligencia && (
        <section style={{ marginBottom: 'var(--space-xl)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '0 0 var(--space-md)' }}>
            Inteligência
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {melhorResultado && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.6 }}>
                melhor resultado (90 dias):{' '}
                <span style={{ color: 'var(--text-primary)' }}>
                  {LABEL_RESULTADO[melhorResultado.resultado] ?? melhorResultado.resultado}
                </span>
                {' — '}
                <span style={{ fontFamily: 'var(--font-serif)' }}>{melhorResultado.venue}</span>
                {', '}
                {formatDataPendencia(melhorResultado.data)}
              </p>
            )}
            {nichoMaisFrequente && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.6 }}>
                nicho mais frequente (30 dias):{' '}
                <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)' }}>
                  {nichoMaisFrequente.nome}
                </span>
                {' '}({nichoMaisFrequente.count} {nichoMaisFrequente.count === 1 ? 'show' : 'shows'})
              </p>
            )}
            {venueMaisVisitado && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.6 }}>
                venue mais visitado:{' '}
                <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)' }}>
                  {venueMaisVisitado.nome}
                </span>
                {' '}({venueMaisVisitado.total} shows, {venueMaisVisitado.participados} participados)
              </p>
            )}
          </div>
        </section>
      )}

      {/* 5. AÇÕES RÁPIDAS */}
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          {([
            { href: '/shows/new',      label: '+ novo show'    },
            { href: '/?abrir=artista', label: '+ novo artista' },
            { href: '/estoque/new',    label: '+ novo design'  },
          ] as const).map(({ href, label }) => (
            <Link key={href} href={href} className="btn-primary" style={{ textDecoration: 'none' }}>
              {label}
            </Link>
          ))}
        </div>
      </section>

    </div>
  )
}

// ── ShowCard ──────────────────────────────────────────────────

function ShowCard({ show }: { show: ProximoShowCard }) {
  return (
    <div style={{
      background: 'var(--surface-raised)',
      padding: 'var(--space-md)',
      borderRadius: 2,
    }}>
      {/* Linha 1: nome + data + badge */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-sm)', marginBottom: 4 }}>
        <Link href={`/shows/${show.id}`} style={{
          fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 400,
          color: 'var(--text-primary)', textDecoration: 'none',
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {show.nomeShow}
        </Link>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {formatDataCurta(show.data)}
          </span>
          {show.participou === false && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              não confirmado
            </span>
          )}
        </div>
      </div>

      {/* Linha 2: venue + clima */}
      {show.venue && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-sm)', marginBottom: 2 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0 }}>
            {show.venue.nome}
            {show.venue.capacidade_praticavel != null && (
              <> | cap. {show.venue.capacidade_praticavel.toLocaleString('pt-BR')}</>
            )}
            {show.venue.risco_fiscalizacao && (
              <> | <span style={{ color: riscoColor(show.venue.risco_fiscalizacao) }}>
                {show.venue.risco_fiscalizacao}
              </span></>
            )}
          </p>
          {show.clima && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', flexShrink: 0 }}>
              {show.clima.temp}° {show.clima.icon}
            </span>
          )}
        </div>
      )}

      {/* Linha 3: PÚBLICO */}
      {show.nichos.length > 0 && (
        <p style={{ margin: '2px 0', lineHeight: 1.5 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginRight: 5 }}>
            Público
          </span>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
            {show.nichos.map(n => n.nome).join(' · ')}
          </span>
        </p>
      )}

      {/* Linha 4: ESTOQUE */}
      <p style={{ margin: '2px 0', lineHeight: 1.5 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginRight: 5 }}>
          Estoque
        </span>
        {show.designs.length === 0 ? (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            sem design vinculado
          </span>
        ) : (
          <span>
            {show.designs.map((d, i) => (
              <span key={d.id}>
                {i > 0 && <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>·</span>}
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                  {d.nome}
                </span>
                {' '}
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
                  color: d.saldo_atual <= 0 ? 'var(--status-neg)' : 'var(--text-dim)',
                }}>
                  ({d.saldo_atual}{d.saldo_atual <= 0 ? ' ⚠' : ''})
                </span>
              </span>
            ))}
          </span>
        )}
      </p>
    </div>
  )
}
