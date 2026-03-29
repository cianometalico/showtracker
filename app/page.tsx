import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { HomeCalendar, type CalShow } from './home-calendar'

// ── Utilities ─────────────────────────────────────────────────

function formatDataMono(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

function getNomeShow(
  show: { id: string; nome_evento: string | null },
  artistById: Record<string, string>,
  saByShow: Record<string, { artist_id: string; ordem: number }[]>
): string {
  if (show.nome_evento) return show.nome_evento
  const sas   = (saByShow[show.id] ?? []).sort((a, b) => a.ordem - b.ordem)
  const names = sas.map(sa => artistById[sa.artist_id]).filter(Boolean)
  return names.length > 0 ? names.join(' + ') : '—'
}

// ── Main Component ─────────────────────────────────────────────

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const hoje    = new Date()
  const hojeStr = hoje.toISOString().slice(0, 10)

  // ── Resolve displayed month ───────────────────────────────────

  const params   = await searchParams
  const rawMes   = typeof params?.mes === 'string' ? params.mes : null
  const mesValido = rawMes?.match(/^\d{4}-\d{2}$/) ? rawMes : null
  const [mesAno, mesMes] = mesValido
    ? mesValido.split('-').map(Number)
    : [hoje.getFullYear(), hoje.getMonth() + 1]

  const mesStr    = `${mesAno}-${String(mesMes).padStart(2, '0')}`
  const primeiroDia = `${mesStr}-01`
  const ultimoDia   = `${mesAno}-${String(mesMes).padStart(2, '0')}-${new Date(mesAno, mesMes, 0).getDate()}`

  const supabase = await createClient()
  const db = supabase as any

  // ── Parallel fetches ─────────────────────────────────────────

  const [
    { count: countHoje },
    { count: countEsteMes },
    { count: countTotal },
    { data: calendarRows },
    { data: semResultadoRows },
    { data: semParticipouRows },
    { data: artistRows },
    { data: semEstoqueRows },
  ] = await Promise.all([
    // Stats
    db.from('shows').select('*', { count: 'exact', head: true }).eq('data', hojeStr),
    db.from('shows').select('*', { count: 'exact', head: true }).gte('data', primeiroDia).lte('data', ultimoDia),
    db.from('shows').select('*', { count: 'exact', head: true }),
    // Calendar: full month
    db.from('shows')
      .select('id, data, nome_evento, resultado_geral, status_ingresso, venues(id, nome, bairro)')
      .gte('data', primeiroDia).lte('data', ultimoDia)
      .order('data', { ascending: true }),
    // Alerts: shows sem resultado (always current real date, not displayed month)
    db.from('shows')
      .select('id, data, nome_evento')
      .lt('data', hojeStr).eq('participou', true).is('resultado_geral', null).eq('legado', false)
      .order('data', { ascending: false }).limit(10),
    // Alerts: shows futuros sem participou
    db.from('shows')
      .select('id, data, nome_evento')
      .gte('data', hojeStr).is('participou', null).eq('legado', false)
      .order('data', { ascending: true }).limit(5),
    // Artists lookup
    db.from('artists').select('id, nome'),
    // Designs sem estoque
    db.from('design_stock')
      .select('design_id, nome, artist_id, saldo_atual')
      .eq('ativo', true)
      .lte('saldo_atual', 0),
  ])

  // ── Show artists lookup ───────────────────────────────────────

  const allShowIds = [...new Set([
    ...(calendarRows     ?? []).map((s: any) => s.id),
    ...(semResultadoRows ?? []).map((s: any) => s.id),
    ...(semParticipouRows ?? []).map((s: any) => s.id),
  ])]

  let saRows: any[] = []
  if (allShowIds.length > 0) {
    const { data } = await db.from('show_artists').select('show_id, artist_id, ordem').in('show_id', allShowIds)
    saRows = data ?? []
  }

  const artistById: Record<string, string> = {}
  for (const a of (artistRows ?? []) as { id: string; nome: string }[]) {
    artistById[a.id] = a.nome
  }

  const saByShow: Record<string, { artist_id: string; ordem: number }[]> = {}
  for (const sa of saRows as { show_id: string; artist_id: string; ordem: number }[]) {
    if (!saByShow[sa.show_id]) saByShow[sa.show_id] = []
    saByShow[sa.show_id].push(sa)
  }

  // ── Build showsByDate for calendar ────────────────────────────

  const showsByDate: Record<string, CalShow[]> = {}
  for (const s of (calendarRows ?? []) as any[]) {
    const venue = Array.isArray(s.venues) ? s.venues[0] : s.venues
    const show: CalShow = {
      id:             s.id,
      nome:           getNomeShow(s, artistById, saByShow),
      venueNome:      venue?.nome ?? null,
      venueBairro:    venue?.bairro ?? null,
      statusIngresso: s.status_ingresso,
      resultadoGeral: s.resultado_geral,
    }
    if (!showsByDate[s.data]) showsByDate[s.data] = []
    showsByDate[s.data].push(show)
  }

  // ── Pendências ────────────────────────────────────────────────

  const hasPendencias =
    (semResultadoRows?.length ?? 0) > 0 ||
    (semParticipouRows?.length ?? 0) > 0 ||
    (semEstoqueRows?.length ?? 0) > 0

  // ── Header date ───────────────────────────────────────────────

  const dataLabel = hoje.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="page-container">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text)', margin: 0,
        }}>
          ☰ painel
        </h1>
        <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
          ☾ {dataLabel}
        </span>
      </div>

      {/* Stats — 3 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '1.75rem' }}>
        {[
          { value: countHoje ?? 0,     label: '△ hoje' },
          { value: countEsteMes ?? 0,  label: '☷ este mês' },
          { value: countTotal ?? 0,    label: '⟁ acervo' },
        ].map(({ value, label }) => (
          <div key={label} className="stat-card">
            <p className="stat-value">{value}</p>
            <p className="stat-label">{label}</p>
          </div>
        ))}
      </div>

      {/* Calendário mensal */}
      <section style={{ marginBottom: '2rem' }}>
        <HomeCalendar showsByDate={showsByDate} hojeStr={hojeStr} mes={mesStr} />
      </section>

      {/* Pendências */}
      {hasPendencias && <section style={{ marginBottom: '2rem' }}>
        <p className="section-label">◇ pendências</p>

        {/* Shows sem resultado */}
        <div style={{ marginBottom: '1rem' }}>
          <p style={{
            fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '0.06em', margin: '0 0 6px',
          }}>
            shows sem resultado ({semResultadoRows?.length ?? 0})
          </p>
          {!semResultadoRows || semResultadoRows.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', fontStyle: 'italic', margin: 0 }}>nenhum ⊙</p>
          ) : (
            <div>
              {(semResultadoRows as any[]).map(show => (
                <div key={show.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', flexShrink: 0, minWidth: 36 }}>
                    {formatDataMono(show.data)}
                  </span>
                  <span style={{ flex: 1, fontSize: '13px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getNomeShow(show, artistById, saByShow)}
                  </span>
                  <Link href={`/shows/${show.id}`} style={{ fontSize: '11px', color: 'var(--cyan)', textDecoration: 'none', flexShrink: 0 }}>
                    registrar →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Participação indefinida */}
        <div style={{ marginBottom: '1rem' }}>
          <p style={{
            fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '0.06em', margin: '0 0 6px',
          }}>
            participação indefinida ({semParticipouRows?.length ?? 0})
          </p>
          {!semParticipouRows || semParticipouRows.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', fontStyle: 'italic', margin: 0 }}>nenhum ⊙</p>
          ) : (
            <div>
              {(semParticipouRows as any[]).map(show => (
                <div key={show.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', flexShrink: 0, minWidth: 36 }}>
                    {formatDataMono(show.data)}
                  </span>
                  <span style={{ flex: 1, fontSize: '13px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getNomeShow(show, artistById, saByShow)}
                  </span>
                  <Link href={`/shows/${show.id}`} style={{ fontSize: '11px', color: 'var(--cyan)', textDecoration: 'none', flexShrink: 0 }}>
                    confirmar →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Designs sem estoque */}
        <div>
          <p style={{
            fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '0.06em', margin: '0 0 6px',
          }}>
            designs sem estoque ({semEstoqueRows?.length ?? 0})
          </p>
          {!semEstoqueRows || semEstoqueRows.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', fontStyle: 'italic', margin: 0 }}>nenhum ⊙</p>
          ) : (
            <div>
              {(semEstoqueRows as any[]).map(d => {
                const artistNome = d.artist_id ? (artistById[d.artist_id] ?? null) : null
                return (
                  <div key={d.design_id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 0', borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ flex: 1, fontSize: '13px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.nome}{artistNome ? ` · ${artistNome}` : ''}
                    </span>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--amber)', flexShrink: 0 }}>
                      {d.saldo_atual ?? 0}
                    </span>
                    <Link href={`/estoque/${d.design_id}`} style={{ fontSize: '11px', color: 'var(--cyan)', textDecoration: 'none', flexShrink: 0 }}>
                      ver →
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>}

      {/* Ações rápidas */}
      <section style={{ marginBottom: '1rem' }}>
        <p className="section-label">⊕ ações rápidas</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { href: '/shows/new',   label: '+ novo show'    },
            { href: '/?abrir=artista', label: '+ novo artista' },
            { href: '/estoque/new', label: '+ novo design'  },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{
              padding: '0.45rem 1.1rem', fontSize: '0.8rem',
              background: 'var(--surface)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 4,
              textDecoration: 'none',
            }}>
              {label}
            </Link>
          ))}
        </div>
      </section>

    </div>
  )
}
