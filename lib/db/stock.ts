import { supabase } from '@/lib/supabase'

export async function getStockItems() {
  const { data, error } = await supabase
    .from('stock_items')
    .select('*')
    .order('cor')
  if (error) throw error
  return data
}

export async function upsertStockItem(payload: {
  tipo: string
  cor: string
  tamanho: string
  quantidade: number
  custo_unitario?: number
}) {
  const { data, error } = await supabase
    .from('stock_items')
    .upsert([payload], { onConflict: 'tipo,cor,tamanho' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateStockQuantity(id: string, delta: number) {
  const { data: item } = await supabase
    .from('stock_items')
    .select('quantidade')
    .eq('id', id)
    .single()
  if (!item) throw new Error('Item não encontrado')
  const { error } = await supabase
    .from('stock_items')
    .update({ quantidade: item.quantidade + delta, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteStockItem(id: string) {
  const { error } = await supabase.from('stock_items').delete().eq('id', id)
  if (error) throw error
}