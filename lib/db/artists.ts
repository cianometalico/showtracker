import { createClient } from '@/utils/supabase/server'
import type { Artist } from '@/types/database'

export async function getArtists(): Promise<Artist[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .order('nome_canonico')

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getArtist(id: string): Promise<Artist | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function upsertArtist(payload: Partial<Artist>): Promise<Artist> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('artists')
    .upsert(payload, { onConflict: 'nome_canonico' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateArtist(id: string, payload: Partial<Artist>): Promise<Artist> {
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
