import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { VenueDetailClient } from './venue-detail-client'
import { getNichosByVenue, getResultadoMedioByVenue } from '@/lib/db/intelligence'

export default async function VenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: venue, error } = await (supabase as any)
    .from('venues')
    .select('id, nome, cidade, bairro, lat, lng, capacidade_praticavel, tipo_default, zona_risco, risco_fiscalizacao, subprefeituras(id, nome, risco_base, notas, perfil)')
    .eq('id', id)
    .single()

  if (error || !venue) notFound()

  const sub = Array.isArray(venue.subprefeituras) ? venue.subprefeituras[0] : venue.subprefeituras

  const { data: subprefeituras } = await (supabase as any)
    .from('subprefeituras')
    .select('id, nome, zona')
    .order('nome')

  const { data: showRows } = await (supabase as any)
    .from('shows')
    .select('id, data, nome_evento, status_ingresso, participou, resultado_geral')
    .eq('venue_id', id)
    .order('data', { ascending: false })

  const shows = (showRows ?? []) as any[]
  const showIds = shows.map((s: any) => s.id)

  let artistsByShow: Record<string, string[]> = {}
  if (showIds.length > 0) {
    const { data: saRows } = await (supabase as any)
      .from('show_artists')
      .select('show_id, artist_id')
      .in('show_id', showIds)

    const artistIds = [...new Set(((saRows ?? []) as any[]).map((sa: any) => sa.artist_id))]
    if (artistIds.length > 0) {
      const { data: artistRows } = await (supabase as any)
        .from('artists')
        .select('id, nome')
        .in('id', artistIds)

      const artistMap: Record<string, string> = {}
      for (const a of (artistRows ?? []) as any[]) artistMap[a.id] = a.nome

      for (const sa of (saRows ?? []) as any[]) {
        if (!artistsByShow[sa.show_id]) artistsByShow[sa.show_id] = []
        artistsByShow[sa.show_id].push(artistMap[sa.artist_id] ?? '?')
      }
    }
  }

  const showsEnriquecidos = shows.map((s: any) => ({
    id:              s.id,
    data:            s.data,
    nome_evento:     s.nome_evento ?? null,
    status_ingresso: s.status_ingresso ?? null,
    participou:      s.participou ?? null,
    resultado_geral: s.resultado_geral ?? null,
    artistas:        artistsByShow[s.id] ?? [],
  }))

  const [nichosByVenue, resultadosByVenue] = await Promise.all([
    getNichosByVenue(id),
    getResultadoMedioByVenue(),
  ])
  const venueResultadoData = resultadosByVenue.find(r => r.id === id) ?? null
  const venueResultado = venueResultadoData
    ? { total_shows: venueResultadoData.total_shows, distribuicao: venueResultadoData.distribuicao }
    : null

  return (
    <VenueDetailClient
      venue={venue}
      subprefeitura={sub ?? null}
      subprefeituras={subprefeituras ?? []}
      shows={showsEnriquecidos}
      nichosByVenue={nichosByVenue}
      venueResultado={venueResultado}
    />
  )
}
