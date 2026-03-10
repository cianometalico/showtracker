import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const artist = searchParams.get('artist')
  const mbid = searchParams.get('mbid')

  if (!artist && !mbid) {
    return NextResponse.json({ error: 'Parâmetro artist ou mbid obrigatório' }, { status: 400 })
  }

  const base = 'https://api.setlist.fm/rest/1.0'
  const url = mbid
    ? `${base}/artist/${mbid}/setlists?p=1`
    : `${base}/search/setlists?artistName=${encodeURIComponent(artist!)}&p=1&countryCode=BR`

  const res = await fetch(url, {
    headers: {
      'x-api-key': process.env.SETLISTFM_API_KEY ?? '',
      'Accept': 'application/json',
    },
  })

  if (!res.ok) return NextResponse.json({ error: 'Erro na API Setlist.fm' }, { status: res.status })
  const data = await res.json()
  return NextResponse.json(data)
}