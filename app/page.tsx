'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Show = {
  id: string
  data: string
  participou: boolean
  resultado_geral: string
  status_ingresso: string
  fiscalizacao: boolean
  risco_cancelamento: boolean
  artists: { nome: string } | null
  venues: { nome: string } | null
  designs: { status: string }[]
  pieces: { quantidade: number }[]
}

type Stats = {
  total_shows: number
  total_artistas: number
  total_locais: number
  shows_sem_estampa: number
  shows_sem_pecas: number
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'HOJE'
  if (diff === 1) return 'AMANHÃ'
  if (diff === -1) return 'ONTEM'
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).toUpperCase()
}

function getShowColor(show: Show): string {
  if (!show.participou) return '#808080'
  if (show.resultado_geral === 'Excelente') return '#006400'
  if (show.resultado_geral === 'Bom') return '#2d6e3e'
  if (show.resultado_geral === 'Razoável') return '#806800'
  if (show.resultado_geral === 'Ruim') return '#CC2200'
  if (show.fiscalizacao) return '#CC2200'
  if (show.risco_cancelamento) return '#806800'
  return '#2B5BE0'
}

function getStatusTag(show: Show) {
  const semEstampa = !show.designs || show.designs.length === 0
  const semPecas = !show.pieces || show.pieces.length === 0
  const temDesignPronto = show.designs?.some(d => d.status === 'Pronto')

  if (semEstampa) return { label: 'Sem estampa', color: '#CC2200' }
  if (!temDesignPronto) return { label: 'Em produção', color: '#806800' }
  if (semPecas) return { label: 'Sem peças', color: '#806800' }
  return { label: 'Pronto', color: '#006400' }
}

export default function Home() {
  const router = useRouter()
  const [proximos, setProximos] = useState<Show[]>([])
  const [recentes, setRecentes] = useState<Show[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [hoje] = useState(new Date())

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const hojeStr = hoje.toISOString().split('T')[0]
    const em15dias = new Date(hoje)
    em15dias.setDate(hoje.getDate() + 15)
    const em15Str = em15dias.toISOString().split('T')[0]

    // Próximos 15 dias
    const { data: prox } = await supabase
      .from('shows')
      .select('*, artists(nome), venues(nome), designs(status), pieces(quantidade)')
      .gte('data', hojeStr)
      .lte('data', em15Str)
      .order('data', { ascending: true })

    if (prox) setProximos(prox as Show[])

    // Últimos 5 shows passados
    const { data: rec } = await supabase
      .from('shows')
      .select('*, artists(nome), venues(nome), designs(status), pieces(quantidade)')
      .lt('data', hojeStr)
      .order('data', { ascending: false })
      .limit(5)

    if (rec) setRecentes(rec as Show[])

    // Stats
    const [{ count: cs }, { count: ca }, { count: cv }] = await Promise.all([
      supabase.from('shows').select('*', { count: 'exact', head: true }),
      supabase.from('artists').select('*', { count: 'exact', head: true }),
      supabase.from('venues').select('*', { count: 'exact', head: true }),
    ])

    setStats({
      total_shows: cs ?? 0,
      total_artistas: ca ?? 0,
      total_locais: cv ?? 0,
      shows_sem_estampa: prox?.filter(s => !s.designs?.length).length ?? 0,
      shows_sem_pecas: prox?.filter(s => !s.pieces?.length && s.participou).length ?? 0,
    })
  }

  const diasComShows = proximos.reduce((acc, show) => {
    const d = show.data
    if (!acc[d]) acc[d] = []
    acc[d].push(show)
    return acc
  }, {} as Record<string, Show[]>)

  // Gera array dos próximos 15 dias
  const dias15: string[] = []
  for (let i = 0; i <= 15; i++) {
    const d = new Date(hoje)
    d.setDate(hoje.getDate() + i)
    dias15.push(d.toISOString().split('T')[0])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
        {[
          { label: 'Shows', value: stats?.total_shows ?? '…', color: '#2B5BE0' },
          { label: 'Artistas', value: stats?.total_artistas ?? '…', color: '#2B5BE0' },
          { label: 'Locais', value: stats?.total_locais ?? '…', color: '#2B5BE0' },
          { label: 'Sem estampa', value: stats?.shows_sem_estampa ?? '…', color: stats?.shows_sem_estampa ? '#CC2200' : '#006400' },
          { label: 'Sem peças', value: stats?.shows_sem_pecas ?? '…', color: stats?.shows_sem_pecas ? '#806800' : '#006400' },
        ].map(s => (
          <div key={s.label} className="win-window">
            <div style={{ padding: '8px', background: '#c0c0c0', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '10px', color: '#808080', marginTop: '2px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '12px', alignItems: 'flex-start' }}>

        {/* CALENDÁRIO 15 DIAS */}
        <div className="win-window">
          <div className="win-titlebar">
            <span>📅 Próximos 15 dias</span>
            <span style={{ fontSize: '10px', fontWeight: 'normal' }}>
              {hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div style={{ padding: '4px', background: '#c0c0c0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '3px' }}>
              {dias15.map(dia => {
                const shows = diasComShows[dia] ?? []
                const isHoje = dia === hoje.toISOString().split('T')[0]
                return (
                  <div
                    key={dia}
                    className="sunken"
                    style={{
                      background: isHoje ? '#ffffc0' : '#fff',
                      padding: '4px',
                      minHeight: '64px',
                      cursor: shows.length ? 'pointer' : 'default',
                    }}
                  >
                    <div style={{
                      fontSize: '9px',
                      fontWeight: isHoje ? 'bold' : 'normal',
                      color: isHoje ? '#CC2200' : '#808080',
                      marginBottom: '3px',
                      textAlign: 'center',
                    }}>
                      {getDayLabel(dia)}
                    </div>
                    {shows.map(show => (
                      <div
                        key={show.id}
                        onClick={() => router.push(`/shows/${show.id}`)}
                        style={{
                          background: getShowColor(show),
                          color: '#fff',
                          fontSize: '9px',
                          padding: '1px 3px',
                          marginBottom: '2px',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={show.artists?.nome}
                      >
                        {show.artists?.nome}
                      </div>
                    ))}
                    {!shows.length && (
                      <div style={{ fontSize: '9px', color: '#dfdfdf', textAlign: 'center', marginTop: '8px' }}>·</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* SIDEBAR — RECENTES + ALERTAS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

          {/* ALERTAS */}
          {(stats?.shows_sem_estampa || stats?.shows_sem_pecas) ? (
            <div className="win-window">
              <div className="win-titlebar" style={{ background: 'linear-gradient(to right, #881100, #CC2200)' }}>
                <span>⚠ Alertas</span>
              </div>
              <div style={{ padding: '6px', background: '#c0c0c0', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {proximos.filter(s => !s.designs?.length && s.participou).map(s => (
                  <div
                    key={s.id}
                    onClick={() => router.push(`/shows/${s.id}`)}
                    style={{ fontSize: '11px', color: '#CC2200', cursor: 'pointer', padding: '1px 0' }}
                  >
                    ✗ {s.artists?.nome} — sem estampa
                  </div>
                ))}
                {proximos.filter(s => !s.pieces?.length && s.participou && s.designs?.length > 0).map(s => (
                  <div
                    key={s.id}
                    onClick={() => router.push(`/shows/${s.id}`)}
                    style={{ fontSize: '11px', color: '#806800', cursor: 'pointer', padding: '1px 0' }}
                  >
                    ⚠ {s.artists?.nome} — sem peças
                  </div>
                ))}
              </div>
            </div>
          ) : proximos.length > 0 ? (
            <div className="win-window">
              <div className="win-titlebar" style={{ background: 'linear-gradient(to right, #2d6e3e, #8DB596)' }}>
                <span>✓ Tudo em ordem</span>
              </div>
              <div style={{ padding: '6px', background: '#c0c0c0', fontSize: '11px', color: '#006400' }}>
                Todos os shows próximos estão com estampa e peças.
              </div>
            </div>
          ) : null}

          {/* ÚLTIMOS RESULTADOS */}
          <div className="win-window">
            <div className="win-titlebar"><span>📊 Últimos resultados</span></div>
            <div style={{ padding: '4px', background: '#c0c0c0' }}>
              <table className="win-table">
                <tbody>
                  {recentes.map(s => (
                    <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/shows/${s.id}`)}>
                      <td style={{ fontSize: '10px', color: '#808080' }}>
                        {new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </td>
                      <td><strong style={{ fontSize: '11px' }}>{s.artists?.nome}</strong></td>
                      <td style={{
                        fontSize: '11px', fontWeight: 'bold',
                        color: s.resultado_geral === 'Excelente' ? '#006400' :
                               s.resultado_geral === 'Bom' ? '#2d6e3e' :
                               s.resultado_geral === 'Razoável' ? '#806800' :
                               s.resultado_geral === 'Ruim' ? '#CC2200' : '#808080'
                      }}>
                        {s.resultado_geral || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* STATUS DO SISTEMA */}
          <div className="win-window">
            <div className="win-titlebar"><span>⚙ Sistema</span></div>
            <div style={{ padding: '6px', background: '#c0c0c0', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {[
                { label: 'Supabase', status: '● Online', color: '#006400' },
                { label: 'Inferência', status: '● Ativa', color: '#006400' },
                { label: 'MusicBrainz', status: '○ Pendente', color: '#808080' },
                { label: 'Setlist.fm', status: '○ Pendente', color: '#808080' },
                { label: 'ML Engine', status: '○ Fase 3', color: '#808080' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: '#000' }}>{s.label}</span>
                  <span style={{ color: s.color, fontWeight: 'bold' }}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}