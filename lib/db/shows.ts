import { createClient } from '@/utils/supabase/server'
// TODO: tipar corretamente — Show, ShowWithRelations, ShowListItem removidos de @/types/database

export async function getShows(): Promise<any[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shows')
    .select(`
      id, data, nome_evento, participou, resultado_geral, status_ingresso,
      venues ( id, nome, cidade ),
      show_artists (
        ordem, faz_estampa,
        artists ( id, nome )
      )
    `)
    .order('data', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getShow(id: string): Promise<any | null> {
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
  return data
}

export async function createShow(payload: any): Promise<any> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shows')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateShow(id: string, payload: any): Promise<any> {
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

export async function getShowsInRange(from: string, to: string): Promise<any[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shows')
    .select(`
      id, data, nome_evento, participou, resultado_geral, status_ingresso,
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
  return data ?? []
}
