import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')
  if (!name) return NextResponse.json({ error: 'name obrigatório' }, { status: 400 })

  const { data } = await axios.get('https://api.discogs.com/database/search', {
    headers: {
      'Authorization': `Discogs token=${process.env.DISCOGS_TOKEN}`,
      'User-Agent': 'ohara/1.0.0',
    },
    params: { q: name, type: 'artist', per_page: 5 },
  })

  const results = data.results?.map((r: any) => ({
    id: r.id,
    name: r.title,
    thumb: r.thumb ?? null,
    url: r.uri,
  })) ?? []

  return NextResponse.json({ results })
}