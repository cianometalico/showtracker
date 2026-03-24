// app/api/scrape/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL obrigatória' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ShowTracker/1.0)',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return NextResponse.json({ error: `HTTP ${res.status}` }, { status: 400 })
    const html = await res.text()

    const data = parseEventPage(url, html)
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Falha ao carregar URL' }, { status: 500 })
  }
}

function parseEventPage(url: string, html: string) {
  const result: Record<string, string | null> = {
    nome_evento:  null,
    data:         null,
    horario:      null,
    venue_nome:   null,
    venue_cidade: null,
    artistas:     null, // JSON string de array
    source:       url,
  }

  // ── Helpers ─────────────────────────────────────────────
  function tag(selector: string): string | null {
    const m = html.match(new RegExp(`<${selector}[^>]*>([^<]{1,300})<`, 'i'))
    return m ? m[1].trim() : null
  }
  function meta(name: string): string | null {
    const patterns = [
      new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']{1,300})["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']{1,300})["'][^>]+(?:name|property)=["']${name}["']`, 'i'),
    ]
    for (const p of patterns) {
      const m = html.match(p)
      if (m) return m[1].trim()
    }
    return null
  }
  function jsonLd(): any {
    const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    for (const m of matches) {
      try {
        const obj = JSON.parse(m[1])
        if (obj['@type'] === 'Event' || obj['@type'] === 'MusicEvent') return obj
        if (Array.isArray(obj)) {
          const ev = obj.find(o => o['@type'] === 'Event' || o['@type'] === 'MusicEvent')
          if (ev) return ev
        }
      } catch {}
    }
    return null
  }

  // ── JSON-LD (melhor fonte) ───────────────────────────────
  const ld = jsonLd()
  if (ld) {
    result.nome_evento = ld.name ?? null

    if (ld.startDate) {
      const d = new Date(ld.startDate)
      if (!isNaN(d.getTime())) {
        result.data    = d.toISOString().slice(0, 10)
        result.horario = d.toISOString().slice(11, 16) !== '00:00' ? d.toISOString().slice(11, 16) : null
      }
    }

    const loc = ld.location
    if (loc) {
      result.venue_nome   = loc.name ?? null
      result.venue_cidade = loc.address?.addressLocality ?? loc.address ?? null
    }

    const performers = ld.performer
    if (performers) {
      const lista = Array.isArray(performers) ? performers : [performers]
      const nomes = lista.map((p: any) => p.name ?? p).filter(Boolean)
      if (nomes.length) result.artistas = JSON.stringify(nomes)
    }

    return result
  }

  // ── OpenGraph / meta fallback ────────────────────────────
  result.nome_evento = meta('og:title') ?? meta('title') ?? tag('h1') ?? null

  const dateStr = meta('event:start_time') ?? meta('startDate') ?? null
  if (dateStr) {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      result.data    = d.toISOString().slice(0, 10)
      result.horario = d.toISOString().slice(11, 16) !== '00:00' ? d.toISOString().slice(11, 16) : null
    }
  }

  // Tenta extrair data de padrões comuns no HTML (dd/mm/yyyy ou yyyy-mm-dd)
  if (!result.data) {
    const dateMatch = html.match(/(\d{4}-\d{2}-\d{2})/) ?? html.match(/(\d{2})\/(\d{2})\/(\d{4})/)
    if (dateMatch) {
      if (dateMatch[0].includes('-')) {
        result.data = dateMatch[0]
      } else {
        result.data = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
      }
    }
  }

  result.venue_nome = meta('event:location') ?? null

  return result
}