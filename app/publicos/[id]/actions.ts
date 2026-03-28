'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { nichoColor } from '@/lib/nicho-color'

export type NichoFormData = {
  nome: string
  underground_score: number
  // core
  coesao: number | null
  identidade_visual: number | null
  maturidade: number | null
  // defaults
  letramento: number | null
  receptividade_autoral: number | null
  commodificacao: number | null
  energia: number | null
  // corporalidade
  geracao: string[]
  faixa_etaria: string
  estetica: string[]
  cor_dominante: string[]
  // mentalidade
  fator_compra: string[]
  concorrencia_merch: string
  abertura_experimental: number | null
  tipo_nostalgia: string[]
  // texto livre
  descricao: string
  tags: string[]
}

function parseIntOrNull(v: string | null | undefined): number | null {
  if (!v || v.trim() === '' || v === '0') return null
  const n = parseInt(v, 10)
  return isNaN(n) ? null : n
}

function parseArr(v: string | null | undefined): string[] {
  if (!v || v.trim() === '') return []
  return v.split(',').map(s => s.trim()).filter(Boolean)
}

export async function createNicho(formData: FormData): Promise<void> {
  const nome = (formData.get('nome') as string ?? '').trim().toLowerCase()
  if (!nome) throw new Error('nome obrigatório')

  const underground_score = parseInt(formData.get('underground_score') as string ?? '5', 10)
  const cor = nichoColor(nome, underground_score)

  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('nichos')
    .insert({
      nome,
      underground_score,
      cor,
      coesao: parseIntOrNull(formData.get('coesao') as string),
      identidade_visual: parseIntOrNull(formData.get('identidade_visual') as string),
      maturidade: parseIntOrNull(formData.get('maturidade') as string),
      letramento: parseIntOrNull(formData.get('letramento') as string),
      receptividade_autoral: parseIntOrNull(formData.get('receptividade_autoral') as string),
      commodificacao: parseIntOrNull(formData.get('commodificacao') as string),
      energia: parseIntOrNull(formData.get('energia') as string),
      geracao: parseArr(formData.get('geracao') as string),
      faixa_etaria: (formData.get('faixa_etaria') as string ?? '').trim() || null,
      estetica: parseArr(formData.get('estetica') as string),
      cor_dominante: parseArr(formData.get('cor_dominante') as string),
      fator_compra: parseArr(formData.get('fator_compra') as string),
      concorrencia_merch: (formData.get('concorrencia_merch') as string) || null,
      abertura_experimental: parseIntOrNull(formData.get('abertura_experimental') as string),
      tipo_nostalgia: parseArr(formData.get('tipo_nostalgia') as string),
      descricao: (formData.get('descricao') as string ?? '').trim() || null,
      tags: parseArr(formData.get('tags') as string),
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/publicos')
  redirect(`/publicos/${data.id}`)
}

export async function updateNicho(id: string, formData: FormData): Promise<void> {
  const nome = (formData.get('nome') as string ?? '').trim().toLowerCase()
  if (!nome) throw new Error('nome obrigatório')

  const underground_score = parseInt(formData.get('underground_score') as string ?? '5', 10)
  const cor = nichoColor(nome, underground_score)

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('nichos')
    .update({
      nome,
      underground_score,
      cor,
      coesao: parseIntOrNull(formData.get('coesao') as string),
      identidade_visual: parseIntOrNull(formData.get('identidade_visual') as string),
      maturidade: parseIntOrNull(formData.get('maturidade') as string),
      letramento: parseIntOrNull(formData.get('letramento') as string),
      receptividade_autoral: parseIntOrNull(formData.get('receptividade_autoral') as string),
      commodificacao: parseIntOrNull(formData.get('commodificacao') as string),
      energia: parseIntOrNull(formData.get('energia') as string),
      geracao: parseArr(formData.get('geracao') as string),
      faixa_etaria: (formData.get('faixa_etaria') as string ?? '').trim() || null,
      estetica: parseArr(formData.get('estetica') as string),
      cor_dominante: parseArr(formData.get('cor_dominante') as string),
      fator_compra: parseArr(formData.get('fator_compra') as string),
      concorrencia_merch: (formData.get('concorrencia_merch') as string) || null,
      abertura_experimental: parseIntOrNull(formData.get('abertura_experimental') as string),
      tipo_nostalgia: parseArr(formData.get('tipo_nostalgia') as string),
      descricao: (formData.get('descricao') as string ?? '').trim() || null,
      tags: parseArr(formData.get('tags') as string),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/publicos')
  revalidatePath(`/publicos/${id}`)
  redirect(`/publicos/${id}`)
}

export async function addArtistToNicho(nichoId: string, artistId: string, score = 1.0): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('artist_nichos')
    .upsert({ nicho_id: nichoId, artist_id: artistId, score }, { onConflict: 'artist_id,nicho_id' })
  if (error) return { error: error.message }
  revalidatePath(`/publicos/${nichoId}`)
  return {}
}

export async function removeArtistFromNicho(nichoId: string, artistId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('artist_nichos')
    .delete()
    .eq('nicho_id', nichoId)
    .eq('artist_id', artistId)
  if (error) return { error: error.message }
  revalidatePath(`/publicos/${nichoId}`)
  return {}
}

export async function updateArtistNichoScore(nichoId: string, artistId: string, score: number): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('artist_nichos')
    .update({ score })
    .eq('nicho_id', nichoId)
    .eq('artist_id', artistId)
  if (error) return { error: error.message }
  revalidatePath(`/publicos/${nichoId}`)
  return {}
}

export async function deleteNicho(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { count } = await (supabase as any)
    .from('artist_nichos')
    .select('*', { count: 'exact', head: true })
    .eq('nicho_id', id)

  if (count && count > 0) {
    return { error: `nicho vinculado a ${count} artista${count > 1 ? 's' : ''} — desvincule primeiro` }
  }

  const { error } = await (supabase as any)
    .from('nichos')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/publicos')
  redirect('/publicos')
}
