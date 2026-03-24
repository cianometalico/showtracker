import { createClient } from '@/utils/supabase/server'
import { formatDataShow, labelResultado, labelStatusIngresso, corResultado } from '@/lib/utils'
import Link from 'next/link'

export default async function HomePage() {
  const hoje  = new Date()
  const em15  = new Date(hoje)
  em15.setDate(hoje.getDate() + 15)
  const from  = hoje.toISOString().slice(0, 10)
  const to    = em15.toISOString().slice(0, 10)

  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('shows')
    .select('id, data, nome_evento, status_ingresso, participou, resultado_geral, venues(id, nome, cidade)')
    .gte('data', from)
    .lte('data', to)
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
    const sas     = (saByShow[row.id] ?? []).sort((a, b) => a.billing_order - b.billing_order)
    const artistas = sas.map(sa => artistById[sa.artist_id]).filter(Boolean) as string[]
    const venue   = Array.isArray(row.venues) ? row.venues[0] : row.venues
    return { ...row, artistas, venue }
  })

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Próximos 15 dias</h1>
        <p className="text-sm text-gray-500 mt-1">
          {hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {shows.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum show nos próximos 15 dias.</p>
      ) : (
        <div className="space-y-2">
          {shows.map((show) => {
            const temEvento = Boolean(show.nome_evento)
            return (
              <Link
                key={show.id}
                href={`/shows/${show.id}`}
                className="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded hover:border-gray-400 transition-colors"
              >
                <span className="text-xs text-gray-400 w-28 shrink-0 font-mono">
                  {formatDataShow(show.data)}
                </span>

                <div className="flex-1 min-w-0">
                  {temEvento ? (
                    <>
                      <p className="text-sm font-medium text-gray-800 truncate">{show.nome_evento}</p>
                      {show.artistas.length > 0 && (
                        <p className="text-xs text-gray-400 truncate">{show.artistas.join(' / ')}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {show.artistas.length > 0 ? show.artistas.join(' / ') : '(sem nome)'}
                    </p>
                  )}
                </div>

                <span className="text-xs text-gray-400 truncate max-w-32 hidden sm:block">
                  {show.venue?.nome ?? '—'}
                </span>
                {show.resultado_geral ? (
                  <span className={`text-xs font-medium shrink-0 ${corResultado(show.resultado_geral)}`}>
                    {labelResultado(show.resultado_geral)}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 shrink-0">
                    {labelStatusIngresso(show.status_ingresso)}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}

      <div className="mt-8">
        <Link href="/shows/new" className="inline-flex items-center px-4 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-700">
          + Adicionar show
        </Link>
      </div>
    </div>
  )
}