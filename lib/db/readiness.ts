// Adicionar em lib/db/artists.ts
// (ou criar lib/db/readiness.ts se preferir separado)

import { createClient } from '@/utils/supabase/server'
import {
  calculateReadinessScore,
  calcUrgencia,
  type ArtistReadinessInput,
  type ArtistUrgency,
} from '@/lib/readiness'

// ============================================================
// ARTISTAS COM SHOWS FUTUROS ORDENADOS POR URGÊNCIA
// ============================================================

export async function getArtistsWithUrgency(): Promise<ArtistUrgency[]> {
  const supabase = await createClient()
  const hoje = new Date().toISOString().split('T')[0]

  // Artistas com shows futuros não realizados
  const { data, error } = await (supabase as any)
    .from('show_artists')
    .select(`
      artist_id,
      billing_order,
      shows!inner (
        id,
        data,
        resultado_geral
      ),
      artists!inner (
        id,
        nome,
        propensao_compra,
        genre_id,
        zona,
        primeira_vez_brasil,
        primeira_vez_brasil_confidence,
        mbid,
        lastfm_listeners,
        data_provenance
      )
    `)
    .gte('shows.data', hoje)
    .is('shows.resultado_geral', null)
    .order('shows.data', { ascending: true })

  if (error || !data) return []

  const seen = new Set<string>()

  return (data as any[])
    .filter((row: any) => {
      // Um artista pode aparecer em múltiplos shows — pega o mais próximo
      if (seen.has(row.artist_id)) return false
      seen.add(row.artist_id)
      return true
    })
    .map((row: any) => {
      const artist  = row.artists
      const show    = Array.isArray(row.shows) ? row.shows[0] : row.shows
      const diasAteShow = Math.max(
        0,
        Math.floor((new Date(show.data).getTime() - Date.now()) / 86400000)
      )

      const input: ArtistReadinessInput = {
        propensao_compra:               artist.propensao_compra,
        genre_id:                       artist.genre_id,
        zona:                           artist.zona,
        primeira_vez_brasil:            artist.primeira_vez_brasil,
        primeira_vez_brasil_confidence: artist.primeira_vez_brasil_confidence,
        mbid:                           artist.mbid,
        lastfm_listeners:               artist.lastfm_listeners,
        data_provenance:                artist.data_provenance,
      }

      const readiness = calculateReadinessScore(input)

      return {
        artist_id:     artist.id,
        nome:          artist.nome,
        score:         readiness.score,
        dias_ate_show: diasAteShow,
        show_id:       show.id,
        show_data:     show.data,
        urgencia:      calcUrgencia(readiness.score, diasAteShow),
        blockers:      readiness.blockers.map((b: any) => b.label),
      }
    })
    .sort((a, b) => b.urgencia - a.urgencia)
}

// ============================================================
// READINESS DE UM ARTISTA ESPECÍFICO (para página do artista)
// ============================================================

export async function getArtistReadiness(artistId: string) {
  const supabase = await createClient()

  const { data: artist, error } = await (supabase as any)
    .from('artists')
    .select(`
      id, nome, propensao_compra, genre_id, zona,
      primeira_vez_brasil, primeira_vez_brasil_confidence,
      mbid, lastfm_listeners, data_provenance
    `)
    .eq('id', artistId)
    .single()

  if (error || !artist) return null

  return calculateReadinessScore(artist as ArtistReadinessInput)
}

// ============================================================
// UPDATE PROVENANCE (quando alguém edita um campo manualmente)
// ============================================================

export async function updateProvenance(
  artistId: string,
  campo: string,
  source: string
) {
  const supabase = await createClient()
  const now = new Date().toISOString()

  // Usa jsonb_set para atualizar só o campo específico
  const { error } = await (supabase as any).rpc('update_artist_provenance', {
    p_artist_id: artistId,
    p_campo:     campo,
    p_source:    source,
    p_updated_at: now,
  })

  return { ok: !error, error: error?.message }
}