import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

const WP_BASE = 'https://en.wikipedia.org/api/rest_v1'

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')
  if (!name) return NextResponse.json({ error: 'name obrigatório' }, { status: 400 })

  const slug = name.trim().replace(/\s+/g, '_')

  try {
    const { data } = await axios.get(`${WP_BASE}/page/summary/${encodeURIComponent(slug)}`, {
  headers: {
    'User-Agent': 'ohara/1.0.0 (https://github.com/cianometalico/ohara)',
  },
})

    return NextResponse.json({
      title: data.title,
      description: data.description ?? null,
      extract: data.extract?.slice(0, 600) ?? null,
      thumbnail: data.thumbnail?.source ?? null,
      url: data.content_urls?.desktop?.page ?? null,
    })
  } catch (e: any) {
    if (e.response?.status === 404) {
      return NextResponse.json({ error: 'não encontrado' }, { status: 404 })
    }
    throw e
  }
}