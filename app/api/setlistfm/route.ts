// app/api/setlistfm/route.ts
import { NextRequest, NextResponse } from 'next/server'

const KEY  = process.env.SETLISTFM_API_KEY
const BASE = 'https://api.setlist.fm/rest/1.0'

export async function GET(req: NextRequest) {
  if (!KEY) return NextResponse.json({ error: 'SETLISTFM_API_KEY não configurada' }, { status: 500 })

  const headers = { 'x-api-key': KEY, 'Accept': 'application/json' }
  const { searchParams } = req.nextUrl
  const action = searchParams.get('action')
  const mbid   = searchParams.get('mbid')

  if (!mbid) return NextResponse.json({ error: 'mbid obrigatório' }, { status: 400 })

  try {
    if (action === 'shows_brasil') {
      const allShows: any[] = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayTs = today.getTime()

      const limitPages = Math.min(Math.max(parseInt(searchParams.get('limit_pages') ?? '15') || 15, 1), 15)

      // Estratégia dupla:
      // 1. countryCode=BR (filtra server-side quando funciona)
      // 2. Sem filtro de país nas últimas páginas como fallback

      let page = 1
      let emptyBRPages = 0  // contador de páginas sem resultado BR

      while (page <= limitPages) {  // até limitPages × 20 shows
        const url = `${BASE}/artist/${mbid}/setlists?p=${page}&countryCode=BR`
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) })

        if (res.status === 404) break
        if (res.status === 429) { await new Promise(r => setTimeout(r, 2000)); continue }
        if (!res.ok) break

        const data = await res.json()
        const setlists: any[] = data.setlist ?? []
        if (setlists.length === 0) break

        let foundBRThisPage = false
        for (const s of setlists) {
          const cc   = s.venue?.city?.country?.code ?? ''
          const cn   = (s.venue?.city?.country?.name ?? '').toLowerCase()
          const isBR = cc === 'BR' || cn.includes('brazil') || cn.includes('brasil')
          if (!isBR) continue

          // Não conta shows futuros para "primeira vez"
          const showTs = parseSFDate(s.eventDate)
          if (showTs >= todayTs) continue

          foundBRThisPage = true
          allShows.push({
            data:        s.eventDate,
            venue_nome:  s.venue?.name ?? null,
            cidade:      s.venue?.city?.name ?? null,
            estado:      s.venue?.city?.stateCode ?? null,
            tour:        s.tour?.name ?? null,
            setlist_url: s.url ?? null,
          })
        }

        // Se 3 páginas seguidas sem BR, para (countryCode=BR garantiu filtro)
        if (!foundBRThisPage) {
          emptyBRPages++
          if (emptyBRPages >= 3) break
        } else {
          emptyBRPages = 0
        }

        if (setlists.length < 20) break  // última página
        page++
        await new Promise(r => setTimeout(r, 300))
      }

      // Se não achou nada via countryCode=BR, tenta busca global e filtra manualmente
      // (Setlist.fm às vezes ignora o parâmetro para artistas com poucos shows)
      if (allShows.length === 0) {
        page = 1
        while (page <= 5) {
          const url = `${BASE}/artist/${mbid}/setlists?p=${page}`
          const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) })
          if (!res.ok) break
          const data = await res.json()
          const setlists: any[] = data.setlist ?? []
          if (setlists.length === 0) break

          for (const s of setlists) {
            const cc   = s.venue?.city?.country?.code ?? ''
            const cn   = (s.venue?.city?.country?.name ?? '').toLowerCase()
            const isBR = cc === 'BR' || cn.includes('brazil') || cn.includes('brasil')
            if (!isBR) continue

            const showTs = parseSFDate(s.eventDate)
            if (showTs >= todayTs) continue

            allShows.push({
              data:        s.eventDate,
              venue_nome:  s.venue?.name ?? null,
              cidade:      s.venue?.city?.name ?? null,
              estado:      s.venue?.city?.stateCode ?? null,
              tour:        s.tour?.name ?? null,
              setlist_url: s.url ?? null,
            })
          }
          if (setlists.length < 20) break
          page++
          await new Promise(r => setTimeout(r, 300))
        }
      }

      allShows.sort((a, b) => parseSFDate(b.data) - parseSFDate(a.data))

      return NextResponse.json({
        total_shows_brasil:  allShows.length,
        primeira_vez_brasil: allShows.length === 0,
        shows:               allShows,
      })
    }

    if (action === 'shows_global') {
      // Todos os shows do artista (sem filtro de país) — para Rota da Tour
      const allShows: any[] = []
      let page = 1

      while (page <= 10) {
        const url = `${BASE}/artist/${mbid}/setlists?p=${page}`
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) })
        if (res.status === 404) break
        if (res.status === 429) { await new Promise(r => setTimeout(r, 2000)); continue }
        if (!res.ok) break

        const data = await res.json()
        const setlists: any[] = data.setlist ?? []
        if (setlists.length === 0) break

        for (const s of setlists) {
          allShows.push({
            data:        s.eventDate ?? null,
            venue_nome:  s.venue?.name ?? null,
            cidade:      s.venue?.city?.name ?? null,
            pais:        s.venue?.city?.country?.code ?? null,
            estado:      s.venue?.city?.stateCode ?? null,
            tour:        s.tour?.name ?? null,
            setlist_url: s.url ?? null,
          })
        }
        if (setlists.length < 20) break
        page++
        await new Promise(r => setTimeout(r, 300))
      }

      allShows.sort((a, b) => parseSFDate(b.data) - parseSFDate(a.data))
      return NextResponse.json({ total: allShows.length, shows: allShows })
    }

    return NextResponse.json({ error: 'action inválida' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function parseSFDate(ddmmyyyy: string | null): number {
  if (!ddmmyyyy) return 0
  const p = ddmmyyyy.split('-')
  if (p.length !== 3) return 0
  return new Date(`${p[2]}-${p[1]}-${p[0]}T12:00:00Z`).getTime()
}