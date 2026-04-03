import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

type RawRow = {
  data: string
  local: string
  evento: string
  artista: string
  turne: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  const rows: RawRow[] = body.rows ?? []

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Sem linhas para processar' }, { status: 400 })
  }

  const resultRows = []
  let venues_new  = 0
  let artists_new = 0
  let duplicates  = 0

  // Caches to avoid repeated DB lookups for the same name
  const venueCache:  Record<string, { status: 'found' | 'not_found'; id?: string }> = {}
  const artistCache: Record<string, { status: 'found' | 'not_found'; id?: string }> = {}

  for (const row of rows) {
    const venueKey  = row.local.toLowerCase().trim()
    const artistKey = row.artista.toLowerCase().trim()

    // ── Venue lookup ──────────────────────────────────
    if (!venueCache[venueKey]) {
      const { data: v } = await (supabase as any)
        .from('venues')
        .select('id')
        .ilike('nome', row.local.trim())
        .maybeSingle()

      if (v) {
        venueCache[venueKey] = { status: 'found', id: v.id }
      } else {
        venueCache[venueKey] = { status: 'not_found' }
        venues_new++
      }
    }

    // ── Artist lookup ─────────────────────────────────
    if (!artistCache[artistKey]) {
      const { data: a } = await (supabase as any)
        .from('artists')
        .select('id')
        .ilike('nome', row.artista.trim())
        .maybeSingle()

      if (a) {
        artistCache[artistKey] = { status: 'found', id: a.id }
      } else {
        artistCache[artistKey] = { status: 'not_found' }
        artists_new++
      }
    }

    const venue_status  = venueCache[venueKey].status
    const artist_status = artistCache[artistKey].status
    const venue_id      = venueCache[venueKey].id
    const artist_id     = artistCache[artistKey].id

    // ── Duplicate check ───────────────────────────────
    // Only possible when both venue and artist already exist in the DB
    let show_status: 'new' | 'duplicate' = 'new'

    if (venue_status === 'found' && artist_status === 'found') {
      const { data: existing } = await (supabase as any)
        .from('shows')
        .select('id, show_artists!inner(artist_id)')
        .eq('venue_id', venue_id)
        .eq('data', row.data)
        .eq('show_artists.artist_id', artist_id)
        .maybeSingle()

      if (existing) {
        show_status = 'duplicate'
        duplicates++
      }
    }

    resultRows.push({
      ...row,
      venue_status,
      venue_id,
      artist_status,
      artist_id,
      show_status,
    })
  }

  const to_import = rows.length - duplicates

  return NextResponse.json({
    summary: { total: rows.length, to_import, duplicates, venues_new, artists_new },
    rows:    resultRows,
  })
}
