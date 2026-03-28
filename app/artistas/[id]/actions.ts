'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateArtist(id: string, data: { nome: string; pais: string | null }): Promise<void> {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('artists')
    .update({ nome: data.nome.trim(), pais: data.pais?.trim() || null })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/artistas/${id}`)
  revalidatePath('/artistas')
}

export async function deleteArtist(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { count: showCount } = await (supabase as any)
    .from('show_artists')
    .select('*', { count: 'exact', head: true })
    .eq('artist_id', id)

  if (showCount && showCount > 0) {
    return { error: `artista vinculado a ${showCount} show${showCount > 1 ? 's' : ''} — remova dos shows primeiro` }
  }

  const { count: designCount } = await (supabase as any)
    .from('designs')
    .select('*', { count: 'exact', head: true })
    .eq('artist_id', id)

  if (designCount && designCount > 0) {
    return { error: `artista tem ${designCount} design${designCount > 1 ? 's' : ''} vinculado${designCount > 1 ? 's' : ''}` }
  }

  const { error } = await (supabase as any)
    .from('artists')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  redirect('/artistas')
}

export async function updateArtistOverrides(id: string, data: {
  letramento: number | null
  receptividade_autoral: number | null
  commodificacao: number | null
  energia: number | null
  abertura_experimental: number | null
  geracao_override: string[] | null
  estetica_override: string[] | null
  cor_dominante_override: string[] | null
  tipo_nostalgia_override: string[] | null
}): Promise<void> {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('artists')
    .update(data)
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/artistas/${id}`)
}

export async function linkNicho(artistId: string, nichoId: string): Promise<void> {
  const supabase = await createClient()
  await (supabase as any)
    .from('artist_nichos')
    .upsert({ artist_id: artistId, nicho_id: nichoId, score: 1.0 }, { onConflict: 'artist_id,nicho_id' })
  revalidatePath(`/artistas/${artistId}`)
}

export async function unlinkNicho(artistId: string, nichoId: string): Promise<void> {
  const supabase = await createClient()
  await (supabase as any)
    .from('artist_nichos')
    .delete()
    .eq('artist_id', artistId)
    .eq('nicho_id', nichoId)
  revalidatePath(`/artistas/${artistId}`)
}