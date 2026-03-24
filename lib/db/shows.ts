import { createClient } from '@/utils/supabase/server'
import type { Show, ShowWithRelations, ShowListItem } from '@/types/database'

export async function getShows(): Promise<ShowListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shows')
    .select(`
      id, data, nome_evento, participou, resultado_geral, status_ingresso,
      venues ( id, nome, cidade ),
      show_artists (
        billing_order, fez_estampa,
        artists ( id, nome, porte_fisico )
      )
    `)
    .order('data', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as ShowListItem[]
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
      ),
      designs (*)
    `)
    .eq('id', id)
    .single()

  if (error) return null
  return data as ShowWithRelations
}

export async function createShow(payload: Partial<Show>): Promise<Show> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shows')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateShow(id: string, payload: Partial<Show>): Promise<Show> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shows')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getShowsInRange(from: string, to: string): Promise<ShowListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shows')
    .select(`
      id, data, nome_evento, participou, resultado_geral, status_ingresso,
      venues ( id, nome, cidade ),
      show_artists (
        billing_order, fez_estampa,
        artists ( id, nome, porte_fisico )
      )
    `)
    .gte('data', from)
    .lte('data', to)
    .order('data', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as ShowListItem[]
}
