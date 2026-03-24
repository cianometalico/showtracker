import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const MB_BASE  = 'https://musicbrainz.org/ws/2'
const LFM_BASE = 'https://ws.audioscrobbler.com/2.0'
const MB_HEADERS = {
  'User-Agent': 'radiant/1.0.0 (https://github.com/cianometalico/showtracker)',
  'Accept': 'application/json',
}
const WP_HEADERS = {
  'User-Agent': 'radiant/1.0.0 (https://github.com/cianometalico/showtracker)',
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function fetchMB(path: string) {
  const res = await fetch(`${MB_BASE}${path}`, { headers: MB_HEADERS })
  if (!res.ok) return null
  return res.json()
}

async function fetchLFM(params: Record<string, string>) {
  const p = new URLSearchParams({ ...params, api_key: process.env.LASTFM_API_KEY!, format: 'json' })
  const res = await fetch(`${LFM_BASE}?${p}`)
  if (!res.ok) return null
  return res.json()
}

async function fetchWiki(name: string) {
  const slugs = [
    encodeURIComponent(name.replace(/\s+/g, '_')),
    encodeURIComponent(name.replace(/\s+/g, '_') + '_(band)'),
    encodeURIComponent(name.replace(/\s+/g, '_') + '_(banda)'),
  ]
  for (const slug of slugs) {
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, { headers: WP_HEADERS })
      if (!res.ok) continue
      const data = await res.json()
      const desc = (data.description ?? '').toLowerCase()
      const isArtist = ['band', 'musician', 'group', 'singer', 'rapper', 'duo', 'trio', 'banda', 'músico'].some(w => desc.includes(w))
      if (isArtist) return data
    } catch {}
  }
  // tenta PT
  for (const slug of slugs) {
    try {
      const res = await fetch(`https://pt.wikipedia.org/api/rest_v1/page/summary/${slug}`, { headers: WP_HEADERS })
      if (!res.ok) continue
      const data = await res.json()
      const desc = (data.description ?? '').toLowerCase()
      const isArtist = ['banda', 'músico', 'grupo', 'cantor', 'band', 'musician'].some(w => desc.includes(w))
      if (isArtist) return data
    } catch {}
  }
  return null
}

export async function GET() {
  const supabase = await createClient()

  // busca artistas sem mbid
  const { data: artists, error } = await (supabase as any)
    .from('artists')
    .select('id, nome')
    .is('mbid', null)
    .order('nome', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total = (artists ?? []).length
  console.log(`\n[enrich-all] ${total} artistas para enriquecer\n`)

  let ok = 0
  let skip = 0
  let fail = 0

  for (const artist of (artists ?? [])) {
    const nome = artist.nome as string

    try {
      // 1. MusicBrainz search
      await sleep(250) // respeita rate limit MB
      const encoded = encodeURIComponent(nome)
      const mbSearch = await fetchMB(`/artist?query=${encoded}&limit=3&fmt=json`)
      const candidates = mbSearch?.artists ?? []
      const best = candidates.find((a: any) => a.score >= 85) ?? candidates[0]

      if (!best || best.score < 60) {
        console.log(`  [skip] ${nome} — sem match MB (score ${best?.score ?? 0})`)
        skip++
        continue
      }

      const mbid = best.id

      // 2. MB detalhe com tags + url-rels + release-groups
      await sleep(250)
      const mbDetail = await fetchMB(`/artist/${mbid}?inc=tags+url-rels+release-groups&fmt=json`)

      // 3. Last.fm
      await sleep(200)
      const lfmData = await fetchLFM({ method: 'artist.getinfo', mbid })
      const lfmArtist = lfmData?.artist

      // 4. Wikipedia
      const wpRelation = mbDetail?.relations?.find((r: any) => r.url?.resource?.includes('en.wikipedia.org'))
      const ptRelation = mbDetail?.relations?.find((r: any) => r.url?.resource?.includes('pt.wikipedia.org'))
      let wpData = null
      if (wpRelation?.url?.resource) {
        try {
          const lang = 'en'
          const slug = wpRelation.url.resource.split('/wiki/')[1]
          const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${slug}`, { headers: WP_HEADERS })
          if (res.ok) wpData = await res.json()
        } catch {}
      }
      if (!wpData && ptRelation?.url?.resource) {
        try {
          const slug = ptRelation.url.resource.split('/wiki/')[1]
          const res = await fetch(`https://pt.wikipedia.org/api/rest_v1/page/summary/${slug}`, { headers: WP_HEADERS })
          if (res.ok) wpData = await res.json()
        } catch {}
      }
      if (!wpData) wpData = await fetchWiki(nome)

      // 5. Último álbum
      const releases = mbDetail?.['release-groups']
        ?.filter((r: any) => r['primary-type'] === 'Album' && !r['secondary-types']?.includes('Remix'))
        ?.sort((a: any, b: any) => (b['first-release-date'] ?? '').localeCompare(a['first-release-date'] ?? ''))
      const lastAlbum = releases?.[0]?.title ?? null

      // 6. Artistas similares do Last.fm
      await sleep(200)
      const lfmSimilar = await fetchLFM({ method: 'artist.getSimilar', mbid, limit: '10' })
      const similarArtists = lfmSimilar?.similarartists?.artist?.map((a: any) => ({
        name: a.name,
        match: parseFloat(a.match ?? '0'),
      })) ?? []

      // tags
      const tags_editorial = (Array.isArray(mbDetail?.tags)
        ? mbDetail.tags
        : mbDetail?.tags?.tag ?? []
      ).map((t: any) => t.name)

      const tags_behavioral = lfmArtist?.tags?.tag?.map((t: any) => ({
        name: t.name,
        count: parseInt(t.count ?? '0'),
      })) ?? []

      // update no banco
      await (supabase as any)
        .from('artists')
        .update({
          mbid,
          pais:               mbDetail?.country ?? best.country ?? null,
          tags_editorial,
          tags_behavioral,
          lastfm_listeners:   parseInt(lfmArtist?.stats?.listeners ?? '0') || null,
          wikipedia_url:      wpData?.content_urls?.desktop?.page ?? null,
          similar_artists:    similarArtists,
          ultima_atualizacao: new Date().toISOString(),
        })
        .eq('id', artist.id)

      console.log(`  [ok] ${nome} — mbid ${mbid.slice(0, 8)}... | ${tags_editorial.slice(0, 3).join(', ')}`)
      ok++

    } catch (e: any) {
      console.log(`  [fail] ${nome} — ${e.message}`)
      fail++
    }

    await sleep(500) // pausa geral entre artistas
  }

  console.log(`\n[enrich-all] concluído: ${ok} ok, ${skip} sem match, ${fail} erros\n`)

  return NextResponse.json({
    total,
    ok,
    skip,
    fail,
    message: 'Enriquecimento concluído. Veja o terminal para detalhes.'
  })
}