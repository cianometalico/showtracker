import { createClient } from '@/utils/supabase/server'
import type { Show, ShowWithRelations, ShowListItem } from '@/types/models'

export async function getShows(): Promise<ShowListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shows')
    .select(`
      id, data, nome_evento, participou, resultado_geral, status_ingresso, publico_estimado,
      venues ( id, nome, cidade ),
      show_artists (
        ordem, faz_estampa,
        artists ( id, nome )
      )
    `)
    .order('data', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as ShowListItem[]
}

export async function getShow(id: string): Promise<ShowWithRelations | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shows')
    .select(`
      *,
      venues (*),
      show_artists (
        *, artists (*)
      )
    `)
    .eq('id', id)
    .single()

  if (error) return null
  return data as unknown as ShowWithRelations
}

export async function createShow(payload: any): Promise<Show> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shows')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Show
}

export async function updateShow(id: string, payload: any): Promise<Show> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shows')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Show
}

export async function getShowsByArtista(
  artistId: string,
  currentShowId: string,
): Promise<{ data: { id: string; data: string; nome_evento: string | null; venue_nome: string | null; cidade: string | null }[]; error: string | null }> {
  const supabase = await createClient()

  const { data: saRows, error: e1 } = await (supabase as any)
    .from('show_artists')
    .select('show_id')
    .eq('artist_id', artistId)
  if (e1) return { data: [], error: e1.message }

  const showIds = ((saRows ?? []) as any[])
    .map((sa: any) => sa.show_id)
    .filter((sid: string) => sid !== currentShowId)
  if (showIds.length === 0) return { data: [], error: null }

  const { data, error } = await (supabase as any)
    .from('shows')
    .select('id, data, nome_evento, venues(nome, cidade)')
    .in('id', showIds)
    .order('data', { ascending: false })

  if (error) return { data: [], error: error.message }

  const mapped = ((data ?? []) as any[]).map((s: any) => {
    const v = Array.isArray(s.venues) ? s.venues[0] : s.venues
    return {
      id:          s.id,
      data:        s.data,
      nome_evento: s.nome_evento ?? null,
      venue_nome:  v?.nome ?? null,
      cidade:      v?.cidade ?? null,
    }
  })
  return { data: mapped, error: null }
}

export async function getShowsInRange(from: string, to: string): Promise<ShowListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shows')
    .select(`
      id, data, nome_evento, participou, resultado_geral, status_ingresso, publico_estimado,
      venues ( id, nome, cidade ),
      show_artists (
        ordem, faz_estampa,
        artists ( id, nome )
      )
    `)
    .gte('data', from)
    .lte('data', to)
    .order('data', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as ShowListItem[]
}
