import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

function norm(t: string): string {
  return t.toLowerCase().trim()
}

// verifica se dois termos são suficientemente similares
function tagsMatch(artistTag: string, nichoTag: string): boolean {
  const a = norm(artistTag)
  const n = norm(nichoTag)
  if (a === n) return true
  // match parcial só se o nicho tag tiver 8+ chars (específico o suficiente)
  if (n.length >= 8 && a.includes(n)) return true
  if (n.length >= 8 && n.includes(a)) return true
  return false
}

export async function POST() {
  const supabase = await createClient()

  // limpa vínculos anteriores
  await (supabase as any)
    .from('artist_nichos')
    .delete()
    .neq('artist_id', '00000000-0000-0000-0000-000000000000')

  const { data: nichos } = await (supabase as any)
    .from('nichos')
    .select('id, nome, tags')  // APENAS tags — gêneros musicais reais, não descritores

  const { data: artists } = await (supabase as any)
    .from('artists')
    .select('id, nome, tags_editorial, tags_behavioral')

  if (!nichos?.length || !artists?.length) {
    return NextResponse.json({ ok: true, linked: 0 })
  }

  const rows: { artist_id: string; nicho_id: string; score: number }[] = []

  for (const artist of artists) {
    const artistTags: string[] = [
      ...((artist.tags_editorial as string[] | null) ?? []),
      ...((artist.tags_behavioral as { name: string }[] | null)?.map((t: any) => t.name) ?? []),
    ]

    if (artistTags.length === 0) continue

    for (const nicho of nichos) {
      const nichoTags = ((nicho.tags as string[] | null) ?? [])
      if (nichoTags.length === 0) continue

      const matches = artistTags.filter(at =>
        nichoTags.some(nt => tagsMatch(at, nt))
      )

      // exige pelo menos 1 match de tag de gênero musical real
      if (matches.length === 0) continue

      const score = Math.min(1.0, matches.length / 3)
      rows.push({ artist_id: artist.id, nicho_id: nicho.id, score })
      console.log(`  [link] ${artist.nome} → ${nicho.nome} (${matches.join(', ')})`)
    }
  }

  if (rows.length > 0) {
    await (supabase as any).from('artist_nichos').insert(rows)
  }

  console.log(`\n[link-nichos] ${rows.length} vínculos criados`)
  return NextResponse.json({ ok: true, linked: rows.length })
}