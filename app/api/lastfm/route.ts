// app/api/lastfm/route.ts
import { NextRequest, NextResponse } from 'next/server'

const KEY  = process.env.LASTFM_API_KEY
const BASE = 'https://ws.audioscrobbler.com/2.0'

// GET /api/lastfm?action=artist&mbid=xxx
// GET /api/lastfm?action=artist&nome=Metallica
export async function GET(req: NextRequest) {
  if (!KEY) return NextResponse.json({ error: 'LASTFM_API_KEY não configurada' }, { status: 500 })

  const { searchParams } = req.nextUrl
  const action = searchParams.get('action')

  try {
    if (action === 'artist') {
      const mbid = searchParams.get('mbid')
      const nome = searchParams.get('nome')

      const params = new URLSearchParams({
        method:  'artist.getinfo',
        api_key: KEY,
        format:  'json',
        ...(mbid ? { mbid } : { artist: nome ?? '' }),
      })

      const res  = await fetch(`${BASE}?${params}`, { signal: AbortSignal.timeout(6000) })
      const data = await res.json()

      if (data.error) return NextResponse.json({ error: data.message }, { status: 400 })

      const a = data.artist
      return NextResponse.json({
        nome:      a.name,
        listeners: parseInt(a.stats?.listeners ?? '0'),
        plays:     parseInt(a.stats?.playcount ?? '0'),
        tags:      (a.tags?.tag ?? []).map((t: any) => t.name).slice(0, 6),
        bio_pt:    a.bio?.summary ?? null,
      })
    }

    return NextResponse.json({ error: 'action inválida' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}