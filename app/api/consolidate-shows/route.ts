import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST() {
  const supabase = await createClient()

  // ── A: fetch all legado festival shows (nome_evento not null) ──
  const { data: shows, error } = await (supabase as any)
    .from('shows')
    .select('id, data, venue_id, nome_evento, show_artists(artist_id, ordem, faz_estampa)')
    .eq('legado', true)
    .not('nome_evento', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── B: group by data + venue_id + nome_evento ──────────────────
  const groups = new Map<string, typeof shows>()
  for (const show of (shows ?? [])) {
    const key = `${show.data}|${show.venue_id}|${show.nome_evento}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(show)
  }

  let consolidated   = 0  // groups that had > 1 show
  let shows_deleted  = 0
  let artists_moved  = 0
  const errors: string[] = []

  // ── C: consolidate groups with > 1 show ───────────────────────
  for (const [, group] of groups) {
    if (group.length <= 1) continue

    const [primary, ...duplicates] = group

    // Collect existing artist_ids in primary to avoid PK conflicts
    const existingArtistIds = new Set(
      (primary.show_artists ?? []).map((sa: any) => sa.artist_id)
    )
    let ordem = (primary.show_artists ?? []).length + 1

    for (const dup of duplicates) {
      for (const sa of (dup.show_artists ?? [])) {
        // Skip if artist already linked to primary (dedup)
        if (existingArtistIds.has(sa.artist_id)) continue

        try {
          const { error: insertErr } = await (supabase as any)
            .from('show_artists')
            .insert({
              show_id:     primary.id,
              artist_id:   sa.artist_id,
              ordem,
              faz_estampa: false,
            })

          if (insertErr) throw insertErr
          existingArtistIds.add(sa.artist_id)
          ordem++
          artists_moved++
        } catch (e: any) {
          errors.push(`show_artists insert: ${e.message}`)
        }
      }

      // Delete show_artists then show for the duplicate
      try {
        await (supabase as any).from('show_artists').delete().eq('show_id', dup.id)
        const { error: delErr } = await (supabase as any).from('shows').delete().eq('id', dup.id)
        if (delErr) throw delErr
        shows_deleted++
      } catch (e: any) {
        errors.push(`delete show ${dup.id}: ${e.message}`)
      }
    }

    consolidated++
  }

  return NextResponse.json({ consolidated, shows_deleted, artists_moved, errors })
}
