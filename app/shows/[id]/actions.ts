'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export type UpdateShowInput = {
  nome_evento:     string | null
  data:            string
  venue_id:        string | null
  status_ingresso: string | null
  concorrencia:    string | null
  clima_estimado:  string | null
  resultado_geral: string | null
  participou:      boolean
  observacoes:     string | null
}

export async function updateShow(id: string, input: UpdateShowInput): Promise<void> {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('shows')
    .update({
      nome_evento:     input.nome_evento || null,
      data:            input.data,
      venue_id:        input.venue_id,
      status_ingresso: input.status_ingresso,
      concorrencia:    input.concorrencia,
      clima_estimado:  input.clima_estimado || null,
      resultado_geral: input.resultado_geral || null,
      participou:      input.participou,
      observacoes:     input.observacoes || null,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  redirect(`/shows/${id}`)
}

export async function deleteShow(id: string): Promise<void> {
  const supabase = await createClient()
  await (supabase as any).from('show_artists').delete().eq('show_id', id)
  const { error } = await (supabase as any).from('shows').delete().eq('id', id)
  if (error) throw new Error(error.message)
  redirect('/shows')
}

export async function addArtistToShow(showId: string, artistId: string, ordem: number): Promise<void> {
  const supabase = await createClient()
  await (supabase as any)
    .from('show_artists')
    .upsert({ show_id: showId, artist_id: artistId, ordem, faz_estampa: false }, { onConflict: 'show_id,artist_id' })
}

export async function removeArtistFromShow(showId: string, artistId: string): Promise<void> {
  const supabase = await createClient()
  await (supabase as any)
    .from('show_artists')
    .delete()
    .eq('show_id', showId)
    .eq('artist_id', artistId)
}

export async function reorderArtist(showId: string, artistId: string, novaOrdem: number): Promise<void> {
  const supabase = await createClient()
  await (supabase as any)
    .from('show_artists')
    .update({ ordem: novaOrdem })
    .eq('show_id', showId)
    .eq('artist_id', artistId)
}

export async function searchArtists(q: string): Promise<{ id: string; nome: string }[]> {
  if (!q || q.length < 2) return []
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('artists')
    .select('id, nome')
    .ilike('nome', `%${q}%`)
    .limit(8)
  return (data ?? []).map((a: any) => ({ id: a.id, nome: a.nome }))
}

export async function searchVenues(q: string): Promise<{ id: string; nome: string; cidade: string }[]> {
  if (!q || q.length < 2) return []
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('venues')
    .select('id, nome, cidade')
    .ilike('nome', `%${q}%`)
    .limit(6)
  return (data ?? []).map((v: any) => ({ id: v.id, nome: v.nome, cidade: v.cidade }))
}