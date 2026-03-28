import { createClient } from '@/utils/supabase/server'
import { EstoqueListClient } from './estoque-list-client'

export default async function EstoquePage() {
  const supabase = await createClient()

  const { data: stockRows } = await (supabase as any)
    .from('design_stock')
    .select('design_id, nome, artist_id, ativo, total_produzido, total_vendido, total_perdido, saldo_atual')
    .order('nome')

  const artistIds = [...new Set(((stockRows ?? []) as any[]).map((d: any) => d.artist_id))]
  const artistNames: Record<string, string> = {}

  if (artistIds.length > 0) {
    const { data: artists } = await (supabase as any)
      .from('artists')
      .select('id, nome')
      .in('id', artistIds)
    for (const a of (artists ?? []) as any[]) artistNames[a.id] = a.nome
  }

  const designs = ((stockRows ?? []) as any[]).map((d: any) => ({
    id:              d.design_id,
    nome:            d.nome,
    artista:         artistNames[d.artist_id] ?? '—',
    ativo:           d.ativo,
    total_produzido: d.total_produzido ?? 0,
    total_vendido:   d.total_vendido ?? 0,
    saldo_atual:     d.saldo_atual ?? 0,
  }))

  return <EstoqueListClient designs={designs} />
}
