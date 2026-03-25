import { createClient } from '@/utils/supabase/server'
// TODO: tipar corretamente — Artist removido de @/types/database

export async function getArtists(): Promise<any[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .order('nome')

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getArtist(id: string): Promise<any | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function upsertArtist(payload: any): Promise<any> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('artists')
    .upsert(payload, { onConflict: 'nome' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateArtist(id: string, payload: any): Promise<any> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('artists')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}
