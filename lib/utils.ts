import type { ShowListItem, ShowWithRelations } from '@/types/database'

/** Retorna o nome de exibição do show: nome_evento ou artistas em billing_order */
export function getNomeEvento(
  show: Pick<ShowListItem | ShowWithRelations, 'nome_evento' | 'show_artists'>
): string {
  if (show.nome_evento) return show.nome_evento

  const artistas = [...(show.show_artists ?? [])]
    .sort((a, b) => a.billing_order - b.billing_order)
    .map((sa) => sa.artists.nome)

  if (artistas.length === 0) return 'Show sem artistas'
  if (artistas.length <= 3) return artistas.join(' / ')
  return artistas.slice(0, 2).join(' / ') + ` +${artistas.length - 2}`
}

/** Formata data ISO para exibição: "Sex, 31 Out" */
export function formatDataShow(iso: string): string {
  const date = new Date(iso + 'T12:00:00')
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day:     '2-digit',
    month:   'short',
  })
}

/** Retorna classe de cor para resultado_geral */
export function corResultado(resultado: string | null): string {
  switch (resultado) {
    case 'sucesso_total': return 'text-green-600'
    case 'sucesso':       return 'text-green-500'
    case 'medio':         return 'text-yellow-500'
    case 'fracasso':      return 'text-red-500'
    default:              return 'text-gray-400'
  }
}

/** Label legível para status_ingresso */
export function labelStatusIngresso(status: string): string {
  const map: Record<string, string> = {
    sold_out:       'Sold Out',
    ultimo_lote:    'Último Lote',
    intermediario:  'Intermediário',
    mal_vendido:    'Mal Vendido',
    nao_participei: 'Não Participei',
  }
  return map[status] ?? status
}

/** Label legível para resultado_geral */
export function labelResultado(resultado: string | null): string {
  if (!resultado) return '—'
  const map: Record<string, string> = {
    sucesso_total: 'Sucesso Total',
    sucesso:       'Sucesso',
    medio:         'Médio',
    fracasso:      'Fracasso',
  }
  return map[resultado] ?? resultado
}
