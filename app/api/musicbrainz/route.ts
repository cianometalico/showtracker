import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const nome = searchParams.get('nome')
  const mbid = searchParams.get('mbid')

  const base = 'https://musicbrainz.org/ws/2'
  const url = mbid
    ? `${base}/artist/${mbid}?inc=tags&fmt=json`
    : `${base}/artist?query=${encodeURIComponent(nome ?? '')}&limit=5&fmt=json`

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'ShowTracker/2.0 (cianometalico@proton.me)',
      'Accept': 'application/json',
    },
  })

  if (!res.ok) return NextResponse.json({ error: 'Erro MusicBrainz' }, { status: res.status })
  const data = await res.json()
  return NextResponse.json(data)
}