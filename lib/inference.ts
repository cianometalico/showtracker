// lib/inference.ts

const CUSTO_FIXO    = 27
const VENDA_MEDIA   = 62.50
const PISO          = 8
const TETO          = 42
const TETO_FESTIVAL = 28

export type StatusIngresso =
  | 'sold_out'
  | 'ultimo_lote'
  | 'intermediario'
  | 'mal_vendido'
  | 'nao_participei'

export type Clima  = 'sol' | 'nublado' | 'chuva' | 'frio'
export type GoNoGo = 'GO' | 'CUIDADO' | 'NO-GO'

export type ArtistInput = {
  id:                   string
  nome:                 string
  propensao_compra:     number        // 0–10
  genero_canonico:      string | null
  multiplicador_genero: number        // genres.multiplicador_propensao
  primeira_vez_brasil:  boolean
  zona:                 string | null
}

export type VenueInput = {
  id:         string
  nome:       string
  capacidade: number
  zona:       string | null
}

export type ShowInput = {
  id:                    string
  data:                  string
  status_ingresso:       StatusIngresso
  publico_estimado:      number | null
  fiscalizacao:          boolean
  fiscalizacao_score:    number | null   // 0–10
  risco_cancelamento:    boolean
  concorrencia:          number          // 0–10: 0=nenhuma, 10=saturado
  clima_estimado:        Clima | null
  n_artistas:            number
  motivo_urgencia:       string
  headliner:             ArtistInput
}

export type InferenceResult = {
  quantidade_sugerida: number
  go_no_go:            GoNoGo
  score_viabilidade:   number

  base_publico:        number
  base_propensao:      number
  mult_genero:         number
  mult_ingresso:       number
  mult_concorrencia:   number
  penalidade_zona:     number
  penalidade_chuva:    number
  penalidade_fisc:     number

  receita_estimada:    number
  lucro_estimado:      number
  break_even_pecas:    number
  notas:               string[]
}

export function calcPublicoEstimado(
  capacidade: number,
  status: StatusIngresso | null
): number {
  const fator: Record<StatusIngresso, number> = {
    'sold_out':       1.00,
    'ultimo_lote':    0.85,
    'intermediario':  0.60,
    'mal_vendido':    0.35,
    'nao_participei': 0.50,
  }
  return Math.round(capacidade * (fator[status ?? 'intermediario'] ?? 0.60))
}

function multIngresso(status: StatusIngresso): number {
  const m: Record<StatusIngresso, number> = {
    'sold_out':       1.00,
    'ultimo_lote':    0.85,
    'intermediario':  0.60,
    'mal_vendido':    0.30,
    'nao_participei': 0.50,
  }
  return m[status] ?? 0.60
}

// Concorrência contínua: 0 (nenhuma) → ×1.30 | 5 (moderada) → ×0.90 | 10 (saturado) → ×0.50
function multConcorrencia(score: number): number {
  const s = Math.max(0, Math.min(10, score))
  return 1.30 - (s / 10) * 0.80
}

function labelConcorrencia(score: number): string {
  if (score <= 1)  return 'Nenhuma'
  if (score <= 3)  return 'Pouca'
  if (score <= 6)  return 'Moderada'
  if (score <= 8)  return 'Forte'
  return 'Saturado'
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export function calculateSuggestedVolume(show: ShowInput): InferenceResult {
  const notas: string[] = []
  const teto = show.n_artistas >= 3 ? TETO_FESTIVAL : TETO

  const publico = show.publico_estimado
    ?? calcPublicoEstimado(1000, show.status_ingresso)

  // Propensão 0–10 → multiplicador relativo: 5=×1.0, 10=×1.8, 0=×0.2
  // NÃO é taxa absoluta — evita que propensão alta exploda o resultado
  const multPropensao  = 0.2 + (show.headliner.propensao_compra / 10) * 1.6
  const multGenero     = show.headliner.multiplicador_genero
  const base_propensao = Math.round(multPropensao * 100) / 100

  // Taxa base real de conversão (~3% do público compra de ambulante)
  const BASE_CONV      = 0.03
  const mIngresso      = multIngresso(show.status_ingresso)
  const mConcorrencia  = multConcorrencia(show.concorrencia)
  const taxa           = BASE_CONV * multPropensao * multGenero * mIngresso * mConcorrencia

  let qtd = Math.round(publico * taxa)

  let penZona  = 0
  let penChuva = 0
  let penFisc  = 0

  if (show.headliner.zona === 'vermelha') {
    penZona = Math.round(qtd * 0.40)
    qtd    -= penZona
    notas.push('Zona vermelha: -40% por risco de abordagem')
  }

  if (show.clima_estimado === 'chuva') {
    penChuva = 6
    qtd     -= penChuva
    notas.push('Chuva prevista: -6 peças (público disperso)')
  }

  if (show.fiscalizacao) {
    const fScore = show.fiscalizacao_score ?? 5
    penFisc      = Math.round(qtd * (fScore / 10) * 0.5)
    qtd         -= penFisc
    notas.push(`Fiscalização (score ${fScore}/10): -${penFisc} peças`)
  }

  if (show.risco_cancelamento) {
    notas.push('Atenção: risco de cancelamento — considere reduzir manualmente')
  }

  // Urgência de compra — bônus multiplicativo
  const MULT_URGENCIA: Record<string, number> = {
    nenhum:             1.00,
    primeira_vez_brasil: 1.20,
    despedida:          1.30,
    reuniao:            1.20,
    lancamento_album:   1.10,
  }
  const multUrgencia = MULT_URGENCIA[show.motivo_urgencia ?? 'nenhum'] ?? 1.0
  if (multUrgencia > 1.0) {
    const labels: Record<string, string> = {
      primeira_vez_brasil: 'Primeira vez no Brasil',
      despedida:           'Tour de despedida',
      reuniao:             'Reunião da banda',
      lancamento_album:    'Lançamento de álbum',
    }
    notas.push(`${labels[show.motivo_urgencia] ?? show.motivo_urgencia}: ×${multUrgencia.toFixed(2)} urgência de compra`)
    qtd = Math.round(qtd * multUrgencia)
    qtd = clamp(qtd, PISO, teto)
  }

  if (show.n_artistas >= 3) {
    notas.push(`Festival (${show.n_artistas} artistas) — teto reduzido para ${TETO_FESTIVAL} peças`)
  }

  if (show.concorrencia > 0) {
    notas.push(`Concorrência ${labelConcorrencia(show.concorrencia)} (${show.concorrencia}/10): ×${mConcorrencia.toFixed(2)}`)
  }

  qtd = clamp(qtd, PISO, teto)

  const receita    = qtd * VENDA_MEDIA
  const custo      = qtd * CUSTO_FIXO
  const lucro      = receita - custo
  const breakEven  = Math.ceil(CUSTO_FIXO / (VENDA_MEDIA - CUSTO_FIXO) * qtd)

  const score_raw =
    (taxa * 50)
    + (mIngresso * 20)
    + (mConcorrencia >= 1.2 ? 10 : mConcorrencia >= 1.0 ? 7 : mConcorrencia >= 0.8 ? 4 : 0)
    + (show.fiscalizacao ? 0 : 10)
    + (show.risco_cancelamento ? 0 : 10)

  const score  = clamp(Math.round(score_raw), 0, 100)
  const go_no_go: GoNoGo =
    score >= 60 && qtd >= 15 ? 'GO'      :
    score >= 35 || qtd >= 10 ? 'CUIDADO' :
    'NO-GO'

  return {
    quantidade_sugerida: qtd,
    go_no_go,
    score_viabilidade:   score,
    base_publico:        publico,
    base_propensao:      base_propensao,
    mult_genero:         multGenero,
    mult_ingresso:       mIngresso,
    mult_concorrencia:   Math.round(mConcorrencia * 100) / 100,
    penalidade_zona:     penZona,
    penalidade_chuva:    penChuva,
    penalidade_fisc:     penFisc,
    receita_estimada:    Math.round(receita),
    lucro_estimado:      Math.round(lucro),
    break_even_pecas:    breakEven,
    notas,
  }
}