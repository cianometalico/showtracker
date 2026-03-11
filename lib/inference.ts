import { type Genre } from './db/genres'

const CUSTO_FIXO = 27.00
const VENDA_MEDIA = 62.50
const PISO = 8
const TETO = 42
const TETO_FESTIVAL = 28

export type ShowInput = {
  status_ingresso: string
  publico_estimado: number
  concorrentes: string
  qualidade_concorrencia: number
  fiscalizacao: boolean
  fiscalizacao_score?: number
  chuva_prevista?: boolean
  venue_zona?: string
  artist_propensao?: number
  num_artistas?: number
  genre?: Genre | null  // ← vem do banco agora
}

export type InferenceResult = {
  volume_sugerido: number
  volume_min: number
  volume_max: number
  margem_estimada: number
  receita_estimada: number
  alertas: string[]
  notas: string[]
}

const INGRESSO_MULT: Record<string, number> = {
  'sold out':             1.0,
  'último lote':          0.85,
  'lotes intermediários': 0.6,
  'mal vendido':          0.3,
  'não participei':       0,
}

const CONCORRENTES_MULT: Record<string, number> = {
  'nenhum':   1.2,
  'poucos':   1.0,
  'moderado': 0.8,
  'muitos':   0.6,
}

export function calculateSuggestedVolume(input: ShowInput): InferenceResult {
  const alertas: string[] = []
  const notas: string[] = []

  if (input.status_ingresso === 'não participei') {
    return {
      volume_sugerido: 0, volume_min: 0, volume_max: 0,
      margem_estimada: 0, receita_estimada: 0,
      alertas: ['Evento marcado como não participou.'], notas: []
    }
  }

  // ── PROPENSÃO ────────────────────────────────────────────────
  const propensao = input.artist_propensao ?? 3
  const propensaoMult = 0.4 + ((propensao - 1) / 4) * 0.8

  // ── GÊNERO (data-driven) ─────────────────────────────────────
  const generoMult = input.genre?.multiplicador_propensao ?? 0.8
  if (input.genre) {
    notas.push(`Gênero: ${input.genre.nome} (${generoMult}x)`)
    if (input.genre.zona === 'Faminto') notas.push('🔥 Nicho faminto — público compra muito.')
    if (input.genre.zona === 'Saturado') alertas.push('⚠ Nicho saturado — considere diferenciação de estampa.')
  }

  // ── INGRESSOS ────────────────────────────────────────────────
  const ingressoMult = INGRESSO_MULT[input.status_ingresso] ?? 0.5

  // ── CONCORRENTES ─────────────────────────────────────────────
  const concorrentesMult = CONCORRENTES_MULT[input.concorrentes] ?? 1.0
  const qualConcMult = input.qualidade_concorrencia
    ? 1 - ((input.qualidade_concorrencia - 1) / 4) * 0.3
    : 1.0

  // ── TETO ─────────────────────────────────────────────────────
  const numArtistas = input.num_artistas ?? 1
  const tetoBase = numArtistas >= 3 ? TETO_FESTIVAL : TETO
  if (numArtistas >= 3) notas.push(`Festival (${numArtistas} artistas) — teto ${TETO_FESTIVAL} pç/artista.`)

  // ── VOLUME BRUTO ─────────────────────────────────────────────
  let volume = tetoBase * propensaoMult * generoMult * ingressoMult * concorrentesMult * qualConcMult

  // ── ZONA DO LOCAL ─────────────────────────────────────────────
  if (input.venue_zona === 'Vermelha') {
    volume *= 0.6
    alertas.push('⚠ Zona Vermelha — redutor de 40% (fiscalização/saturação).')
  } else if (input.venue_zona === 'Verde') {
    notas.push('✓ Zona Verde — teto máximo mantido.')
  }

  // ── CHUVA ────────────────────────────────────────────────────
  if (input.chuva_prevista && volume > 16) {
    volume -= 6
    alertas.push('🌧 Chuva prevista — -6 peças.')
  }

  // ── FISCALIZAÇÃO ─────────────────────────────────────────────
  if (input.fiscalizacao) {
    const score = input.fiscalizacao_score ?? 3
    const fiscMult = 1 - (score / 5) * 0.5
    volume *= fiscMult
    alertas.push(`⚠ Fiscalização score ${score}/5 — -${Math.round((1 - fiscMult) * 100)}%.`)
  }

  // ── LIMITES ──────────────────────────────────────────────────
  volume = Math.round(volume)
  volume = Math.max(PISO, Math.min(tetoBase, volume))
  if (volume === PISO) notas.push(`Volume no piso operacional (${PISO} pç).`)

  // ── FINANCEIRO ───────────────────────────────────────────────
  const receita_estimada = volume * VENDA_MEDIA
  const margem_estimada = receita_estimada - (volume * CUSTO_FIXO)
  const volume_min = Math.max(PISO, Math.round(volume * 0.8))
  const volume_max = Math.min(tetoBase, Math.round(volume * 1.2))

  return { volume_sugerido: volume, volume_min, volume_max, margem_estimada, receita_estimada, alertas, notas }
}

export function getVenueZona(nomeVenue: string): 'Verde' | 'Vermelha' | '' {
  const VERDE = ['Carioca Club', 'Cine Joia', 'Hangar 110', 'Fabrique Club', 'Áudio', 'Terra SP', 'Espaço Usine', 'Burning House', 'Madame Sata', 'Casa Rocambole']
  const VERMELHA = ['Estádio do Morumbi', 'Allianz Parque', 'Anhembi', 'Autódromo de Interlagos', 'Parque Ibirapuera', 'Memorial Da América Latina', 'Espaço das Américas']
  if (VERDE.some(v => nomeVenue.includes(v))) return 'Verde'
  if (VERMELHA.some(v => nomeVenue.includes(v))) return 'Vermelha'
  return ''
}