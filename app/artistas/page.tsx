import { createClient } from '@/utils/supabase/server'
import { ArtistasListClient } from './artistas-list-client'

export default async function ArtistasPage() {
  const supabase = await createClient()

  const { data: rows } = await (supabase as any)
    .from('artists')
    .select('id, nome, pais, tags_editorial, tags_behavioral, lastfm_listeners')
    .order('nome', { ascending: true })

  const { data: saRows } = await (supabase as any)
    .from('show_artists')
    .select('artist_id')

  const showCount: Record<string, number> = {}
  for (const sa of (saRows ?? [])) {
    showCount[sa.artist_id] = (showCount[sa.artist_id] ?? 0) + 1
  }

  const artists = (rows ?? []).map((a: any) => ({
    id:               a.id,
    nome:             a.nome,
    pais:             a.pais ?? null,
    lastfm_listeners: a.lastfm_listeners ?? null,
    total_shows:      showCount[a.id] ?? 0,
    top_tag:          (a.tags_editorial as string[] | null)?.[0]
                   ?? (a.tags_behavioral as {name: string}[] | null)?.[0]?.name
                   ?? null,
  }))

  return <ArtistasListClient artists={artists} />
}