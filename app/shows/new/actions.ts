'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { isShowPast } from '@/lib/show-utils'

export type DateEntry = {
  data: string
  artistas: { artist_id: string; ordem: number; faz_estampa: boolean }[]
}

export type CreateShowInput = {
  nome_evento:       string | null
  venue_id:          string | null
  venue_nome_novo:   string | null
  venue_cidade_novo: string | null
  status_ingresso:   string | null
  concorrencia:      string | null
  source_url:        string | null
  observacoes:       string | null
  dates:             DateEntry[]
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

  // 2. Criar um show por date entry
  const createdIds: string[] = []

  for (const entry of input.dates) {
    const participou = isShowPast(entry.data)

    const { data: show, error: showErr } = await supabase
      .from('shows')
      .insert({
        nome_evento:     input.nome_evento || null,
        data:            entry.data,
        venue_id:        venueId,
        status_ingresso: input.status_ingresso || null,
        concorrencia:    input.concorrencia || null,
        source_url:      input.source_url || null,
        observacoes:     input.observacoes || null,
        participou,
      } as any)
      .select('id')
      .single()

    if (showErr || !show) throw new Error(showErr?.message ?? 'Erro ao criar show')
    const showId = (show as any).id as string
    createdIds.push(showId)

    // 3. Inserir show_artists
    if (entry.artistas.length > 0) {
      const saRows = entry.artistas.map(a => ({
        show_id:     showId,
        artist_id:   a.artist_id,
        ordem:       a.ordem,
        faz_estampa: a.faz_estampa,
      }))
      const { error: saErr } = await supabase
        .from('show_artists')
        .insert(saRows as any)
      if (saErr) console.error('[show_artists insert]', saErr)
    }
  }

  redirect(`/shows/${createdIds[0]}`)
}

export async function searchVenues(q: string): Promise<{ id: string; nome: string; cidade: string }[]> {
  if (!q || q.length < 2) return []
  const supabase = await createClient()
  const { data } = await (supabase as any).rpc('search_venues', { search_term: q })
  return ((data ?? []) as any[]).map(v => ({ id: v.id, nome: v.nome, cidade: v.cidade }))
}
