import { createClient } from '@/utils/supabase/server'
import { getShowDisplayName } from '@/lib/show-utils'
import { HomeBriefingClient } from './home-briefing-client'

// ── Constants ──────────────────────────────────────────────────

const CLIMA_ICONE: Record<string, string> = {
  sol: '☀', nublado: '☁', chuva: '🌧', frio: '🥶', tempestade: '🌩',
}

const RESULTADO_ORDER: Record<string, number> = {
  sucesso_total: 4, sucesso: 3, medio: 2, fracasso: 1,
}

// ── Page ───────────────────────────────────────────────────────

export default async function HomePage() {
  const hoje    = new Date()
  const hojeStr = hoje.toISOString().slice(0, 10)

  const mesAno = hoje.getFullYear()
  const mesMes = hoje.getMonth() + 1
  const mesStr = `${mesAno}-${String(mesMes).padStart(2, '0')}`
  const primeiroDia = `${mesStr}-01`
  const ultimoDia   = `${mesAno}-${String(mesMes).padStart(2, '0')}-${new Date(mesAno, mesMes, 0).getDate()}`

  const ms = (d: number) => d * 864e5
  const tres_dias    = new Date(hoje.getTime() + ms(3) ).toISOString().slice(0, 10)
  const trinta_dias  = new Date(hoje.getTime() + ms(30)).toISOString().slice(0, 10)
  const cinco_dias   = new Date(hoje.getTime() + ms(5) ).toISOString().slice(0, 10)
  const noventa_atras = new Date(hoje.getTime() - ms(90)).toISOString().slice(0, 10)

  const supabase = await createClient()
  const db = supabase as any

  // ── Phase 1: all independent fetches ─────────────────────────

  const [
    { count: countHoje },
    { count: countEsteMes },
    { count: countTotal },
    { data: proximosRows },
    { data: proximos30Ids },
    { data: semResultadoRows },
    { count: semResultadoTotal },
    { data: semEstoqueRaw },
    { data: presencaRows },
    { data: intelARows },
    { data: intelCRows },
  ] = await Promise.all([
    db.from('shows').select('*', { count: 'exact', head: true }).eq('data', hojeStr),
    db.from('shows').select('*', { count: 'exact', head: true }).gte('data', primeiroDia).lte('data', ultimoDia),
    db.from('shows').select('*', { count: 'exact', head: true }),

    // Próximos 20 shows com venue (sort em JS depois)
    db.from('shows')
      .select('id, data, nome_evento, participou, clima_estimado, clima_temp, venues(id, nome, capacidade_praticavel, risco_fiscalizacao, bairro, lat, lng)')
      .gte('data', hojeStr)
      .order('data', { ascending: true })
      .limit(20),

    // IDs dos próximos 30 dias (para intel b)
    db.from('shows')
      .select('id')
      .gte('data', hojeStr)
      .lte('data', trinta_dias)
      .limit(60),

    // Pendência a: shows sem resultado (legado=false, passados, participados)
    db.from('shows')
      .select('id, data, nome_evento')
      .lt('data', hojeStr)
      .eq('participou', true)
      .eq('legado', false)
      .is('resultado_geral', null)
      .order('data', { ascending: false })
      .limit(5),

    // Contagem total de pendência a (para "e mais X →")
    db.from('shows')
      .select('*', { count: 'exact', head: true })
      .lt('data', hojeStr)
      .eq('participou', true)
      .eq('legado', false)
      .is('resultado_geral', null),

    // Pendência b: designs sem estoque
    db.from('design_stock')
      .select('design_id, nome, artist_id, saldo_atual')
      .eq('ativo', true)
      .lte('saldo_atual', 0),

    // Pendência c: presença indefinida próximos 3 dias
    db.from('shows')
      .select('id, data, nome_evento')
      .gte('data', hojeStr)
      .lte('data', tres_dias)
      .eq('participou', false)
      .order('data', { ascending: true }),

    // Intel a: shows com resultado nos últimos 90 dias
    db.from('shows')
      .select('resultado_geral, data, venues(nome)')
      .eq('participou', true)
      .not('resultado_geral', 'is', null)
      .gte('data', noventa_atras)
      .lte('data', hojeStr),

    // Intel c: todos shows com venue (para agrupar em JS)
    db.from('shows')
      .select('participou, venues(nome)')
      .not('venue_id', 'is', null),
  ])

  // ── Sort próximos: estritamente cronológico; participou=true desempata dentro do mesmo dia ──

  const sortedProximos = ((proximosRows ?? []) as any[])
    .sort((a, b) => {
      const dataCmp = a.data.localeCompare(b.data)
      if (dataCmp !== 0) return dataCmp
      const aP = a.participou === true ? 0 : 1
      const bP = b.participou === true ? 0 : 1
      return aP - bP
    })
    .slice(0, 7)

  // ── Phase 2: show_artists para todos os shows relevantes ─────

  const allShowIds = [...new Set([
    ...sortedProximos.map((s: any) => s.id),
    ...(proximos30Ids  ?? []).map((s: any) => s.id),
    ...(semResultadoRows ?? []).map((s: any) => s.id),
    ...(presencaRows   ?? []).map((s: any) => s.id),
  ])]

  let saAllRows: any[] = []
  if (allShowIds.length > 0) {
    const { data } = await db
      .from('show_artists')
      .select('show_id, artist_id, ordem, artists(id, nome)')
      .in('show_id', allShowIds)
    saAllRows = data ?? []
  }

  // Lookup maps
  const artistById: Record<string, string> = {}
  const saByShow: Record<string, { artist_id: string; ordem: number }[]> = {}

  for (const sa of saAllRows) {
    const artist = Array.isArray(sa.artists) ? sa.artists[0] : sa.artists
    if (artist?.id) artistById[artist.id] = artist.nome
    if (!saByShow[sa.show_id]) saByShow[sa.show_id] = []
    saByShow[sa.show_id].push({ artist_id: sa.artist_id, ordem: sa.ordem })
  }

  function showNome(showId: string, nome_evento: string | null): string {
    const sas = (saByShow[showId] ?? []).sort((a, b) => a.ordem - b.ordem)
    const artistas = sas.map(sa => artistById[sa.artist_id]).filter(Boolean)
    return getShowDisplayName(nome_evento, artistas)
  }

  // ── Phase 3: nichos, designs e nomes de artistas ─────────────

  const proximosArtistIds = [...new Set(
    sortedProximos.flatMap((s: any) => (saByShow[s.id] ?? []).map((sa: any) => sa.artist_id))
  )]

  const todos30ArtistIds = [...new Set(
    ((proximos30Ids ?? []) as any[]).flatMap((s: any) =>
      (saByShow[s.id] ?? []).map((sa: any) => sa.artist_id)
    )
  )]

  const allUpcomingArtistIds = [...new Set([...proximosArtistIds, ...todos30ArtistIds])]

  const semEstoqueArtistIds = [...new Set(
    ((semEstoqueRaw ?? []) as any[]).map((d: any) => d.artist_id).filter(Boolean)
  )]
  const extraArtistIds = semEstoqueArtistIds.filter(id => !artistById[id])

  let artistNichoRows: any[] = []
  let designStockRows: any[] = []
  const extraArtistNames: Record<string, string> = {}

  await Promise.all([
    allUpcomingArtistIds.length > 0
      ? db.from('artist_nichos')
          .select('artist_id, nicho_id, score, nichos(id, nome, underground_score)')
          .in('artist_id', allUpcomingArtistIds)
          .then(({ data }: any) => { artistNichoRows = data ?? [] })
      : Promise.resolve(),

    proximosArtistIds.length > 0
      ? db.from('design_stock')
          .select('design_id, nome, artist_id, saldo_atual')
          .eq('ativo', true)
          .in('artist_id', proximosArtistIds)
          .then(({ data }: any) => { designStockRows = data ?? [] })
      : Promise.resolve(),

    extraArtistIds.length > 0
      ? db.from('artists')
          .select('id, nome')
          .in('id', extraArtistIds)
          .then(({ data }: any) => {
            for (const a of (data ?? [])) extraArtistNames[a.id] = a.nome
          })
      : Promise.resolve(),
  ])

  const fullArtistById: Record<string, string> = { ...artistById, ...extraArtistNames }

  // ── Weather para shows dentro de 5 dias ──────────────────────

  const weatherByShow: Record<string, { icon: string; temp: number }> = {}

  const showsForWeather = sortedProximos.filter((s: any) => {
    const venue = Array.isArray(s.venues) ? s.venues[0] : s.venues
    return s.data <= cinco_dias && venue?.lat && venue?.lng
  })

  await Promise.all(showsForWeather.map(async (s: any) => {
    const venue = Array.isArray(s.venues) ? s.venues[0] : s.venues
    if (s.clima_estimado && s.clima_temp != null) {
      const icon = CLIMA_ICONE[s.clima_estimado] ?? null
      if (icon) weatherByShow[s.id] = { icon, temp: s.clima_temp }
      return
    }
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'
      const res = await fetch(
        `${baseUrl}/api/weather?lat=${venue.lat}&lng=${venue.lng}&data=${s.data}`,
        { cache: 'no-store' },
      )
      const wd = await res.json()
      if (wd.clima) {
        const icon = CLIMA_ICONE[wd.clima] ?? null
        if (icon && wd.temp != null) weatherByShow[s.id] = { icon, temp: wd.temp }
      }
    } catch {}
  }))

  // ── Lookup maps para nichos e designs ────────────────────────

  const nichosByArtist: Record<string, { nicho_id: string; nicho_nome: string; underground_score: number | null; score: number }[]> = {}
  for (const an of artistNichoRows) {
    const nicho = Array.isArray(an.nichos) ? an.nichos[0] : an.nichos
    if (!nicho) continue
    if (!nichosByArtist[an.artist_id]) nichosByArtist[an.artist_id] = []
    nichosByArtist[an.artist_id].push({
      nicho_id:        an.nicho_id,
      nicho_nome:      nicho.nome,
      underground_score: nicho.underground_score,
      score:           an.score ?? 1,
    })
  }

  const designsByArtist: Record<string, { id: string; nome: string; saldo_atual: number }[]> = {}
  for (const d of designStockRows) {
    if (!designsByArtist[d.artist_id]) designsByArtist[d.artist_id] = []
    designsByArtist[d.artist_id].push({ id: d.design_id, nome: d.nome, saldo_atual: d.saldo_atual })
  }

  // ── Build proximosCards ───────────────────────────────────────

  const proximosCards = sortedProximos.map((s: any) => {
    const venue = Array.isArray(s.venues) ? s.venues[0] : s.venues
    const sas   = (saByShow[s.id] ?? []).sort((a: any, b: any) => a.ordem - b.ordem)

    // Nichos: agregar dos artistas do show, deduplicar por nicho_id
    const nichoMap: Record<string, { nome: string; underground_score: number | null; total: number; count: number }> = {}
    for (const sa of sas) {
      for (const n of (nichosByArtist[sa.artist_id] ?? [])) {
        if (!nichoMap[n.nicho_id]) nichoMap[n.nicho_id] = { nome: n.nicho_nome, underground_score: n.underground_score, total: 0, count: 0 }
        nichoMap[n.nicho_id].total += n.score
        nichoMap[n.nicho_id].count++
      }
    }
    const nichos = Object.values(nichoMap)
      .sort((a, b) => (b.total / b.count) - (a.total / a.count))
      .map(n => ({ nome: n.nome, underground_score: n.underground_score }))

    // Designs: de todos os artistas do show
    const seenDesigns = new Set<string>()
    const designs: { id: string; nome: string; saldo_atual: number }[] = []
    for (const sa of sas) {
      for (const d of (designsByArtist[sa.artist_id] ?? [])) {
        if (!seenDesigns.has(d.id)) {
          seenDesigns.add(d.id)
          designs.push(d)
        }
      }
    }

    return {
      id:         s.id,
      data:       s.data,
      nomeShow:   getShowDisplayName(s.nome_evento, sas.map((sa: any) => artistById[sa.artist_id]).filter(Boolean)),
      participou: s.participou as boolean | null,
      venue: venue ? {
        id:                    venue.id,
        nome:                  venue.nome,
        capacidade_praticavel: venue.capacidade_praticavel ?? null,
        risco_fiscalizacao:    venue.risco_fiscalizacao ?? null,
        bairro:                venue.bairro ?? null,
      } : null,
      nichos,
      designs,
      clima: weatherByShow[s.id] ?? null,
    }
  })

  // ── Build pendências ──────────────────────────────────────────

  const semResultado = ((semResultadoRows ?? []) as any[]).map(s => ({
    id:       s.id,
    data:     s.data,
    nomeShow: showNome(s.id, s.nome_evento),
  }))

  const semEstoque = ((semEstoqueRaw ?? []) as any[]).map(d => ({
    id:          d.design_id,
    nome:        d.nome,
    artistaNome: fullArtistById[d.artist_id] ?? null,
  }))

  const presencaIndefini = ((presencaRows ?? []) as any[]).map(s => ({
    id:       s.id,
    data:     s.data,
    nomeShow: showNome(s.id, s.nome_evento),
  }))

  // ── Build inteligência ────────────────────────────────────────

  // a: melhor resultado 90d
  const melhorResultado = (() => {
    const rows = ((intelARows ?? []) as any[])
    if (!rows.length) return null
    const best = rows.sort((a, b) => {
      const diff = (RESULTADO_ORDER[b.resultado_geral] ?? 0) - (RESULTADO_ORDER[a.resultado_geral] ?? 0)
      return diff !== 0 ? diff : b.data.localeCompare(a.data)
    })[0]
    const v = Array.isArray(best.venues) ? best.venues[0] : best.venues
    return { venue: v?.nome ?? '—', resultado: best.resultado_geral as string, data: best.data as string }
  })()

  // b: nicho mais frequente próximos 30 dias
  const nichoMaisFrequente = (() => {
    const count: Record<string, { nome: string; n: number }> = {}
    for (const s of ((proximos30Ids ?? []) as any[])) {
      const seenNichos = new Set<string>()
      for (const sa of (saByShow[s.id] ?? [])) {
        for (const n of (nichosByArtist[sa.artist_id] ?? [])) {
          if (!seenNichos.has(n.nicho_id)) {
            seenNichos.add(n.nicho_id)
            if (!count[n.nicho_id]) count[n.nicho_id] = { nome: n.nicho_nome, n: 0 }
            count[n.nicho_id].n++
          }
        }
      }
    }
    const entries = Object.values(count)
    if (!entries.length) return null
    return entries.sort((a, b) => b.n - a.n)[0]
  })()

  // c: venue mais visitado all time
  const venueMaisVisitado = (() => {
    const map: Record<string, { nome: string; total: number; participados: number }> = {}
    for (const row of ((intelCRows ?? []) as any[])) {
      const v = Array.isArray(row.venues) ? row.venues[0] : row.venues
      if (!v?.nome) continue
      if (!map[v.nome]) map[v.nome] = { nome: v.nome, total: 0, participados: 0 }
      map[v.nome].total++
      if (row.participou === true) map[v.nome].participados++
    }
    const entries = Object.values(map)
    if (!entries.length) return null
    return entries.sort((a, b) => b.participados - a.participados)[0]
  })()

  // ── Header date ───────────────────────────────────────────────

  const dataLabel = hoje.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <HomeBriefingClient
      dataLabel={dataLabel}
      countHoje={countHoje ?? 0}
      countEsteMes={countEsteMes ?? 0}
      countTotal={countTotal ?? 0}
      proximosShows={proximosCards}
      semResultado={semResultado}
      semResultadoTotal={semResultadoTotal ?? 0}
      semEstoque={semEstoque}
      presencaIndefini={presencaIndefini}
      melhorResultado={melhorResultado}
      nichoMaisFrequente={nichoMaisFrequente ? { nome: nichoMaisFrequente.nome, count: nichoMaisFrequente.n } : null}
      venueMaisVisitado={venueMaisVisitado}
    />
  )
}
