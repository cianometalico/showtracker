export function normalizeStr(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

export function similarity(a: string, b: string): number {
  const na = normalizeStr(a)
  const nb = normalizeStr(b)
  if (na === nb) return 1.0

  // Exact substring
  if (na.includes(nb) || nb.includes(na)) return 0.9

  // Token overlap
  const ta = new Set(na.split(/\s+/))
  const tb = new Set(nb.split(/\s+/))
  const intersection = [...ta].filter(x => tb.has(x)).length
  const union = new Set([...ta, ...tb]).size
  return intersection / union
}

export function bestMatch(nome: string, candidates: { id: string; name: string; country?: string; genres?: string[]; disambiguation?: string; begin?: string }[]) {
  if (!candidates.length) return null

  const scored = candidates.map(c => ({
    ...c,
    score: similarity(nome, c.name)
  })).sort((a, b) => b.score - a.score)

  const best = scored[0]
  const second = scored[1]

  const auto =
    best.score >= 0.95 || // quase perfeito sempre auto
    (best.score >= 0.85 && (!second || best.score - second.score >= 0.1))

  return { candidate: best, score: best.score, auto }
}