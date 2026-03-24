// lib/readiness.ts
// Score de prontidão de dados para inferência
// Puro — sem I/O

// ============================================================
// TIPOS
// ============================================================

export type ProvenanceSource =
  | 'manual'            // alguém conferiu e preencheu
  | 'musicbrainz_auto'  // importado do MusicBrainz
  | 'lastfm_auto'       // importado do Last.fm
  | 'inferred'          // heurística automática
  | 'unknown'           // existia antes do sistema de proveniência
  | 'default'           // nunca tocado — valor padrão do schema
  | 'missing'           // campo null/ausente

export type ProvenanceEntry = {
  source:     ProvenanceSource
  updated_at: string | null
}

export type DataProvenance = {
  propensao_compra?: ProvenanceEntry
  genre_id?:         ProvenanceEntry
  zona?:             ProvenanceEntry
}

export type ReadinessField = {
  campo:      string
  label:      string
  pontos_max: number
  pontos:     number
  source:     ProvenanceSource
  bloqueante: boolean
  motivo?:    string   // explicação quando pontos < pontos_max
}

export type ReadinessResult = {
  score:        number          // 0–100
  low_confidence: boolean       // score < 65
  pronto:       boolean         // score >= 65
  campos:       ReadinessField[]
  blockers:     ReadinessField[] // campos bloqueantes com score 0
}

// ============================================================
// INPUT — o que a função precisa do artista
// ============================================================

export type ArtistReadinessInput = {
  propensao_compra:   number | null
  genre_id:           string | null
  zona:               string | null
  primeira_vez_brasil: boolean | null
  primeira_vez_brasil_confidence: 'verified' | 'auto' | 'inferred' | null
  mbid:               string | null
  lastfm_listeners:   number | null
  data_provenance:    DataProvenance | null
}

// ============================================================
// HELPERS
// ============================================================

function getProvenance(
  provenance: DataProvenance | null,
  campo: keyof DataProvenance
): ProvenanceSource {
  return provenance?.[campo]?.source ?? 'default'
}

function sourceScore(source: ProvenanceSource): number {
  switch (source) {
    case 'manual':           return 1.0
    case 'musicbrainz_auto': return 0.9
    case 'lastfm_auto':      return 0.8
    case 'inferred':         return 0.6
    case 'unknown':          return 0.5  // existia antes — assume razoável
    case 'default':          return 0.0  // nunca verificado
    case 'missing':          return 0.0
    default:                 return 0.0
  }
}

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

export function calculateReadinessScore(
  artist: ArtistReadinessInput
): ReadinessResult {
  const p = artist.data_provenance

  const campos: ReadinessField[] = []

  // ── genre_id (35 pts) ─────────────────────────────────────
  const genreSource = getProvenance(p, 'genre_id')
  const genrePresente = !!artist.genre_id
  const genrePontos = genrePresente
    ? Math.round(35 * Math.max(sourceScore(genreSource), 0.5)) // unknown ainda vale 50%
    : 0
  campos.push({
    campo:      'genre_id',
    label:      'Gênero linkado',
    pontos_max: 35,
    pontos:     genrePontos,
    source:     genrePresente ? genreSource : 'missing',
    bloqueante: true,
    motivo:     !genrePresente
      ? 'Sem gênero linkado — multiplicador de propensão será 1.0 (neutro)'
      : genreSource === 'default'
      ? 'Gênero presente mas nunca verificado'
      : undefined,
  })

  // ── propensao_compra (30 pts) ─────────────────────────────
  const propSource  = getProvenance(p, 'propensao_compra')
  const propPresente = artist.propensao_compra !== null
  const propDefault  = propSource === 'default' || artist.propensao_compra === 5
  const propPontos   = propPresente
    ? propDefault
      ? 8   // tem valor mas é suspeito de ser default
      : Math.round(30 * sourceScore(propSource))
    : 0
  campos.push({
    campo:      'propensao_compra',
    label:      'Propensão de compra',
    pontos_max: 30,
    pontos:     propPontos,
    source:     propPresente ? propSource : 'missing',
    bloqueante: true,
    motivo:     !propPresente
      ? 'Propensão não preenchida'
      : propDefault
      ? 'Valor 5 suspeito — pode ser default do schema, não avaliação real'
      : undefined,
  })

  // ── zona (10 pts) ─────────────────────────────────────────
  const zonaSource  = getProvenance(p, 'zona')
  const zonaPresente = !!artist.zona
  const zonaPontos   = zonaPresente ? Math.round(10 * Math.max(sourceScore(zonaSource), 0.5)) : 0
  campos.push({
    campo:      'zona',
    label:      'Zona de risco',
    pontos_max: 10,
    pontos:     zonaPontos,
    source:     zonaPresente ? zonaSource : 'missing',
    bloqueante: false,
    motivo:     !zonaPresente ? 'Zona não definida — penalidade de zona vermelha não será aplicada' : undefined,
  })

  // ── primeira_vez_brasil (10 pts) ──────────────────────────
  const pvbConf  = artist.primeira_vez_brasil_confidence
  const pvbPts   =
    pvbConf === 'verified' ? 10 :
    pvbConf === 'auto'     ?  7 :
    pvbConf === 'inferred' ?  4 :
    0
  campos.push({
    campo:      'primeira_vez_brasil',
    label:      'Primeira vez no Brasil',
    pontos_max: 10,
    pontos:     pvbPts,
    source:     pvbConf ? (pvbConf === 'verified' ? 'manual' : pvbConf === 'auto' ? 'musicbrainz_auto' : 'inferred') : 'missing',
    bloqueante: false,
    motivo:     !pvbConf ? 'Não verificado — bônus de primeira vez não será aplicado' : undefined,
  })

  // ── mbid (10 pts) ─────────────────────────────────────────
  const mbidPresente = !!artist.mbid
  campos.push({
    campo:      'mbid',
    label:      'MusicBrainz ID',
    pontos_max: 10,
    pontos:     mbidPresente ? 10 : 0,
    source:     mbidPresente ? 'musicbrainz_auto' : 'missing',
    bloqueante: false,
    motivo:     !mbidPresente ? 'Sem MBID — enriquecimento automático bloqueado' : undefined,
  })

  // ── lastfm_listeners (5 pts) ──────────────────────────────
  const lfmPresente = (artist.lastfm_listeners ?? 0) > 0
  campos.push({
    campo:      'lastfm_listeners',
    label:      'Last.fm listeners',
    pontos_max: 5,
    pontos:     lfmPresente ? 5 : 0,
    source:     lfmPresente ? 'lastfm_auto' : 'missing',
    bloqueante: false,
    motivo:     !lfmPresente ? 'Sem dados do Last.fm' : undefined,
  })

  const score   = campos.reduce((acc, c) => acc + c.pontos, 0)
  const blockers = campos.filter(c => c.bloqueante && c.pontos < c.pontos_max * 0.5)

  return {
    score,
    low_confidence: score < 65,
    pronto:         score >= 65,
    campos,
    blockers,
  }
}

// ============================================================
// QUERY DE PRIORIZAÇÃO (para usar no server)
// ============================================================

export type ArtistUrgency = {
  artist_id:      string
  nome:           string
  score:          number
  dias_ate_show:  number
  show_id:        string
  show_data:      string
  urgencia:       number
  blockers:       string[]
}

export function calcUrgencia(score: number, diasAteShow: number): number {
  // Quanto pior o score e mais próximo o show, maior a urgência
  return Math.round((100 - score) * (1 / Math.max(diasAteShow, 1)) * 100) / 100
}