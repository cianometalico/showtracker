/**
 * Cores para nichos usando golden ratio para máxima separação entre hues.
 * - underground_score 1 → escuro/saturado
 * - underground_score 10 → claro/pastel
 */

// Golden ratio conjugate — garante hues maximamente separados
const GOLDEN = 0.618033988749895

// Seed determinístico pelo nome — mas distribuído pelo golden ratio
function nameToGoldenHue(nome: string): number {
  // hash simples para seed
  let hash = 0
  for (let i = 0; i < nome.length; i++) {
    hash = (hash * 31 + nome.charCodeAt(i)) >>> 0
  }
  // normaliza para 0-1 e aplica golden ratio
  const seed = (hash % 1000) / 1000
  const golden = (seed + GOLDEN) % 1.0
  // mapeia para 0-360, pulando verde puro (115-145°)
  let hue = Math.round(golden * 360)
  if (hue >= 115 && hue <= 145) hue = (hue + 60) % 360
  return hue
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