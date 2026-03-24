'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export type CreateShowInput = {
  nome_evento:         string | null
  data:                string
  venue_id:            string | null
  venue_nome_novo:     string | null
  venue_cidade_novo:   string | null
  status_ingresso:     string
  participou:          boolean
  artista_ids:         string[]
  artista_nomes_novos: string[]
}

export async function createShow(input: CreateShowInput): Promise<void> {
  const supabase = await createClient()

  // 1. Criar venue se necessário
  let venueId = input.venue_id
  if (!venueId && input.venue_nome_novo) {
    const { data: v, error } = await supabase
      .from('venues')
      .insert({ nome: input.venue_nome_novo, cidade: input.venue_cidade_novo ?? 'São Paulo' } as any)
      .select('id')
      .single()
    if (error || !v) throw new Error(error?.message ?? 'Erro ao criar venue')
    venueId = (v as any).id
  }

  // 2. Criar show
  const { data: show, error: showErr } = await supabase
    .from('shows')
    .insert({
      nome_evento:     input.nome_evento || null,
      data:            input.data,
      venue_id:        venueId,
      status_ingresso: input.status_ingresso as any,
      participou: input.participou,
    } as any)
    .select('id')
    .single()

  if (showErr || !show) throw new Error(showErr?.message ?? 'Erro ao criar show')
  const showId = (show as any).id as string

  // 3. Criar artistas novos e coletar IDs
  const artistIds = [...input.artista_ids]
  for (const nome of input.artista_nomes_novos) {
    if (!nome.trim()) continue
    // verifica se já existe por nome exato (case insensitive)
    const { data: existing } = await supabase
      .from('artists')
      .select('id')
      .ilike('nome', nome.trim())
      .maybeSingle()

    if (existing) {
      artistIds.push((existing as any).id)
    } else {
      const { data: newA, error: aErr } = await supabase
        .from('artists')
        .insert({ nome: nome.trim() } as any)
        .select('id')
        .single()
      if (!aErr && newA) artistIds.push((newA as any).id)
    }
  }

  // 4. Inserir show_artists com ordem
  if (artistIds.length > 0) {
    const saRows = artistIds.map((id, i) => ({
      show_id:     showId,
      artist_id:   id,
      ordem:       i + 1,
      faz_estampa: false,
    }))
    const { error: saErr } = await supabase
      .from('show_artists')
      .insert(saRows as any)
    if (saErr) console.error('[show_artists insert]', saErr)
  }

  redirect(`/shows/${showId}`)
}

export async function searchArtists(q: string): Promise<{ id: string; nome: string }[]> {
  if (!q || q.length < 2) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('artists')
    .select('id, nome')
    .ilike('nome', `%${q}%`)
    .limit(8)
  return ((data ?? []) as any[]).map(a => ({ id: a.id, nome: a.nome }))
}

export async function searchVenues(q: string): Promise<{ id: string; nome: string; cidade: string }[]> {
  if (!q || q.length < 2) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('venues')
    .select('id, nome, cidade')
    .ilike('nome', `%${q}%`)
    .limit(6)
  return ((data ?? []) as any[]).map(v => ({ id: v.id, nome: v.nome, cidade: v.cidade }))
}