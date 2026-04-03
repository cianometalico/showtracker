import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const TIPOS_SHOW = ['Show Solo', 'Show Conjunto']
const isFestival = (evento: string) => !TIPOS_SHOW.includes(evento)

type PreviewRow = {
  data: string
  local: string
  evento: string
  artista: string
  turne: string
  venue_status: 'found' | 'not_found'
  venue_id?: string
  artist_status: 'found' | 'not_found'
  artist_id?: string
  show_status?: 'new' | 'duplicate'
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  // Filter defensively — client should already send only 'new' rows
  const rows: PreviewRow[] = (body.rows ?? []).filter(
    (r: PreviewRow) => r.show_status !== 'duplicate'
  )

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Sem linhas para importar' }, { status: 400 })
  }

  let shows_created   = 0
  let fail            = 0
  let artists_created = 0
  let venues_created  = 0
  const errors: string[] = []

  // ── Phase 1: Resolve all venues and artists ────────────────────
  // Pre-populate caches from preview ids, create missing ones
  const venueIds:  Record<string, string> = {}
  const artistIds: Record<string, string> = {}

  for (const row of rows) {
    if (row.venue_id)  venueIds[row.local.toLowerCase().trim()]    = row.venue_id
    if (row.artist_id) artistIds[row.artista.toLowerCase().trim()] = row.artist_id
  }

  for (const row of rows) {
    const venueKey  = row.local.toLowerCase().trim()
    const artistKey = row.artista.toLowerCase().trim()

    if (!venueIds[venueKey]) {
      const { data: v, error: ve } = await (supabase as any)
        .from('venues')
        .insert({
          nome:               row.local.trim(),
          cidade:             'São Paulo',
          risco_fiscalizacao: 'medium',
        })
        .select('id')
        .single()

      if (ve || !v) {
        errors.push(`venue "${row.local}": ${ve?.message ?? 'erro'}`)
        venueIds[venueKey] = '__error__'
      } else {
        venueIds[venueKey] = v.id
        venues_created++
      }
    }

    if (!artistIds[artistKey]) {
      const { data: a, error: ae } = await (supabase as any)
        .from('artists')
        .insert({ nome: row.artista.trim() })
        .select('id')
        .single()

      if (ae || !a) {
        errors.push(`artista "${row.artista}": ${ae?.message ?? 'erro'}`)
        artistIds[artistKey] = '__error__'
      } else {
        artistIds[artistKey] = a.id
        artists_created++
      }
    }
  }

  // ── Phase 2: Group rows by show key ───────────────────────────
  // Festival: 1 show per (data + venue + nome_evento), N artists
  // Solo/Conjunto: 1 show per (data + venue + artista)
  const showGroups = new Map<string, PreviewRow[]>()

  for (const row of rows) {
    const venueId = venueIds[row.local.toLowerCase().trim()]
    if (venueId === '__error__') continue

    const key = isFestival(row.evento)
      ? `${row.data}|${venueId}|${row.evento}`
      : `${row.data}|${venueId}|${row.artista.toLowerCase().trim()}`

    if (!showGroups.has(key)) showGroups.set(key, [])
    showGroups.get(key)!.push(row)
  }

  // ── Phase 3: Create one show per group, N show_artists ────────
  for (const [, group] of showGroups) {
    const first      = group[0]
    const venueId    = venueIds[first.local.toLowerCase().trim()]
    const nomeEvento = isFestival(first.evento) ? first.evento || null : null

    try {
      const { data: show, error: se } = await (supabase as any)
        .from('shows')
        .insert({
          venue_id:        venueId,
          data:            first.data,
          nome_evento:     nomeEvento,
          tour:            first.turne || null,
          legado:          true,
          participou:      false,
          status_ingresso: null,
        })
        .select('id')
        .single()

      if (se || !show) throw new Error(`show ${first.data}: ${se?.message ?? 'erro'}`)

      // Insert all artists in the group, deduplicating by artist_id
      const seenArtists = new Set<string>()
      let ordem = 1

      for (const row of group) {
        const artistId = artistIds[row.artista.toLowerCase().trim()]
        if (!artistId || artistId === '__error__') continue
        if (seenArtists.has(artistId)) continue

        const { error: saErr } = await (supabase as any)
          .from('show_artists')
          .insert({
            show_id:     show.id,
            artist_id:   artistId,
            ordem,
            faz_estampa: false,
          })

        if (saErr) {
          errors.push(`show_artists ${row.artista}: ${saErr.message}`)
        } else {
          seenArtists.add(artistId)
          ordem++
        }
      }

      shows_created++
    } catch (e: any) {
      fail++
      errors.push(e.message)
    }
  }

  return NextResponse.json({ ok: shows_created, fail, artists_created, venues_created, errors })
}
