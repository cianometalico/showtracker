import { createClient } from '@/utils/supabase/server'
import { ShowsListClient } from './shows-list-client'

export default async function ShowsPage() {
  const supabase = await createClient()

  const { data: rows, error: e1 } = await (supabase as any)
    .from('shows')
    .select('id, data, nome_evento, status_ingresso, participou, resultado_geral, clima_estimado, concorrencia, legado, venues(id, nome, cidade)')
    .order('data', { ascending: true })
  if (e1) console.error('[shows]', e1)

  const { data: saRows, error: e2 } = await (supabase as any)
    .from('show_artists')
    .select('show_id, artist_id, ordem, faz_estampa')
  if (e2) console.error('[show_artists]', e2)

  const { data: artistRows, error: e3 } = await (supabase as any)
    .from('artists')
    .select('id, nome, pais, tags_editorial')
  if (e3) console.error('[artists]', e3)

  const artistById: Record<string, { id: string; nome: string; pais: string | null; tags_editorial: string[] }> = {}
  for (const a of (artistRows ?? [])) {
    artistById[a.id] = a
  }

  const saByShow: Record<string, { artist_id: string; ordem: number; faz_estampa: boolean }[]> = {}
  for (const sa of (saRows ?? [])) {
    if (!saByShow[sa.show_id]) saByShow[sa.show_id] = []
    saByShow[sa.show_id].push({ artist_id: sa.artist_id, ordem: sa.ordem, faz_estampa: sa.faz_estampa })
  }

  const shows = (rows ?? []).map((row: any) => {
    const sas    = (saByShow[row.id] ?? []).sort((a, b) => a.ordem - b.ordem)
    const lineup = sas.map(sa => artistById[sa.artist_id]).filter(Boolean)
    const venue  = Array.isArray(row.venues) ? row.venues[0] : row.venues

    return {
      id:              row.id,
      data:            row.data,
      nome_evento:     row.nome_evento ?? null,
      artistas:        lineup.map(a => a.nome),
      venue:           venue ?? null,
      status_ingresso: row.status_ingresso ?? null,
      clima_estimado:  row.clima_estimado ?? null,
      concorrencia:    row.concorrencia ?? null,
      participou:      row.participou ?? false,
      resultado_geral: row.resultado_geral ?? null,
      legado:          row.legado ?? false,
    }
  })

  return <ShowsListClient shows={shows as any} totalRows={rows?.length ?? 0} />
}