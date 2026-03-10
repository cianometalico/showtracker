import { supabase } from '@/lib/supabase'

export async function getInventoryItems(categoria?: string) {
  let query = supabase.from('inventory_items').select('*').order('categoria').order('nome')
  if (categoria) query = query.eq('categoria', categoria)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createInventoryItem(payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('inventory_items')
    .insert([payload])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateInventoryItem(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('inventory_items')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteInventoryItem(id: string) {
  const { error } = await supabase.from('inventory_items').delete().eq('id', id)
  if (error) throw error
}