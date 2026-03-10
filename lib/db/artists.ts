import { supabase } from '@/lib/supabase'

export async function getArtists() {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .order('nome')
  if (error) throw error
  return data
}

export async function getArtist(id: string) {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createArtist(payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('artists')
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateArtist(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('artists')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteArtist(id: string) {
  const { error } = await supabase.from('artists').delete().eq('id', id)
  if (error) throw error
}

export async function upsertArtistByName(nome: string) {
  const { data: existing } = await supabase
    .from('artists')
    .select('id')
    .ilike('nome', nome)
    .single()
  if (existing) return existing
  return createArtist({ nome })
}