import { WeatherWidget } from './weather-widget'
import { ShowDetailClient } from './show-detail-client'
import { ShowStockSection } from './show-stock-section'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'

function isPast(iso: string) {
  return new Date(iso + 'T23:59:59') < new Date()
}

export default async function ShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: show, error } = await supabase
    .from('shows')
    .select('id, data, nome_evento, status_ingresso, participou, resultado_geral, clima_estimado, concorrencia, observacoes, publico_estimado, singularidades, legado, venue_id, source_url, pecas_levadas, pecas_vendidas, venues(id, nome, cidade, bairro, capacidade_praticavel, zona_risco, lat, lng)')
    .eq('id', id)
    .single() as any

  if (error || !show) notFound()

  const { data: saRows } = await supabase
    .from('show_artists')
    .select('artist_id, ordem, faz_estampa, artists(id, nome, pais, mbid, tags_editorial, lastfm_listeners)')
    .eq('show_id', id)
    .order('ordem', { ascending: true }) as any

  const lineup = (saRows ?? []).map((sa: any) => ({
    artist_id: sa.artist_id,
    ordem: sa.ordem,
    faz_estampa: sa.faz_estampa,
    nome: (Array.isArray(sa.artists) ? sa.artists[0] : sa.artists)?.nome ?? '—',
    pais: (Array.isArray(sa.artists) ? sa.artists[0] : sa.artists)?.pais ?? null,
    lastfm_listeners: (Array.isArray(sa.artists) ? sa.artists[0] : sa.artists)?.lastfm_listeners ?? null,
    mbid: (Array.isArray(sa.artists) ? sa.artists[0] : sa.artists)?.mbid ?? null,
  }))

  const venue = Array.isArray(show.venues) ? show.venues[0] : show.venues

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const limit5 = new Date(today); limit5.setDate(limit5.getDate() + 5)
  const showDate = new Date(show.data + 'T12:00:00')
  const mostrarClima = showDate >= today && showDate <= limit5

  // ── Estoque: movimentos deste show ──
  const { data: movRows } = await (supabase as any)
    .from('stock_movements')
    .select('id, tipo, quantidade, observacoes, created_at, design_id, designs(nome)')
    .eq('show_id', id)
    .order('created_at', { ascending: false })

  const movements = ((movRows ?? []) as any[]).map((m: any) => ({
    id:          m.id,
    design_id:   m.design_id,
    design_nome: (Array.isArray(m.designs) ? m.designs[0] : m.designs)?.nome ?? '—',
    tipo:        m.tipo,
    quantidade:  m.quantidade,
    observacoes: m.observacoes ?? null,
    created_at:  m.created_at,
  }))

  const levadosAqui = movements.filter(m => m.tipo === 'levado').map(m => m.design_id)

  // ── Estoque: designs ativos com saldo ──
  const { data: stockRows } = await (supabase as any)
    .from('design_stock')
    .select('design_id, nome, artist_id, ativo, saldo_atual')
    .eq('ativo', true)
    .order('nome')

  const artistIds = [...new Set(((stockRows ?? []) as any[]).map((d: any) => d.artist_id))]
  const artistNames: Record<string, string> = {}
  if (artistIds.length > 0) {
    const { data: artists } = await (supabase as any)
      .from('artists').select('id, nome').in('id', artistIds)
    for (const a of (artists ?? []) as any[]) artistNames[a.id] = a.nome
  }

  const activeDesigns = ((stockRows ?? []) as any[]).map((d: any) => ({
    id:      d.design_id,
    nome:    d.nome,
    artista: artistNames[d.artist_id] ?? '—',
    saldo:   d.saldo_atual ?? 0,
  }))

  return (
    <div className="page-container">
      <ShowDetailClient
        show={{
          id: show.id,
          data: show.data,
          nome_evento: show.nome_evento,
          status_ingresso: show.status_ingresso,
          participou: show.participou,
          resultado_geral: show.resultado_geral,
          clima_estimado: show.clima_estimado,
          concorrencia: show.concorrencia,
          observacoes: show.observacoes,
          publico_estimado: show.publico_estimado,
          singularidades: show.singularidades ?? [],
          legado: show.legado,
          venue_id: show.venue_id,
          source_url: show.source_url ?? null,
          pecas_levadas: show.pecas_levadas ?? null,
          pecas_vendidas: show.pecas_vendidas ?? null,
        }}
        venue={venue ?? null}
        lineup={lineup}
      />

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

      {(show.participou || movements.length > 0) && (
        <ShowStockSection
          showId={id}
          movements={movements}
          activeDesigns={activeDesigns}
          levadosAqui={levadosAqui}
        />
      )}
    </div>
  )
}
