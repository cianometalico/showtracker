// app/api/musicbrainz/route.ts
import { NextRequest, NextResponse } from 'next/server'

const UA   = process.env.MB_USER_AGENT ?? 'ShowTracker/1.0'
const BASE = 'https://musicbrainz.org/ws/2'

async function mbFetch(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`MB ${res.status}`)
  return res.json()
}

function normalizeQuery(q: string): string {
  return q
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[''`]/g, "'")                            // normaliza apóstrofos
    .trim()
}

// Gera variantes do nome para tentar caso o primeiro search falhe
function queryVariants(q: string): string[] {
  const base = normalizeQuery(q)
  const variants = new Set<string>([base])

  // Remove "the " do início
  variants.add(base.replace(/^the\s+/i, ''))

  // Remove pontuação
  variants.add(base.replace(/[^a-z0-9\s]/gi, ''))

  // Substitui & por and e vice-versa
  if (base.includes(' & ')) variants.add(base.replace(/ & /g, ' and '))
  if (base.toLowerCase().includes(' and ')) variants.add(base.replace(/ and /gi, ' & '))

  return [...variants].filter(Boolean)
}

async function searchMB(q: string, limit = 6) {
  // Tenta primeiro com query fuzzy (sem aspas), depois com variantes
  const variants = queryVariants(q)

  for (const variant of variants) {
    const encoded = encodeURIComponent(variant)
    const data    = await mbFetch(`/artist?query=${encoded}&limit=${limit}&fmt=json`)
    const artists = (data.artists ?? []).map((a: any) => ({
      mbid:           a.id,
      nome:           a.name,
      pais:           a.country ?? a.area?.name ?? null,
      tipo:           a['type'] ?? null,
      score:          a.score ?? 0,
      tags:           (a.tags ?? []).map((t: any) => t.name).slice(0, 8),
      disambiguation: a.disambiguation ?? null,
      begin_year:     a['life-span']?.begin ? parseInt(a['life-span'].begin.slice(0, 4)) : null,
    }))

    // Considera sucesso se algum resultado tem score >= 60
    const goodResults = artists.filter((a: any) => a.score >= 60)
    if (goodResults.length > 0) return artists

    await new Promise(r => setTimeout(r, 200))
  }

  return []
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const action = searchParams.get('action')

  try {
    if (action === 'search') {
      const q = searchParams.get('q')
      if (!q) return NextResponse.json({ error: 'q obrigatório' }, { status: 400 })

      const artists = await searchMB(q)
      return NextResponse.json({ artists })
    }

    if (action === 'artist') {
      const mbid = searchParams.get('mbid')
      if (!mbid) return NextResponse.json({ error: 'mbid obrigatório' }, { status: 400 })

      const data = await mbFetch(`/artist/${mbid}?inc=tags+genres&fmt=json`)
      return NextResponse.json({
        mbid: data.id,
        nome: data.name,
        pais: data.country ?? data.area?.name ?? null,
        tags: [...(data.tags ?? []), ...(data.genres ?? [])].map((t: any) => t.name).slice(0, 12),
        tipo: data.type ?? null,
      })
    }

    return NextResponse.json({ error: 'action inválida' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}