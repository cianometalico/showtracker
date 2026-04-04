import { createClient } from '@/utils/supabase/server'

// ── Types ──────────────────────────────────────────────────────

export type NichoDerived = {
  id: string
  nome: string
  underground_score: number | null
  score_medio: number
}

export type ResultadoDistribution = {
  sucesso_total: number
  sucesso: number
  medio: number
  fracasso: number
}

export type NichoResultado = {
  id: string
  nome: string
  total_shows: number
  distribuicao: ResultadoDistribution
  /** 4=sucesso_total, 3=sucesso, 2=medio, 1=fracasso — média ponderada para ordenação */
  score_medio: number
}

export type VenueResultado = {
  id: string
  nome: string
  cidade: string
  total_shows: number
  distribuicao: ResultadoDistribution
  score_medio: number
}

export type ProximoShow = {
  id: string
  data: string
  nome_evento: string | null
  venue_nome: string | null
  venue_cidade: string | null
  artistas: string[]
}

export type NichoByVenue = {
  id: string
  nome: string
  underground_score: number | null
  ocorrencias: number
}

export type NichoSugestao = {
  id: string
  nome: string
  underground_score: number | null
  tags_em_comum: string[]
  score_match: number
}

// ── Helpers internos ──────────────────────────────────────────

function emptyDist(): ResultadoDistribution {
  return { sucesso_total: 0, sucesso: 0, medio: 0, fracasso: 0 }
}

function addResultado(dist: ResultadoDistribution, r: string): void {
  if (r === 'sucesso_total')   dist.sucesso_total++
  else if (r === 'sucesso')    dist.sucesso++
  else if (r === 'medio')      dist.medio++
  else if (r === 'fracasso')   dist.fracasso++
}

function scoreMedio(dist: ResultadoDistribution, total: number): number {
  if (total === 0) return 0
  return (dist.sucesso_total * 4 + dist.sucesso * 3 + dist.medio * 2 + dist.fracasso * 1) / total
}

function toStringArray(json: unknown): string[] {
  if (!Array.isArray(json)) return []
  return json.filter((t): t is string => typeof t === 'string')
}

// ── Query 1 — Nichos derivados de um show ─────────────────────

/**
 * Dado um show, retorna os nichos derivados dos seus artistas
 * com o score médio dos vínculos artist_nichos.
 * Deduplicado: mesmo nicho compartilhado por vários artistas
 * retorna uma entrada com score médio.
 */
export async function getNichosDerivedFromShow(showId: string): Promise<NichoDerived[]> {
  const supabase = await createClient()

  // 1 — artistas do show
  const { data: saRows, error: e1 } = await (supabase as any)
    .from('show_artists')
    .select('artist_id')
    .eq('show_id', showId)
  if (e1 || !saRows?.length) return []

  const artistIds: string[] = saRows.map((r: any) => r.artist_id)

  // 2 — vínculos artista↔nicho para esses artistas
  const { data: anRows, error: e2 } = await (supabase as any)
    .from('artist_nichos')
    .select('nicho_id, score')
    .in('artist_id', artistIds)
  if (e2 || !anRows?.length) return []

  // 3 — acumula scores por nicho
  const scoreAccum = new Map<string, number[]>()
  for (const an of anRows as { nicho_id: string; score: number | null }[]) {
    if (!scoreAccum.has(an.nicho_id)) scoreAccum.set(an.nicho_id, [])
    if (an.score != null) scoreAccum.get(an.nicho_id)!.push(an.score)
  }

  const nichoIds = [...scoreAccum.keys()]

  // 4 — detalhes dos nichos
  const { data: nichoRows, error: e3 } = await (supabase as any)
    .from('nichos')
    .select('id, nome, underground_score')
    .in('id', nichoIds)
  if (e3 || !nichoRows?.length) return []

  const result: NichoDerived[] = (nichoRows as any[]).map((n: any) => {
    const scores = scoreAccum.get(n.id) ?? []
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    return {
      id:                n.id,
      nome:              n.nome,
      underground_score: n.underground_score ?? null,
      score_medio:       avg,
    }
  })

  return result.sort((a, b) => b.score_medio - a.score_medio)
}

// ── Query 2 — Resultado médio por nicho ───────────────────────

/**
 * Para cada nicho, distribui os resultados dos shows
 * onde artistas vinculados participaram.
 * Deduplicado: cada (nicho, show) conta uma vez mesmo que
 * múltiplos artistas do show compartilhem o nicho.
 */
export async function getResultadoMedioByNicho(): Promise<NichoResultado[]> {
  const supabase = await createClient()

  // 1 — shows com resultado e participação confirmada
  const { data: showRows, error: e1 } = await (supabase as any)
    .from('shows')
    .select('id, resultado_geral')
    .eq('participou', true)
    .not('resultado_geral', 'is', null)
  if (e1 || !showRows?.length) return []

  const showIds: string[] = showRows.map((s: any) => s.id)
  const resultadoByShow = new Map<string, string>(
    (showRows as { id: string; resultado_geral: string }[])
      .map(s => [s.id, s.resultado_geral])
  )

  // 2 — artistas dos shows
  const { data: saRows, error: e2 } = await (supabase as any)
    .from('show_artists')
    .select('show_id, artist_id')
    .in('show_id', showIds)
  if (e2 || !saRows?.length) return []

  const artistIds: string[] = [...new Set((saRows as any[]).map((r: any) => r.artist_id))]

  // 3 — vínculos artista↔nicho
  const { data: anRows, error: e3 } = await (supabase as any)
    .from('artist_nichos')
    .select('artist_id, nicho_id')
    .in('artist_id', artistIds)
  if (e3 || !anRows?.length) return []

  // Mapa artist_id → nicho_ids[]
  const artistToNichos = new Map<string, string[]>()
  for (const an of anRows as { artist_id: string; nicho_id: string }[]) {
    if (!artistToNichos.has(an.artist_id)) artistToNichos.set(an.artist_id, [])
    artistToNichos.get(an.artist_id)!.push(an.nicho_id)
  }

  // 4 — pares (nicho_id, show_id) únicos + resultado
  const nichoShowPairs = new Map<string, Map<string, string>>() // nicho_id → Map<show_id, resultado>
  for (const sa of saRows as { show_id: string; artist_id: string }[]) {
    const nichos = artistToNichos.get(sa.artist_id) ?? []
    const resultado = resultadoByShow.get(sa.show_id)
    if (!resultado) continue
    for (const nichoId of nichos) {
      if (!nichoShowPairs.has(nichoId)) nichoShowPairs.set(nichoId, new Map())
      nichoShowPairs.get(nichoId)!.set(sa.show_id, resultado)
    }
  }

  if (nichoShowPairs.size === 0) return []

  // 5 — detalhes dos nichos
  const nichoIds = [...nichoShowPairs.keys()]
  const { data: nichoRows, error: e4 } = await (supabase as any)
    .from('nichos')
    .select('id, nome')
    .in('id', nichoIds)
  if (e4 || !nichoRows?.length) return []

  const result: NichoResultado[] = (nichoRows as { id: string; nome: string }[]).map(n => {
    const showMap = nichoShowPairs.get(n.id)!
    const dist = emptyDist()
    for (const r of showMap.values()) addResultado(dist, r)
    const total = showMap.size
    return {
      id:           n.id,
      nome:         n.nome,
      total_shows:  total,
      distribuicao: dist,
      score_medio:  scoreMedio(dist, total),
    }
  })

  return result.sort((a, b) => b.score_medio - a.score_medio)
}

// ── Query 3 — Resultado médio por venue ───────────────────────

/**
 * Para cada venue, distribui os resultados dos shows
 * participados com resultado_geral não-nulo.
 */
export async function getResultadoMedioByVenue(): Promise<VenueResultado[]> {
  const supabase = await createClient()

  // 1 — shows com resultado e participação confirmada + venue
  const { data: showRows, error: e1 } = await (supabase as any)
    .from('shows')
    .select('id, resultado_geral, venue_id')
    .eq('participou', true)
    .not('resultado_geral', 'is', null)
    .not('venue_id', 'is', null)
  if (e1 || !showRows?.length) return []

  // 2 — agrupa por venue
  const venueAccum = new Map<string, { dist: ResultadoDistribution; showIds: Set<string> }>()
  for (const s of showRows as { id: string; resultado_geral: string; venue_id: string }[]) {
    if (!venueAccum.has(s.venue_id)) {
      venueAccum.set(s.venue_id, { dist: emptyDist(), showIds: new Set() })
    }
    const acc = venueAccum.get(s.venue_id)!
    if (!acc.showIds.has(s.id)) {
      acc.showIds.add(s.id)
      addResultado(acc.dist, s.resultado_geral)
    }
  }

  // 3 — detalhes dos venues
  const venueIds = [...venueAccum.keys()]
  const { data: venueRows, error: e2 } = await (supabase as any)
    .from('venues')
    .select('id, nome, cidade')
    .in('id', venueIds)
    .order('nome')
  if (e2 || !venueRows?.length) return []

  const result: VenueResultado[] = (venueRows as { id: string; nome: string; cidade: string }[])
    .map(v => {
      const acc = venueAccum.get(v.id)!
      const total = acc.showIds.size
      return {
        id:           v.id,
        nome:         v.nome,
        cidade:       v.cidade,
        total_shows:  total,
        distribuicao: acc.dist,
        score_medio:  scoreMedio(acc.dist, total),
      }
    })

  return result
}

// ── Query 4 — Próximos shows por nicho ────────────────────────

/**
 * Retorna shows futuros (data >= hoje) cujos artistas estão
 * vinculados ao nicho informado.
 */
export async function getProximosShowsByNicho(nichoId: string): Promise<ProximoShow[]> {
  const supabase = await createClient()

  // 1 — artistas vinculados ao nicho
  const { data: anRows, error: e1 } = await (supabase as any)
    .from('artist_nichos')
    .select('artist_id')
    .eq('nicho_id', nichoId)
  if (e1 || !anRows?.length) return []

  const artistIds: string[] = anRows.map((r: any) => r.artist_id)

  // 2 — shows futuros onde esses artistas aparecem
  const { data: saRows, error: e2 } = await (supabase as any)
    .from('show_artists')
    .select('show_id, artist_id')
    .in('artist_id', artistIds)
  if (e2 || !saRows?.length) return []

  const showIds: string[] = [...new Set((saRows as any[]).map((r: any) => r.show_id))]

  const today = new Date().toISOString().split('T')[0]

  const { data: showRows, error: e3 } = await (supabase as any)
    .from('shows')
    .select('id, data, nome_evento, venues(nome, cidade)')
    .in('id', showIds)
    .gte('data', today)
    .order('data', { ascending: true })
  if (e3 || !showRows?.length) return []

  const futureShowIds: string[] = (showRows as any[]).map((s: any) => s.id)

  // 3 — todos os artistas (com nomes) desses shows futuros
  const { data: allSaRows, error: e4 } = await (supabase as any)
    .from('show_artists')
    .select('show_id, ordem, artists(nome)')
    .in('show_id', futureShowIds)
  if (e4) return []

  // Mapa show_id → artistas ordenados
  const artistsByShow = new Map<string, { ordem: number; nome: string }[]>()
  for (const sa of (allSaRows ?? []) as { show_id: string; ordem: number; artists: { nome: string } | { nome: string }[] }[]) {
    const nome = Array.isArray(sa.artists) ? sa.artists[0]?.nome : (sa.artists as any)?.nome
    if (!nome) continue
    if (!artistsByShow.has(sa.show_id)) artistsByShow.set(sa.show_id, [])
    artistsByShow.get(sa.show_id)!.push({ ordem: sa.ordem, nome })
  }

  return (showRows as any[]).map((s: any) => {
    const v = Array.isArray(s.venues) ? s.venues[0] : s.venues
    const artistas = (artistsByShow.get(s.id) ?? [])
      .sort((a, b) => a.ordem - b.ordem)
      .map(a => a.nome)
    return {
      id:           s.id,
      data:         s.data,
      nome_evento:  s.nome_evento ?? null,
      venue_nome:   v?.nome ?? null,
      venue_cidade: v?.cidade ?? null,
      artistas,
    }
  })
}

// ── Query 5 — Nichos frequentes por venue ─────────────────────

/**
 * Para um venue, retorna os nichos mais frequentes nos seus shows.
 * Conta ocorrências por show (deduplicado): mesmo nicho com
 * vários artistas num show conta como 1 ocorrência.
 */
export async function getNichosByVenue(venueId: string): Promise<NichoByVenue[]> {
  const supabase = await createClient()

  // 1 — shows do venue
  const { data: showRows, error: e1 } = await (supabase as any)
    .from('shows')
    .select('id')
    .eq('venue_id', venueId)
  if (e1 || !showRows?.length) return []

  const showIds: string[] = showRows.map((r: any) => r.id)

  // 2 — artistas dos shows
  const { data: saRows, error: e2 } = await (supabase as any)
    .from('show_artists')
    .select('show_id, artist_id')
    .in('show_id', showIds)
  if (e2 || !saRows?.length) return []

  const artistIds: string[] = [...new Set((saRows as any[]).map((r: any) => r.artist_id))]

  // Mapa artist_id → show_ids
  const artistToShows = new Map<string, Set<string>>()
  for (const sa of saRows as { show_id: string; artist_id: string }[]) {
    if (!artistToShows.has(sa.artist_id)) artistToShows.set(sa.artist_id, new Set())
    artistToShows.get(sa.artist_id)!.add(sa.show_id)
  }

  // 3 — vínculos artista↔nicho
  const { data: anRows, error: e3 } = await (supabase as any)
    .from('artist_nichos')
    .select('artist_id, nicho_id')
    .in('artist_id', artistIds)
  if (e3 || !anRows?.length) return []

  // Conta pares (nicho_id, show_id) únicos
  const nichoShowSets = new Map<string, Set<string>>()
  for (const an of anRows as { artist_id: string; nicho_id: string }[]) {
    const shows = artistToShows.get(an.artist_id)
    if (!shows) continue
    if (!nichoShowSets.has(an.nicho_id)) nichoShowSets.set(an.nicho_id, new Set())
    for (const sid of shows) nichoShowSets.get(an.nicho_id)!.add(sid)
  }

  if (nichoShowSets.size === 0) return []

  // 4 — detalhes dos nichos
  const nichoIds = [...nichoShowSets.keys()]
  const { data: nichoRows, error: e4 } = await (supabase as any)
    .from('nichos')
    .select('id, nome, underground_score')
    .in('id', nichoIds)
  if (e4 || !nichoRows?.length) return []

  const result: NichoByVenue[] = (nichoRows as { id: string; nome: string; underground_score: number | null }[])
    .map(n => ({
      id:                n.id,
      nome:              n.nome,
      underground_score: n.underground_score ?? null,
      ocorrencias:       nichoShowSets.get(n.id)!.size,
    }))

  return result.sort((a, b) => b.ocorrencias - a.ocorrencias)
}

// ── Query 6 — Sugestão de nicho por tags do artista ───────────

/**
 * Compara tags_editorial do artista contra nicho.tags de todos
 * os nichos. Retorna nichos com interseção não-vazia, ordenados
 * por número de matches.
 *
 * Retorna [] se o artista já tem algum nicho vinculado.
 * Usa apenas nicho.tags — nunca nicho.descritores.
 */
export async function getSugestaoNichoByArtist(artistId: string): Promise<NichoSugestao[]> {
  const supabase = await createClient()

  // 1 — verificar se artista já tem nicho vinculado
  const { data: existing, error: e1 } = await (supabase as any)
    .from('artist_nichos')
    .select('nicho_id')
    .eq('artist_id', artistId)
    .limit(1)
  if (e1) return []
  if (existing && existing.length > 0) return []

  // 2 — tags do artista
  const { data: artistRow, error: e2 } = await (supabase as any)
    .from('artists')
    .select('tags_editorial')
    .eq('id', artistId)
    .single()
  if (e2 || !artistRow) return []

  const artistTags = toStringArray(artistRow.tags_editorial)
  if (artistTags.length === 0) return []

  const artistTagSet = new Set(artistTags.map((t: string) => t.toLowerCase()))

  // 3 — todos os nichos com suas tags
  const { data: nichoRows, error: e3 } = await (supabase as any)
    .from('nichos')
    .select('id, nome, underground_score, tags')
  if (e3 || !nichoRows?.length) return []

  // 4 — calcular interseção
  const result: NichoSugestao[] = []
  for (const n of nichoRows as { id: string; nome: string; underground_score: number | null; tags: unknown }[]) {
    const nichoTags = toStringArray(n.tags)
    const comuns = nichoTags.filter(t => artistTagSet.has(t.toLowerCase()))
    if (comuns.length === 0) continue
    result.push({
      id:                n.id,
      nome:              n.nome,
      underground_score: n.underground_score ?? null,
      tags_em_comum:     comuns,
      score_match:       comuns.length,
    })
  }

  return result.sort((a, b) => b.score_match - a.score_match)
}
