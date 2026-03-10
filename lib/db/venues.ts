import { supabase } from '@/lib/supabase'

export async function getVenues() {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .order('nome')
  if (error) throw error
  return data
}

export async function getVenue(id: string) {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createVenue(payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('venues')
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateVenue(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('venues')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteVenue(id: string) {
  const { error } = await supabase.from('venues').delete().eq('id', id)
  if (error) throw error
}