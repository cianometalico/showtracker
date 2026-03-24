import { createClient } from '@/utils/supabase/server'
import { AgendaClient } from './agenda-client'

export default async function AgendaPage() {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('shows')
    .select('id, data, nome_evento, status_ingresso, participou, resultado_geral, venues(id, nome)')
    .order('data', { ascending: true })

  const { data: saRows } = await supabase
    .from('show_artists')
    .select('show_id, artist_id, billing_order')

  const { data: artistRows } = await supabase
    .from('artists')
    .select('id, nome')

  const artistById: Record<string, string> = {}
  for (const a of (artistRows ?? []) as { id: string; nome: string }[]) artistById[a.id] = a.nome

  const saByShow: Record<string, { artist_id: string; billing_order: number }[]> = {}
  for (const sa of (saRows ?? []) as { show_id: string; artist_id: string; billing_order: number }[]) {
    if (!saByShow[sa.show_id]) saByShow[sa.show_id] = []
    saByShow[sa.show_id].push(sa)
  }

  const shows = (rows ?? []).map((row: any) => {
    const sas      = (saByShow[row.id] ?? []).sort((a, b) => a.billing_order - b.billing_order)
    const artistas = sas.map(sa => artistById[sa.artist_id]).filter(Boolean) as string[]
    const venue    = Array.isArray(row.venues) ? row.venues[0] : row.venues
    const nome     = row.nome_evento ?? (artistas.length > 0 ? artistas.join(' / ') : '(sem nome)')
    return {
      id:             row.id,
      data:           row.data,
      nome,
      nome_evento:    row.nome_evento ?? null,
      artistas,
      venue:          venue ?? null,
      status_ingresso: row.status_ingresso,
      participou:     row.participou,
      resultado_geral: row.resultado_geral ?? null,
    }
  })

  return <AgendaClient shows={shows} />
}