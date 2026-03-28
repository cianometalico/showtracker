'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateDesign(
  id: string,
  input: { nome: string; descricao: string | null; ativo: boolean }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('designs')
    .update({ nome: input.nome, descricao: input.descricao, ativo: input.ativo })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/estoque/${id}`)
  revalidatePath('/estoque')
  return {}
}

export async function addMovement(input: {
  design_id:   string
  tipo:        'produzido' | 'levado' | 'vendido' | 'perdido'
  quantidade:  number
  show_id:     string | null
  observacoes: string | null
  saldo_atual: number
}): Promise<{ error?: string }> {
  // Validar saldo não negativo para saídas
  if (['vendido', 'perdido'].includes(input.tipo)) {
    if (input.quantidade > input.saldo_atual) {
      return { error: `Saldo insuficiente. Saldo atual: ${input.saldo_atual}` }
    }
  }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('stock_movements')
    .insert({
      design_id:   input.design_id,
      tipo:        input.tipo,
      quantidade:  input.quantidade,
      show_id:     input.show_id || null,
      observacoes: input.observacoes || null,
    })

  if (error) return { error: error.message }
  revalidatePath(`/estoque/${input.design_id}`)
  revalidatePath('/estoque')
  if (input.show_id) {
    revalidatePath(`/shows/${input.show_id}`)
  }
  return {}
}

export async function deleteMovement(movementId: string, designId: string, showId: string | null): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('stock_movements')
    .delete()
    .eq('id', movementId)
  if (error) return { error: error.message }
  revalidatePath(`/estoque/${designId}`)
  revalidatePath('/estoque')
  if (showId) revalidatePath(`/shows/${showId}`)
  return {}
}

export async function deleteDesign(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await (supabase as any).from('designs').delete().eq('id', id)
  if (error) throw new Error(error.message)
  redirect('/estoque')
}

export async function searchShowsForMovement(q: string): Promise<{ id: string; label: string }[]> {
  if (!q || q.length < 2) return []
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('shows')
    .select('id, data, nome_evento, venues(nome)')
    .ilike('nome_evento', `%${q}%`)
    .limit(8)
  return ((data ?? []) as any[]).map((s: any) => {
    const venue = Array.isArray(s.venues) ? s.venues[0] : s.venues
    const label = s.nome_evento ? `${s.nome_evento} (${s.data})` : `${venue?.nome ?? '?'} (${s.data})`
    return { id: s.id, label }
  })
}
