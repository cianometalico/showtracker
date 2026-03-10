// ── CONSTANTES DO ATELIÊ ──────────────────────────────────────────
const CUSTO_FIXO = 27.00
const VENDA_MEDIA = 62.50
const PISO = 8
const TETO = 42
const TETO_FESTIVAL = 28 // quando event_artists >= 3

// ── TIPOS ────────────────────────────────────────────────────────
export type ShowInput = {
  status_ingresso: string
  publico_estimado: number
  concorrentes: string
  qualidade_concorrencia: number
  fiscalizacao: boolean
  fiscalizacao_score?: number
  clima_estimado?: string
  chuva_prevista?: boolean
  venue_zona?: string        // 'Verde' | 'Vermelha' | ''
  artist_propensao?: number  // 1-5
  artist_genero?: string
  num_artistas?: number      // para regra de festival
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

// ── MULTIPLICADORES POR GÊNERO ────────────────────────────────────
const GENERO_MULT: Record<string, number> = {
  'HC':          1.2,
  'Metal':       1.2,
  'Rock':        1.0,
  'Emo':         1.1,
  'Post-Rock':   1.1,
  'Indie':       1.1,
  'Pop':         0.7,
  'Eletrônico':  0.6,
  'MPB':         0.5,
  'Jazz':        0.4,
  'Outro':       0.8,
}

// ── MULTIPLICADORES POR STATUS DE INGRESSOS ───────────────────────
const INGRESSO_MULT: Record<string, number> = {
  'sold out':             1.0,
  'último lote':          0.85,
  'lotes intermediários': 0.6,
  'mal vendido':          0.3,
  'não participei':       0,
}

// ── MULTIPLICADORES POR CONCORRENTES ─────────────────────────────
const CONCORRENTES_MULT: Record<string, number> = {
  'nenhum':   1.2,
  'poucos':   1.0,
  'moderado': 0.8,
  'muitos':   0.6,
}

// ── MOTOR PRINCIPAL ───────────────────────────────────────────────
export function calculateSuggestedVolume(input: ShowInput): InferenceResult {
  const alertas: string[] = []
  const notas: string[] = []

  // Não participou
  if (input.status_ingresso === 'não participei') {
    return { volume_sugerido: 0, volume_min: 0, volume_max: 0,
             margem_estimada: 0, receita_estimada: 0, alertas: ['Evento marcado como não participou.'], notas: [] }
  }

  // Base: propensão do artista (1-5) normalizada para 0.4–1.2
  const propensao = input.artist_propensao ?? 3
  const propensaoMult = 0.4 + ((propensao - 1) / 4) * 0.8

  // Gênero
  const generoMult = GENERO_MULT[input.artist_genero ?? ''] ?? 0.8

  // Ingressos
  const ingressoMult = INGRESSO_MULT[input.status_ingresso] ?? 0.5

  // Concorrentes
  const concorrentesMult = CONCORRENTES_MULT[input.concorrentes] ?? 1.0

  // Qualidade da concorrência (1-5): penaliza se alta
  const qualConcMult = input.qualidade_concorrencia
    ? 1 - ((input.qualidade_concorrencia - 1) / 4) * 0.3
    : 1.0

  // Teto base
  const numArtistas = input.num_artistas ?? 1
  const tetoBase = numArtistas >= 3 ? TETO_FESTIVAL : TETO

  if (numArtistas >= 3) notas.push(`Festival detectado (${numArtistas} artistas) — teto reduzido para ${TETO_FESTIVAL} peças/artista.`)

  // Volume bruto
  let volume = tetoBase * propensaoMult * generoMult * ingressoMult * concorrentesMult * qualConcMult

  // ── ZONA DO LOCAL ─────────────────────────────────────────────
  if (input.venue_zona === 'Vermelha') {
    volume *= 0.6
    alertas.push('⚠ Zona Vermelha — redutor de 40% aplicado (risco de fiscalização/saturação).')
  } else if (input.venue_zona === 'Verde') {
    notas.push('✓ Zona Verde — teto máximo mantido.')
  }

  // ── CHUVA ────────────────────────────────────────────────────
  if (input.chuva_prevista && volume > 16) {
    volume -= 6
    alertas.push('🌧 Chuva prevista — -6 peças aplicado.')
  }

  // ── FISCALIZAÇÃO ─────────────────────────────────────────────
  if (input.fiscalizacao) {
    const score = input.fiscalizacao_score ?? 3
    const fiscMult = 1 - (score / 5) * 0.5
    volume *= fiscMult
    alertas.push(`⚠ Fiscalização ativa (score ${score}/5) — redutor de ${Math.round((1 - fiscMult) * 100)}% aplicado.`)
  }

  // ── LIMITES ──────────────────────────────────────────────────
  volume = Math.round(volume)
  volume = Math.max(PISO, Math.min(tetoBase, volume))

  // Piso especial: se muito baixo, avisa
  if (volume === PISO) {
    notas.push(`Volume no piso operacional (${PISO} peças) — abaixo disso não compensa o setup.`)
  }

  // ── FINANCEIRO ───────────────────────────────────────────────
  const receita_estimada = volume * VENDA_MEDIA
  const custo_total = volume * CUSTO_FIXO
  const margem_estimada = receita_estimada - custo_total

  // ── RANGE ────────────────────────────────────────────────────
  const volume_min = Math.max(PISO, Math.round(volume * 0.8))
  const volume_max = Math.min(tetoBase, Math.round(volume * 1.2))

  return {
    volume_sugerido: volume,
    volume_min,
    volume_max,
    margem_estimada,
    receita_estimada,
    alertas,
    notas,
  }
}

// ── HELPER: ZONAS DOS LOCAIS ──────────────────────────────────────
export const VENUES_ZONA_VERDE = [
  'Carioca Club', 'Cine Joia', 'Hangar 110', 'Fabrique Club',
  'Áudio', 'Terra SP', 'Espaço Usine', 'Burning House',
  'Madame Sata', 'Casa Rocambole',
]

export const VENUES_ZONA_VERMELHA = [
  'Estádio do Morumbi', 'Allianz Parque', 'Anhembi',
  'Autódromo de Interlagos', 'Parque Ibirapuera',
  'Memorial Da América Latina', 'Espaço das Américas',
]

export function getVenueZona(nomeVenue: string): 'Verde' | 'Vermelha' | '' {
  if (VENUES_ZONA_VERDE.some(v => nomeVenue.includes(v))) return 'Verde'
  if (VENUES_ZONA_VERMELHA.some(v => nomeVenue.includes(v))) return 'Vermelha'
  return ''
}