import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

function formatDayShort(dateStr: string, hojeStr: string): string {
  if (dateStr === hojeStr) return 'hoje'
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return `${weekday}, ${d} ${month}`
}

function formatDataMono(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

function getNomeShow(
  show: any,
  artistById: Record<string, string>,
  saByShow: Record<string, { artist_id: string; ordem: number }[]>
): string {
  if (show.nome_evento) return show.nome_evento
  const sas = (saByShow[show.id] ?? []).sort((a, b) => a.ordem - b.ordem)
  const names = sas.map(sa => artistById[sa.artist_id]).filter(Boolean)
  return names.length > 0 ? names.join(' / ') : '(sem nome)'
}

function resultadoColor(r: string): string {
  if (r === 'sucesso_total' || r === 'sucesso') return 'var(--lime)'
  if (r === 'medio') return 'var(--amber)'
  if (r === 'fracasso') return 'var(--red)'
  return 'var(--text-dim)'
}

function resultadoLabel(r: string): string {
  if (r === 'sucesso_total') return 'sucesso total'
  if (r === 'sucesso') return 'sucesso'
  if (r === 'medio') return 'médio'
  if (r === 'fracasso') return 'fracasso'
  return r
}

export default async function HomePage() {
  const hoje = new Date()
  const hojeStr = hoje.toISOString().slice(0, 10)

  const em5 = new Date(hoje)
  em5.setDate(hoje.getDate() + 5)
  const em5Str = em5.toISOString().slice(0, 10)

  const em15 = new Date(hoje)
  em15.setDate(hoje.getDate() + 15)
  const em15Str = em15.toISOString().slice(0, 10)

  const supabase = await createClient()
  const db = supabase as any

  const [
    { count: countHoje },
    { count: countProx15 },
    { count: countPendentes },
    { count: countTotal },
    { data: proximosRows },
    { data: pendentesRows },
    { data: recentesRows },
    { data: saRows },
    { data: artistRows },
  ] = await Promise.all([
    db.from('shows').select('*', { count: 'exact', head: true }).eq('data', hojeStr),
    db.from('shows').select('*', { count: 'exact', head: true }).gte('data', hojeStr).lte('data', em15Str),
    db.from('shows').select('*', { count: 'exact', head: true }).lt('data', hojeStr).eq('participou', true).is('resultado_geral', null).eq('legado', false),
    db.from('shows').select('*', { count: 'exact', head: true }),
    db.from('shows').select('id, data, nome_evento, venues(id, nome)').gte('data', hojeStr).lte('data', em5Str).order('data', { ascending: true }),
    db.from('shows').select('id, data, nome_evento').lt('data', hojeStr).eq('participou', true).is('resultado_geral', null).eq('legado', false).order('data', { ascending: false }).limit(5),
    db.from('shows').select('id, data, nome_evento, resultado_geral').not('resultado_geral', 'is', null).order('data', { ascending: false }).limit(5),
    db.from('show_artists').select('show_id, artist_id, ordem'),
    db.from('artists').select('id, nome'),
  ])

  const artistById: Record<string, string> = {}
  for (const a of (artistRows ?? []) as { id: string; nome: string }[]) {
    artistById[a.id] = a.nome
  }

  const saByShow: Record<string, { artist_id: string; ordem: number }[]> = {}
  for (const sa of (saRows ?? []) as { show_id: string; artist_id: string; ordem: number }[]) {
    if (!saByShow[sa.show_id]) saByShow[sa.show_id] = []
    saByShow[sa.show_id].push(sa)
  }

  const diaSemana = hoje.toLocaleDateString('pt-BR', { weekday: 'long' })
  const diaNum = hoje.getDate()
  const mesNome = hoje.toLocaleDateString('pt-BR', { month: 'long' })
  const anoNum = hoje.getFullYear()
  const dataLabel = `${diaSemana}, ${diaNum} de ${mesNome} de ${anoNum}`

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text)', margin: 0 }}>
          ☰ painel
        </h1>
        <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
          ☾ {dataLabel}
        </span>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '2rem' }}>
        <div className="stat-card">
          <p className="stat-value">{countHoje ?? 0}</p>
          <p className="stat-label">△ hoje</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">{countProx15 ?? 0}</p>
          <p className="stat-label">☷ próx. 15d</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">{countPendentes ?? 0}</p>
          <p className="stat-label">◇ pendentes</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">{countTotal ?? 0}</p>
          <p className="stat-label">⟁ acervo</p>
        </div>
      </div>

      {/* Próximos 5 dias */}
      <section style={{ marginBottom: '2rem' }}>
        <p className="section-label">△ próximos 5 dias</p>
        {!proximosRows || proximosRows.length === 0 ? (
          <p style={{ fontStyle: 'italic', color: 'var(--text-dim)', fontSize: '13px', margin: 0 }}>
            nenhum show nos próximos 5 dias
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {proximosRows.map((show: any) => {
              const isHoje = show.data === hojeStr
              const venue = Array.isArray(show.venues) ? show.venues[0] : show.venues
              const nome = getNomeShow(show, artistById, saByShow)
              const dayLabel = formatDayShort(show.data, hojeStr)
              return (
                <Link key={show.id} href={`/shows/${show.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    border: `1px solid ${isHoje ? 'rgba(110,200,216,0.2)' : 'var(--border)'}`,
                    borderRadius: '6px',
                    padding: '12px 14px',
                    background: isHoje ? 'rgba(110,200,216,0.04)' : 'var(--surface)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <span style={{ fontSize: '13px', width: '16px', textAlign: 'center', flexShrink: 0, color: isHoje ? 'var(--cyan)' : 'var(--text-dim)' }}>△</span>
                    <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)', flexShrink: 0, minWidth: '90px' }}>{dayLabel}</span>
                    <span style={{ flex: 1, fontSize: '13px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</span>
                    {venue?.nome && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {venue.nome}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Pendente registrar resultado */}
      <section style={{ marginBottom: '2rem' }}>
        <p className="section-label">◇ pendente registrar resultado</p>
        {!pendentesRows || pendentesRows.length === 0 ? (
          <p style={{ fontStyle: 'italic', color: 'var(--text-dim)', fontSize: '13px', margin: 0 }}>
            tudo registrado ⊙
          </p>
        ) : (
          <div>
            {pendentesRows.map((show: any) => {
              const nome = getNomeShow(show, artistById, saByShow)
              return (
                <div key={show.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13px', width: '16px', textAlign: 'center', flexShrink: 0, color: 'var(--text-dim)' }}>◇</span>
                  <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)', flexShrink: 0 }}>{formatDataMono(show.data)}</span>
                  <span style={{ flex: 1, fontSize: '13px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</span>
                  <Link href={`/shows/${show.id}/editar`} style={{ fontSize: '11px', color: 'var(--cyan)', textDecoration: 'none', flexShrink: 0 }}>
                    registrar →
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Resultados recentes */}
      <section>
        <p className="section-label">⊙ resultados recentes</p>
        {!recentesRows || recentesRows.length === 0 ? (
          <p style={{ fontStyle: 'italic', color: 'var(--text-dim)', fontSize: '13px', margin: 0 }}>
            nenhum resultado registrado
          </p>
        ) : (
          <div>
            {recentesRows.map((show: any) => {
              const nome = getNomeShow(show, artistById, saByShow)
              const cor = resultadoColor(show.resultado_geral)
              const label = resultadoLabel(show.resultado_geral)
              return (
                <div key={show.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13px', width: '16px', textAlign: 'center', flexShrink: 0, color: cor }}>⊙</span>
                  <span style={{ flex: 1, fontSize: '13px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</span>
                  <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)', flexShrink: 0 }}>{formatDataMono(show.data)}</span>
                  <span style={{ fontSize: '11px', color: cor, flexShrink: 0 }}>{label}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
