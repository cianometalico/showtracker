import { createClient } from '@/utils/supabase/server'

export type ArtistaDuplicado = {
  nome_lower: string
  count: number
  ids: string[]
  nomes: string[]
}

export type ArtistaSemMbid = {
  id: string
  nome: string
  pais: string | null
}

export type ArtistaSemListeners = {
  id: string
  nome: string
  mbid: string
}

export type ArtistaOrfao = {
  id: string
  nome: string
  mbid: string | null
}

export type ShowSemResultado = {
  id: string
  data: string
  nome_evento: string | null
  venue_nome: string | null
}

export type VenueSemSubprefeitura = {
  id: string
  nome: string
  cidade: string | null
}

export async function getArtistsDuplicados(): Promise<{ data: ArtistaDuplicado[]; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await (supabase as any).rpc('get_artists_duplicados')
  if (error) {
    // fallback: query manual se RPC não existir
    const { data: rows, error: err2 } = await (supabase as any)
      .from('artists')
      .select('id, nome')
    if (err2) return { data: [], error: err2.message }

    const groups: Record<string, { ids: string[]; nomes: string[] }> = {}
    for (const r of (rows ?? [])) {
      const key = r.nome.toLowerCase().trim()
      if (!groups[key]) groups[key] = { ids: [], nomes: [] }
      groups[key].ids.push(r.id)
      groups[key].nomes.push(r.nome)
    }
    const result = Object.entries(groups)
      .filter(([, v]) => v.ids.length > 1)
      .map(([nome_lower, v]) => ({ nome_lower, count: v.ids.length, ids: v.ids, nomes: v.nomes }))
    return { data: result, error: null }
  }
  return { data: data ?? [], error: null }
}

export async function getArtistsSemMbid(): Promise<{ data: ArtistaSemMbid[]; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('artists')
    .select('id, nome, pais')
    .is('mbid', null)
    .order('nome')
  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

export async function getArtistsSemListeners(): Promise<{ data: ArtistaSemListeners[]; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('artists')
    .select('id, nome, mbid')
    .not('mbid', 'is', null)
    .or('lastfm_listeners.is.null,lastfm_listeners.eq.0')
    .order('nome')
  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

export async function getArtistasOrfaos(): Promise<{ data: ArtistaOrfao[]; error: string | null }> {
  const supabase = await createClient()
  // Busca todos os artist_ids com show_artists e filtra do lado cliente
  // (Supabase JS não suporta LEFT JOIN diretamente — usamos not in)
  const { data: withShows, error: e1 } = await (supabase as any)
    .from('show_artists')
    .select('artist_id')
  if (e1) return { data: [], error: e1.message }

  const usedIds = [...new Set((withShows ?? []).map((r: any) => r.artist_id))] as string[]

  const query = (supabase as any).from('artists').select('id, nome, mbid').order('nome')
  if (usedIds.length > 0) query.not('id', 'in', `(${usedIds.join(',')})`)

  const { data, error } = await query
  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

export async function getShowsSemResultado(): Promise<{ data: ShowSemResultado[]; error: string | null }> {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await (supabase as any)
    .from('shows')
    .select('id, data, nome_evento, venues(nome)')
    .eq('participou', true)
    .lt('data', today)
    .is('resultado_geral', null)
    .order('data', { ascending: false })
  if (error) return { data: [], error: error.message }
  const mapped = (data ?? []).map((s: any) => ({
    id: s.id,
    data: s.data,
    nome_evento: s.nome_evento,
    venue_nome: s.venues?.nome ?? null,
  }))
  return { data: mapped, error: null }
}

export async function getVenuesSemSubprefeitura(): Promise<{ data: VenueSemSubprefeitura[]; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('venues')
    .select('id, nome, cidade')
    .is('subprefeitura_id', null)
    .order('nome')
  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}
