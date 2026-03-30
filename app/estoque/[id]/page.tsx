import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { DesignDetailClient } from './design-detail-client'

export default async function DesignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Design + saldo
  const { data: stockRow } = await (supabase as any)
    .from('design_stock')
    .select('design_id, nome, artist_id, ativo, total_produzido, total_vendido, total_perdido, saldo_atual')
    .eq('design_id', id)
    .single()

  if (!stockRow) notFound()

  const { data: designRow } = await (supabase as any)
    .from('designs')
    .select('id, nome, descricao, ativo, artist_id, created_at')
    .eq('id', id)
    .single()

  if (!designRow) notFound()

  // Artista
  const { data: artistRow } = await (supabase as any)
    .from('artists')
    .select('id, nome')
    .eq('id', stockRow.artist_id)
    .single()

  // Movimentações
  const { data: movements } = await (supabase as any)
    .from('stock_movements')
    .select('id, tipo, quantidade, show_id, observacoes, created_at, shows(id, data, nome_evento, venues(nome))')
    .eq('design_id', id)
    .order('created_at', { ascending: false })

  const movementsMapped = ((movements ?? []) as any[]).map((m: any) => {
    const show = Array.isArray(m.shows) ? m.shows[0] : m.shows
    const venue = show ? (Array.isArray(show.venues) ? show.venues[0] : show.venues) : null
    const showLabel = show
      ? (show.nome_evento ? `${show.nome_evento} (${show.data})` : `${venue?.nome ?? '?'} (${show.data})`)
      : null
    return {
      id:          m.id,
      tipo:        m.tipo,
      quantidade:  m.quantidade,
      show_id:     m.show_id ?? null,
      show_label:  showLabel,
      observacoes: m.observacoes ?? null,
      created_at:  m.created_at,
    }
  })

  // Shows do artista vinculado ao design (dois passos para evitar limitações do join)
  let showOptions: { id: string; label: string }[] = []
  let artistShows: { id: string; data: string; nome_evento: string | null; venue_nome: string | null; resultado_geral: string | null }[] = []

  if (designRow.artist_id) {
    const { data: showArtists } = await (supabase as any)
      .from('show_artists')
      .select('show_id')
      .eq('artist_id', designRow.artist_id)

    const showIds = ((showArtists ?? []) as any[]).map((sa: any) => sa.show_id)

    if (showIds.length > 0) {
      const { data: showRows } = await (supabase as any)
        .from('shows')
        .select('id, data, nome_evento, resultado_geral, venues(nome)')
        .in('id', showIds)
        .order('data', { ascending: false })

      artistShows = ((showRows ?? []) as any[]).map((s: any) => {
        const venue = Array.isArray(s.venues) ? s.venues[0] : s.venues
        return {
          id:             s.id,
          data:           s.data,
          nome_evento:    s.nome_evento ?? null,
          venue_nome:     venue?.nome ?? null,
          resultado_geral: s.resultado_geral ?? null,
        }
      })

      showOptions = artistShows.map(s => ({
        id:    s.id,
        label: s.nome_evento ? `${s.nome_evento} (${s.data})` : `${s.venue_nome ?? '?'} (${s.data})`,
      }))
    }
  }

  return (
    <DesignDetailClient
      design={{
        id:          designRow.id,
        nome:        designRow.nome,
        descricao:   designRow.descricao ?? null,
        ativo:       designRow.ativo,
        artist_id:   designRow.artist_id,
        artista:     (artistRow as any)?.nome ?? '—',
        created_at:  designRow.created_at,
      }}
      saldo={{
        total_produzido: stockRow.total_produzido ?? 0,
        total_vendido:   stockRow.total_vendido ?? 0,
        total_perdido:   stockRow.total_perdido ?? 0,
        saldo_atual:     stockRow.saldo_atual ?? 0,
      }}
      movements={movementsMapped}
      showOptions={showOptions}
      artistShows={artistShows}
    />
  )
}
