'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type UpdateShowInput = {
  nome_evento:     string | null
  data:            string
  venue_id:        string | null
  status_ingresso: string | null
  concorrencia:    string | null
  resultado_geral: string | null
  observacoes:     string | null
  source_url?:     string | null
  pecas_levadas?:  number | null
  pecas_vendidas?: number | null
  tour?:           string | null
}

export async function updateShowInline(
  id: string,
  input: UpdateShowInput,
  artistas?: { artist_id: string; ordem: number; faz_estampa: boolean }[]
): Promise<void> {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('shows')
    .update({
      nome_evento:     input.nome_evento || null,
      data:            input.data,
      venue_id:        input.venue_id,
      status_ingresso: input.status_ingresso,
      concorrencia:    input.concorrencia,
      resultado_geral: input.resultado_geral || null,
      publico_estimado: input.status_ingresso ? undefined : null,
      observacoes:     input.observacoes || null,
      source_url:      input.source_url || null,
      pecas_levadas:   input.pecas_levadas ?? null,
      pecas_vendidas:  input.pecas_vendidas ?? null,
      tour:            input.tour ?? null,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)

  if (artistas !== undefined) {
    await (supabase as any).from('show_artists').delete().eq('show_id', id)
    if (artistas.length > 0) {
      const { error: saErr } = await (supabase as any)
        .from('show_artists')
        .insert(artistas.map(a => ({ show_id: id, artist_id: a.artist_id, ordem: a.ordem, faz_estampa: a.faz_estampa })))
      if (saErr) throw new Error(saErr.message)
    }
  }

  revalidatePath(`/shows/${id}`)
  revalidatePath('/shows')
}

export async function updateResultado(
  id: string,
  data: { pecas_levadas: number | null; pecas_vendidas: number | null; resultado_geral: string | null }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('shows')
    .update({
      pecas_levadas:   data.pecas_levadas ?? null,
      pecas_vendidas:  data.pecas_vendidas ?? null,
      resultado_geral: data.resultado_geral || null,
    })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/shows/${id}`)
  revalidatePath('/shows')
  return {}
}

export async function updateResultadoOnly(id: string, resultado: string | null): Promise<void> {
  const supabase = await createClient()
  await (supabase as any).from('shows').update({ resultado_geral: resultado || null }).eq('id', id)
  revalidatePath(`/shows/${id}`)
  revalidatePath('/shows')
}

export async function updateParticipou(id: string, participou: boolean): Promise<void> {
  const supabase = await createClient()
  await (supabase as any).from('shows').update({ participou }).eq('id', id)
  revalidatePath(`/shows/${id}`)
  revalidatePath('/shows')
}

export async function deleteShow(id: string): Promise<void> {
  const supabase = await createClient()
  await (supabase as any).from('show_artists').delete().eq('show_id', id)
  const { error } = await (supabase as any).from('shows').delete().eq('id', id)
  if (error) throw new Error(error.message)
  redirect('/shows')
}

export async function searchVenues(q: string): Promise<{ id: string; nome: string; cidade: string }[]> {
  if (!q || q.length < 2) return []
  const supabase = await createClient()
  const { data } = await (supabase as any).rpc('search_venues', { search_term: q })
  return (data ?? []).map((v: any) => ({ id: v.id, nome: v.nome, cidade: v.cidade }))
}

export async function duplicateShow(
  sourceId: string,
  newDate: string
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient()

  const { data: source } = await (supabase as any)
    .from('shows')
    .select('nome_evento, venue_id')
    .eq('id', sourceId)
    .single()

  if (!source) return { error: 'Show não encontrado' }

  const { data: sourceArtists } = await (supabase as any)
    .from('show_artists')
    .select('artist_id, ordem, faz_estampa')
    .eq('show_id', sourceId)

  const { data: newShow, error } = await (supabase as any)
    .from('shows')
    .insert({
      nome_evento: source.nome_evento,
      venue_id:    source.venue_id,
      data:        newDate,
      participou:  false,
      legado:      false,
    })
    .select('id')
    .single()

  if (error || !newShow) return { error: error?.message ?? 'Erro ao criar show' }

  if (sourceArtists && sourceArtists.length > 0) {
    await (supabase as any)
      .from('show_artists')
      .insert(
        sourceArtists.map((sa: any) => ({
          show_id:    newShow.id,
          artist_id:  sa.artist_id,
          ordem:      sa.ordem,
          faz_estampa: sa.faz_estampa,
        }))
      )
  }

  revalidatePath('/shows')
  return { id: newShow.id }
}

export async function addShowMovement(input: {
  showId:     string
  designId:   string
  tipo:       'levado' | 'vendido'
  quantidade: number
  observacoes: string | null
}): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Para vendido, verifica saldo do design
  if (input.tipo === 'vendido') {
    const { data: stockRow } = await (supabase as any)
      .from('design_stock')
      .select('saldo_atual')
      .eq('design_id', input.designId)
      .single()
    const saldo = (stockRow as any)?.saldo_atual ?? 0
    if (input.quantidade > saldo) {
      return { error: `Saldo insuficiente (${saldo})` }
    }
  }

  const { error } = await (supabase as any)
    .from('stock_movements')
    .insert({
      design_id:   input.designId,
      tipo:        input.tipo,
      quantidade:  input.quantidade,
      show_id:     input.showId,
      observacoes: input.observacoes,
    })

  if (error) return { error: error.message }
  revalidatePath(`/shows/${input.showId}`)
  revalidatePath(`/estoque/${input.designId}`)
  revalidatePath('/estoque')
  return {}
}
