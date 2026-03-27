import { WeatherWidget } from './weather-widget'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

function isPast(iso: string) {
  return new Date(iso + 'T23:59:59') < new Date()
}

function formatData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

const LABEL_STATUS: Record<string, string> = {
  'sold out': 'Sold Out',
  'bem vendido': 'Bem Vendido',
  'mal vendido': 'Mal Vendido',
}

const LABEL_RESULTADO: Record<string, string> = {
  sucesso_total: 'Sucesso Total',
  sucesso: 'Sucesso',
  medio: 'Médio',
  fracasso: 'Fracasso',
}

const COR_RESULTADO: Record<string, string> = {
  sucesso_total: '#4ade80',
  sucesso: '#4ade80',
  medio: '#fbbf24',
  fracasso: '#f87171',
}

export default async function ShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: show, error } = await supabase
    .from('shows')
    .select('id, data, nome_evento, status_ingresso, participou, resultado_geral, clima_estimado, concorrencia, observacoes, publico_estimado, singularidades, legado, venue_id, venues(id, nome, cidade, capacidade_praticavel, zona_risco, lat, lng)')
    .eq('id', id)
    .single() as any

  if (error || !show) notFound()

  const { data: saRows } = await supabase
    .from('show_artists')
    .select('artist_id, ordem, faz_estampa, artists(id, nome, pais, tags_editorial, lastfm_listeners)')
    .eq('show_id', id)
    .order('ordem', { ascending: true }) as any

  const lineup = (saRows ?? []).map((sa: any) => ({
    artist_id: sa.artist_id,
    ordem: sa.ordem,
    faz_estampa: sa.faz_estampa,
    artist: Array.isArray(sa.artists) ? sa.artists[0] : sa.artists,
  }))

  const venue = Array.isArray(show.venues) ? show.venues[0] : show.venues
  const past = isPast(show.data)
  const nomeShow = show.nome_evento ?? lineup.map((l: any) => l.artist?.nome).filter(Boolean).join(' / ') ?? '—'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const limit5 = new Date(today); limit5.setDate(limit5.getDate() + 5)
  const showDate = new Date(show.data + 'T12:00:00')
  const mostrarClima = showDate >= today && showDate <= limit5
  const singularidades = (show.singularidades as string[] | null) ?? []

  return (
    <div className="page-container">

      {/* Breadcrumb */}
      <Link href="/shows" className="breadcrumb">
        ← Shows
      </Link>

      {/* Header */}
      <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.3 }}>
            {nomeShow}
          </h1>
          {show.legado && show.participou === null && past && (
            <span style={{
              fontSize: '0.75rem', fontWeight: 600, flexShrink: 0,
              color: 'var(--amber)', border: '1px solid var(--amber)',
              padding: '0.2rem 0.6rem', borderRadius: 4,
            }}>
              ◇ confirmar presença
            </span>
          )}
          {show.resultado_geral && (
            <span style={{
              fontSize: '0.75rem', fontWeight: 600, flexShrink: 0,
              color: COR_RESULTADO[show.resultado_geral] ?? 'var(--text-dim)',
              border: `1px solid ${COR_RESULTADO[show.resultado_geral] ?? 'var(--border)'}`,
              padding: '0.2rem 0.6rem', borderRadius: 4,
            }}>
              {LABEL_RESULTADO[show.resultado_geral] ?? show.resultado_geral}
            </span>
          )}
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 6 }}>
          {formatData(show.data)}
          {venue && <> · {venue.nome}, {venue.cidade}</>}
        </p>

        {/* Singularidades */}
        {singularidades.length > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: 8 }}>
            {singularidades.map((tag: string) => (
              <span key={tag} style={{
                fontSize: '0.7rem', padding: '0.15rem 0.5rem',
                background: '#1a1a2a', border: '1px solid var(--blue)',
                borderRadius: 3, color: 'var(--blue)',
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Métricas */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Status', value: LABEL_STATUS[show.status_ingresso ?? ''] ?? show.status_ingresso ?? '—' },
          { label: 'Público est.', value: show.publico_estimado ? show.publico_estimado.toLocaleString('pt-BR') : '—' },
          { label: 'Concorrência', value: show.concorrencia ?? '—' },
          { label: past ? 'Realizado' : 'Previsto', value: past ? (show.participou ? 'Sim' : 'Não') : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="stat-card">
            <p className="stat-label">{label}</p>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>

      {/* Previsão climática */}
      {mostrarClima && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p className="section-label">☾ previsão</p>
          <WeatherWidget
            data={show.data}
            lat={venue?.lat ?? null}
            lng={venue?.lng ?? null}
            climaSalvo={show.clima_estimado ?? null}
          />
        </div>
      )}

      {/* Lineup */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p className="section-label">Lineup</p>
        {lineup.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Sem artistas cadastrados.</p>
        ) : (
          <div>
            {lineup.map((l: any) => (
              <div key={l.artist_id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.5rem 0', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)', width: 16 }}>
                  {l.ordem}
                </span>
                <Link href={`/artistas/${l.artist_id}`} style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text)', textDecoration: 'none' }}>
                  {l.artist?.nome ?? '—'}
                </Link>
                {l.artist?.pais && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{l.artist.pais}</span>
                )}
                {l.artist?.lastfm_listeners && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                    {l.artist.lastfm_listeners.toLocaleString('pt-BR')}
                  </span>
                )}
                {l.faz_estampa && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--cyan)', padding: '0.1rem 0.4rem', border: '1px solid var(--cyan)', borderRadius: 3 }}>
                    estampa
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Venue */}
      {venue && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p className="section-label">Venue</p>
          <Link href={`/locais/${venue.id}`} style={{ textDecoration: 'none' }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '0.75rem 1rem', background: 'var(--surface)' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>{venue.nome}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '2px 0 0' }}>
                {venue.cidade}
                {venue.capacidade_praticavel && ` · cap. ${venue.capacidade_praticavel.toLocaleString('pt-BR')}`}
                {venue.zona_risco && <span style={{ color: 'var(--red)', marginLeft: 6 }}>zona de risco</span>}
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* Observações */}
      {show.observacoes && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p className="section-label">Observações</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>{show.observacoes}</p>
        </div>
      )}

      {/* Editar */}
      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <Link href={`/shows/${id}/editar`}
          style={{
            fontSize: '0.8rem', color: 'var(--text-dim)',
            textDecoration: 'none', border: '1px solid var(--border)',
            padding: '0.35rem 0.85rem', borderRadius: 4, background: 'var(--surface-2)',
          }}>
          Editar show
        </Link>
      </div>

    </div>
  )
}