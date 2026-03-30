import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const {
    mbid, name, country, founded_year,
    tags_editorial, tags_behavioral, listeners, wikipedia_url,
  } = body

  const enrichedData = {
    nome:               name,
    mbid:               mbid ?? null,
    pais:               country ?? null,
    founded_year:       founded_year ?? null,
    tags_editorial:     tags_editorial ?? [],
    tags_behavioral:    tags_behavioral ?? [],
    lastfm_listeners:   listeners ?? null,
    wikipedia_url:      wikipedia_url ?? null,
    ultima_atualizacao: new Date().toISOString(),
  }

  // 1. Tenta upsert por mbid (caso já exista artista enriquecido)
  if (mbid) {
    const { data: existing } = await (supabase as any)
      .from('artists')
      .select('id')
      .eq('mbid', mbid)
      .maybeSingle()

    if (existing) {
      const { data, error } = await (supabase as any)
        .from('artists')
        .update(enrichedData)
        .eq('id', existing.id)
        .select('id, nome, mbid')
        .single()
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, id: data.id, nome: data.nome, merged: false })
    }
  }

  // 2. Verifica se existe artista sem mbid com mesmo nome (criado via show)
  const { data: byName } = await (supabase as any)
    .from('artists')
    .select('id')
    .ilike('nome', name.trim())
    .is('mbid', null)
    .maybeSingle()

  if (byName) {
    // Atualiza o artista existente com os dados enriquecidos
    const { data, error } = await (supabase as any)
      .from('artists')
      .update(enrichedData)
      .eq('id', byName.id)
      .select('id, nome, mbid')
      .single()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: data.id, nome: data.nome, merged: true })
  }

  // 3. Cria novo artista
  const { data, error } = await (supabase as any)
    .from('artists')
    .insert(enrichedData)
    .select('id, nome, mbid')
    .single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id, nome: data.nome, merged: false })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const search = req.nextUrl.searchParams.get('search')

  let query = (supabase as any)
    .from('artists')
    .select('id, nome, mbid, pais, tags_editorial, tags_behavioral, lastfm_listeners, genre_id, ultima_atualizacao')

  if (search && search.length >= 2) {
    const { data, error } = await (supabase as any).rpc('search_artists', { search_term: search })
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, artists: data })
  }

  const { data, error } = await query.order('nome', { ascending: true })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, artists: data })
}