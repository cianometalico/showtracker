// app/api/artist-shows/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const artistId     = searchParams.get('artistId')
  const excludeShowId = searchParams.get('excludeShowId')

  if (!artistId) return NextResponse.json({ error: 'artistId required' }, { status: 400 })

  const supabase = await createClient()

  // Busca show_ids deste artista
  const { data: saRows } = await supabase
    .from('show_artists')
    .select('show_id')
    .eq('artist_id', artistId)

  const showIds = (saRows ?? []).map(r => r.show_id).filter(id => id !== excludeShowId)
  if (showIds.length === 0) return NextResponse.json({ shows: [] })

  const { data: showRows } = await supabase
    .from('shows')
    .select('id, data, nome_evento, resultado_geral, status_ingresso, participou, venue_id')
    .in('id', showIds)
    .order('data', { ascending: false })

  // Busca artistas de cada show para montar nome_evento fallback
  const { data: allSA } = await supabase
    .from('show_artists')
    .select('show_id, artist_id')
    .in('show_id', showIds)

  const { data: artistRows } = await supabase
    .from('artists')
    .select('id, nome')

  const artistMap = Object.fromEntries((artistRows ?? []).map(a => [a.id, a.nome]))

  const shows = (showRows ?? []).map(s => {
    const artistas = (allSA ?? [])
      .filter(sa => sa.show_id === s.id)
      .map(sa => artistMap[sa.artist_id])
      .filter(Boolean)

    return {
      id:              s.id,
      data:            s.data,
      nome_evento:     s.nome_evento,
      artistas,
      resultado_geral: s.resultado_geral,
      status_ingresso: s.status_ingresso,
      participou:      s.participou,
    }
  })

  return NextResponse.json({ shows })
}