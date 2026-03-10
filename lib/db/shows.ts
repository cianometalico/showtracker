import { supabase } from '@/lib/supabase'

export async function getShows() {
  const { data, error } = await supabase
    .from('shows')
    .select('*, artists(nome), venues(nome, capacidade, lat, lng, zona), designs(status), pieces(quantidade, vendidas)')
    .order('data', { ascending: true })
  if (error) throw error
  return data
}

export async function getShow(id: string) {
  const { data, error } = await supabase
    .from('shows')
    .select('*, artists(nome), venues(nome, capacidade, lat, lng, zona), designs(*), pieces(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getUpcomingShows(days = 15) {
  const hoje = new Date().toISOString().split('T')[0]
  const limite = new Date()
  limite.setDate(limite.getDate() + days)
  const limiteStr = limite.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('shows')
    .select('*, artists(nome), venues(nome), designs(status), pieces(quantidade)')
    .gte('data', hoje)
    .lte('data', limiteStr)
    .order('data', { ascending: true })
  if (error) throw error
  return data
}

export async function getPastShows(limit = 20) {
  const hoje = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('shows')
    .select('*, artists(nome), venues(nome), designs(status), pieces(quantidade, vendidas)')
    .lt('data', hoje)
    .order('data', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function createShow(payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('shows')
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateShow(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('shows')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteShow(id: string) {
  await supabase.from('pieces').delete().eq('show_id', id)
  await supabase.from('designs').delete().eq('show_id', id)
  const { error } = await supabase.from('shows').delete().eq('id', id)
  if (error) throw error
}