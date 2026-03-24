import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

const MB_BASE  = 'https://musicbrainz.org/ws/2'
const LFM_BASE = 'https://ws.audioscrobbler.com/2.0'

const MB_HEADERS = { 'User-Agent': 'ohara/1.0.0 (https://github.com/cianometalico/ohara)', 'Accept': 'application/json' }
const WP_HEADERS = { 'User-Agent': 'ohara/1.0.0 (https://github.com/cianometalico/ohara)' }

async function fetchWikiSummary(url: string) {
  const lang = url.includes('pt.wikipedia') ? 'pt' : 'en'
  const slug = url.split('/wiki/')[1]
  const res = await axios.get(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${slug}`, { headers: WP_HEADERS })
  return res.data
}

const parseDate = (d: string) => {
  const [day, month, year] = d.split('-')
  return new Date(`${year}-${month}-${day}`)
}

export async function GET(req: NextRequest) {
  const mbid = req.nextUrl.searchParams.get('mbid')
  const name = req.nextUrl.searchParams.get('name')
  if (!mbid || !name) return NextResponse.json({ error: 'mbid e name obrigatórios' }, { status: 400 })

  const [mb, lfm, slfm] = await Promise.allSettled([
    axios.get(`${MB_BASE}/artist/${mbid}`, {
      headers: MB_HEADERS,
      params: { inc: 'tags+url-rels+release-groups', fmt: 'json' },
    }),
    axios.get(LFM_BASE, {
      params: { method: 'artist.getinfo', artist: name, api_key: process.env.LASTFM_API_KEY, format: 'json' },
    }),
    axios.get(`https://api.setlist.fm/rest/1.0/artist/${mbid}/setlists`, {
      headers: { 'x-api-key': process.env.SETLISTFM_API_KEY!, 'Accept': 'application/json' },
      params: { p: 1 },
    }),
  ])

  const mbData  = mb.status   === 'fulfilled' ? mb.value.data         : null
  const lfmData = lfm.status  === 'fulfilled' ? lfm.value.data.artist : null
  const slData  = slfm.status === 'fulfilled' ? slfm.value.data       : null

  let allShows = slData?.setlist ?? []
  const totalPages = Math.min(5, Math.ceil((slData?.total ?? 0) / 20))

  if (totalPages > 1 && slfm.status === 'fulfilled') {
    const extraPages = await Promise.allSettled(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        axios.get(`https://api.setlist.fm/rest/1.0/artist/${mbid}/setlists`, {
          headers: { 'x-api-key': process.env.SETLISTFM_API_KEY!, 'Accept': 'application/json' },
          params: { p: i + 2 },
        })
      )
    )
    for (const page of extraPages) {
      if (page.status === 'fulfilled') {
        allShows = [...allShows, ...(page.value.data.setlist ?? [])]
      }
    }
  }

  // último álbum via MB release-groups
  const releases = mbData?.['release-groups']
    ?.filter((r: any) => r['primary-type'] === 'Album')
    ?.sort((a: any, b: any) =>
      (b['first-release-date'] ?? '').localeCompare(a['first-release-date'] ?? '')
    )
  const lastAlbum = releases?.[0]
    ? { title: releases[0].title, year: releases[0]['first-release-date']?.slice(0, 4) ?? null }
    : null

  // tour atual
  const tourShow    = allShows.find((s: any) => s.tour?.name)
  const currentTour = tourShow ? { name: tourShow.tour.name, url: tourShow.url ?? null } : null

  // Wikipedia cascade
  const wpRelation = mbData?.relations?.find((r: any) => r.url?.resource?.includes('en.wikipedia.org'))
  const ptRelation = mbData?.relations?.find((r: any) => r.url?.resource?.includes('pt.wikipedia.org'))

  let wpData = null
  if (wpRelation?.url?.resource) {
    try { wpData = await fetchWikiSummary(wpRelation.url.resource) } catch (e) {}
  }
  if (!wpData && ptRelation?.url?.resource) {
    try { wpData = await fetchWikiSummary(ptRelation.url.resource) } catch (e) {}
  }
  if (!wpData) {
    for (const slug of [
      encodeURIComponent(name.replace(/\s+/g, '_')),
      encodeURIComponent(name.replace(/\s+/g, '_') + '_(band)'),
      encodeURIComponent(name.replace(/\s+/g, '_') + '_(banda)'),
    ]) {
      try {
        const res = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, { headers: WP_HEADERS })
        const desc = (res.data?.description ?? '').toLowerCase()
        const isArtist = ['band', 'musician', 'group', 'singer', 'rapper', 'duo', 'trio', 'banda', 'músico'].some(w => desc.includes(w))
        if (isArtist) { wpData = res.data; break }
      } catch (e) {}
    }
  }
  if (!wpData) {
    for (const slug of [
      encodeURIComponent(name.replace(/\s+/g, '_')),
      encodeURIComponent(name.replace(/\s+/g, '_') + '_(banda)'),
      encodeURIComponent(name.replace(/\s+/g, '_') + '_(band)'),
    ]) {
      try {
        const res = await axios.get(`https://pt.wikipedia.org/api/rest_v1/page/summary/${slug}`, { headers: WP_HEADERS })
        const desc = (res.data?.description ?? '').toLowerCase()
        const isArtist = ['banda', 'músico', 'grupo', 'cantor', 'band', 'musician'].some(w => desc.includes(w))
        if (isArtist) { wpData = res.data; break }
      } catch (e) {}
    }
  }

  const tags_editorial  = (Array.isArray(mbData?.tags)
    ? mbData.tags
    : mbData?.tags?.tag ?? []
  ).map((t: any) => t.name)

  const tags_behavioral = lfmData?.tags?.tag?.map((t: any) => ({ name: t.name, count: t.count })) ?? []

  const today = new Date()

  const mapShow = (s: any) => ({
    date:     s.eventDate,
    venue:    s.venue?.name ?? null,
    city:     s.venue?.city?.name ?? null,
    country:  s.venue?.city?.country?.code ?? null,
    tour:     s.tour?.name ?? null,
    url:      s.url ?? null,
    upcoming: parseDate(s.eventDate) > today,
  })

  // upcoming: próximos 5 (todos os países)
  const upcoming = allShows
    .filter((s: any) => parseDate(s.eventDate) > today)
    .slice(0, 5)
    .map(mapShow)

  // recent: últimos 7 passados (todos os países)
  const recent = allShows
    .filter((s: any) => parseDate(s.eventDate) <= today)
    .slice(0, 7)
    .map(mapShow)

  // último show BR para o header
  const lastBR = allShows
    .filter((s: any) => s.venue?.city?.country?.code === 'BR' && parseDate(s.eventDate) <= today)[0]

  return NextResponse.json({
    identity: {
      mbid,
      name:       mbData?.name ?? name,
      type:       mbData?.type ?? null,
      country:    mbData?.country ?? null,
      formedYear: mbData?.['life-span']?.begin?.slice(0, 4) ?? null,
      endedYear:  mbData?.['life-span']?.end?.slice(0, 4) ?? null,
    },
    activity: {
      last_album:   lastAlbum,
      current_tour: currentTour,
    },
    audience: {
      listeners: parseInt(lfmData?.stats?.listeners ?? '0'),
      playcount:  parseInt(lfmData?.stats?.playcount  ?? '0'),
    },
    tags_editorial,
    tags_behavioral,
    description: wpData?.description ?? null,
    extract:     wpData?.extract?.slice(0, 500) ?? null,
    thumbnail:   wpData?.thumbnail?.source ?? null,
    shows: {
      upcoming,
      recent,
      last_br: lastBR ? lastBR.eventDate : null,
    },
    sources: {
      musicbrainz: mb.status   === 'fulfilled',
      lastfm:      lfm.status  === 'fulfilled',
      wikipedia:   wpData !== null,
      setlistfm:   slfm.status === 'fulfilled',
    },
  })
}