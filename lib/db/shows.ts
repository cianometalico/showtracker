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
