// app/actions/inference_actions.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import {
  calculateSuggestedVolume,
  calcPublicoEstimado,
  type ShowInput,
  type ArtistInput,
  type InferenceResult,
} from '@/lib/inference'
import type { ArtistReadinessInput } from '@/lib/readiness'

// ============================================================
// TIPOS EXPORTADOS
// ============================================================

export type InferencePayload = {
  show_id:                string
  artist_id:              string
  artista:                string
  venue:                  string
  resultado:              InferenceResult
  artist_readiness_input: ArtistReadinessInput
}

export type ActionResult =
  | { ok: true;  data: InferencePayload }
  | { ok: false; error: string }

// ============================================================
// INFERÊNCIA PARA UM SHOW ESPECÍFICO
// ============================================================

export async function getInferenceForShow(showId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // 1. Dados do show
  const { data: show, error: showErr } = await (supabase as any)
    .from('shows')
    .select(`
      id, data, status_ingresso, publico_estimado,
      fiscalizacao, fiscalizacao_score, risco_cancelamento,
      qualidade_concorrencia, clima_estimado, motivo_urgencia, venue_id
    `)
    .eq('id', showId)
    .single()

  if (showErr || !show) {
    return { ok: false, error: showErr?.message ?? 'Show não encontrado' }
  }

  // 2. Venue
  const { data: venue, error: venueErr } = await (supabase as any)
    .from('venues')
    .select('id, nome, capacidade, zona')
    .eq('id', show.venue_id)
    .single()

  if (venueErr || !venue) {
    return { ok: false, error: 'Venue não encontrado' }
  }

  // 3. Artistas via show_artists (headliner primeiro)
  const { data: showArtists, error: saErr } = await (supabase as any)
    .from('show_artists')
    .select('artist_id, billing_order, percentual_publico')
    .eq('show_id', showId)
    .order('billing_order', { ascending: true })

  if (saErr || !showArtists?.length) {
    return { ok: false, error: 'Nenhum artista na lineup' }
  }

  const headlinerRow = [...showArtists].sort((a: any, b: any) => a.billing_order - b.billing_order)[0]

  const { data: artist, error: artistErr } = await (supabase as any)
    .from('artists')
    .select('id, nome, propensao_compra, genero_canonico, zona, primeira_vez_brasil, primeira_vez_brasil_confidence, musicbrainz_id, lastfm_listeners, data_provenance, genre_id')
    .eq('id', headlinerRow.artist_id)
    .single()

  if (artistErr || !artist) {
    return { ok: false, error: 'Artista headliner não encontrado' }
  }

  // 4. Busca multiplicador do genero (query separada)
  let multiplicadorGenero = 1.0
  if (artist.genre_id) {
    const { data: genreRow } = await (supabase as any)
      .from('genres')
      .select('multiplicador_propensao')
      .eq('id', artist.genre_id)
      .single()
    if (genreRow?.multiplicador_propensao) {
      multiplicadorGenero = genreRow.multiplicador_propensao
    }
  }

  const artistInput: ArtistInput = {
    id:                   artist.id,
    nome:                 artist.nome,
    propensao_compra:     artist.propensao_compra ?? 5,
    genero_canonico:      artist.genero_canonico,
    multiplicador_genero: multiplicadorGenero,
    primeira_vez_brasil:  artist.primeira_vez_brasil ?? false,
    zona:                 artist.zona,
  }

  const publico = show.publico_estimado
    ?? calcPublicoEstimado(venue.capacidade, show.status_ingresso)

  const showInput: ShowInput = {
    id:                 show.id,
    data:               show.data,
    status_ingresso:    show.status_ingresso    ?? 'intermediario',
    publico_estimado:   publico,
    fiscalizacao:       show.fiscalizacao       ?? false,
    fiscalizacao_score: show.fiscalizacao_score ?? null,
    risco_cancelamento: show.risco_cancelamento ?? false,
    concorrencia:       show.qualidade_concorrencia ?? 0,
    clima_estimado:     show.clima_estimado     ?? null,
    motivo_urgencia:    show.motivo_urgencia    ?? 'nenhum',
    n_artistas:         showArtists.length,
    headliner:          artistInput,
  }

  console.log('[inference] showInput:', JSON.stringify(showInput, null, 2))
  const resultado = calculateSuggestedVolume(showInput)
  console.log('[inference] resultado:', JSON.stringify(resultado, null, 2))

  const artistReadinessInput: ArtistReadinessInput = {
    propensao_compra:               artist.propensao_compra ?? null,
    genre_id:                       artist.genre_id ?? null,
    zona:                           artist.zona ?? null,
    primeira_vez_brasil:            artist.primeira_vez_brasil ?? null,
    primeira_vez_brasil_confidence: artist.primeira_vez_brasil_confidence ?? null,
    mbid:                           artist.musicbrainz_id ?? null,
    lastfm_listeners:               artist.lastfm_listeners ?? null,
    data_provenance:                artist.data_provenance ?? null,
  }

  return {
    ok: true,
    data: {
      show_id:                show.id,
      artist_id:              artist.id,
      artista:                artist.nome,
      venue:                  venue.nome,
      resultado,
      artist_readiness_input: artistReadinessInput,
    },
  }
}

// ============================================================
// LISTA TODOS OS SHOWS COM SCORE (dashboard / home)
// ============================================================

export async function listShowsWithScores() {
  const supabase = await createClient()

  // Busca shows com venue
  const { data: shows, error } = await (supabase as any)
    .from('shows')
    .select(`
      id, data, status_ingresso, publico_estimado,
      fiscalizacao, fiscalizacao_score, risco_cancelamento,
      qualidade_concorrencia, clima_estimado, motivo_urgencia,
      venues (id, nome, cidade, capacidade, zona)
    `)
    .order('data', { ascending: true })

  if (error) return { ok: false as const, error: error.message }

  // Busca todos os show_artists de uma vez
  const showIds = (shows ?? []).map((s: any) => s.id)
  if (!showIds.length) return { ok: true as const, shows: [] }

  const { data: allSA } = await (supabase as any)
    .from('show_artists')
    .select('show_id, artist_id, billing_order')
    .in('show_id', showIds)
    .order('billing_order', { ascending: true })

  // Agrupa show_artists por show
  const saByShow = new Map<string, any[]>()
  for (const sa of allSA ?? []) {
    if (!saByShow.has(sa.show_id)) saByShow.set(sa.show_id, [])
    saByShow.get(sa.show_id)!.push(sa)
  }

  // Busca artistas headliner únicos
  const headlinerIds = [...new Set(
    (shows ?? []).map((s: any) => {
      const sas = saByShow.get(s.id) ?? []
      return (sas.find((r: any) => r.headliner) ?? sas[0])?.artist_id
    }).filter(Boolean)
  )]

  const { data: artists } = await (supabase as any)
    .from('artists')
    .select(`
      id, nome, propensao_compra, genero_canonico, zona, primeira_vez_brasil,
      genres:genre_id (multiplicador_propensao)
    `)
    .in('id', headlinerIds)

  const artistMap = new Map<string, any>()
  for (const a of artists ?? []) artistMap.set(a.id, a)

  // Calcula score para cada show
  const resultado = (shows ?? []).flatMap((row: any) => {
    const venue    = Array.isArray(row.venues) ? row.venues[0] : row.venues
    const sas      = saByShow.get(row.id) ?? []
    if (!venue || !sas.length) return []

    const hlRow    = [...sas].sort((a: any, b: any) => a.billing_order - b.billing_order)[0]
    const artist   = artistMap.get(hlRow?.artist_id)
    if (!artist) return []

    const artistInput: ArtistInput = {
      id:                   artist.id,
      nome:                 artist.nome,
      propensao_compra:     artist.propensao_compra ?? 5,
      genero_canonico:      artist.genero_canonico,
      multiplicador_genero: artist.genres?.multiplicador_propensao ?? 1.0,
      primeira_vez_brasil:  artist.primeira_vez_brasil ?? false,
      zona:                 artist.zona,
    }

    const publico = row.publico_estimado
      ?? calcPublicoEstimado(venue.capacidade, row.status_ingresso)

    const showInput: ShowInput = {
      id:                 row.id,
      data:               row.data,
      status_ingresso:    row.status_ingresso    ?? 'intermediario',
      publico_estimado:   publico,
      fiscalizacao:       row.fiscalizacao       ?? false,
      fiscalizacao_score: row.fiscalizacao_score ?? null,
      risco_cancelamento: row.risco_cancelamento ?? false,
      concorrencia:       row.qualidade_concorrencia ?? 0,
      clima_estimado:     row.clima_estimado     ?? null,
      motivo_urgencia:    row.motivo_urgencia    ?? 'nenhum',
      n_artistas:         sas.length,
      headliner:          artistInput,
    }

    const { score_viabilidade, go_no_go, quantidade_sugerida } =
      calculateSuggestedVolume(showInput)

    return [{
      id:          row.id,
      artista:     artist.nome,
      venue:       venue.nome,
      cidade:      venue.cidade,
      data:        row.data,
      score:       score_viabilidade,
      go_no_go,
      total_pecas: quantidade_sugerida,
    }]
  })

  return { ok: true as const, shows: resultado }
}