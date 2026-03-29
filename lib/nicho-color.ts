/**
 * Cores para nichos usando golden ratio para máxima separação entre hues.
 * - underground_score 1 → escuro/saturado
 * - underground_score 10 → claro/pastel
 *
 * Exclusion zones evitam colisão com cores do sistema visual:
 *   status-neg (~4°), amber (~44°), cyan (~190°), status-pos (~220°)
 */

// Golden ratio conjugate — garante hues maximamente separados
const GOLDEN = 0.618033988749895

// Faixas reservadas para cores do sistema visual
const EXCLUSION_ZONES: [number, number][] = [
  [0, 20],    // status-neg (tomato ~4°)
  [350, 360], // status-neg wrap-around
  [35, 55],   // amber (~44°)
  [180, 200], // cyan (~190°)
  [210, 230], // status-pos (~220°)
]

function isExcluded(hue: number): boolean {
  return EXCLUSION_ZONES.some(([min, max]) => hue >= min && hue <= max)
}

function shiftHue(hue: number): number {
  let h = hue % 360
  let iterations = 0
  while (isExcluded(h) && iterations < 20) {
    h = (h + 23) % 360  // 23° — passo assimétrico para não cair em loop
    iterations++
  }
  return h
}

// Seed determinístico pelo nome — distribuído pelo golden ratio
function nameToGoldenHue(nome: string): number {
  let hash = 0
  for (let i = 0; i < nome.length; i++) {
    hash = (hash * 31 + nome.charCodeAt(i)) >>> 0
  }
  const seed = (hash % 1000) / 1000
  const golden = (seed + GOLDEN) % 1.0
  const rawHue = Math.round(golden * 360)
  return shiftHue(rawHue)
}

export function nichoColor(nome: string, underground_score: number = 5): string {
  const hue        = nameToGoldenHue(nome)
  const lightness  = 55 + (underground_score - 1) * (25 / 9)  // 55% → 80%
  const saturation = 80 - (underground_score - 1) * (25 / 9)  // 80% → 55%
  return `hsl(${hue}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`
}

export function nichoColorAlpha(nome: string, underground_score: number = 5, alpha = 0.15): string {
  const hue        = nameToGoldenHue(nome)
  const lightness  = 55 + (underground_score - 1) * (25 / 9)
  const saturation = 80 - (underground_score - 1) * (25 / 9)
  return `hsla(${hue}, ${Math.round(saturation)}%, ${Math.round(lightness)}%, ${alpha})`
}
