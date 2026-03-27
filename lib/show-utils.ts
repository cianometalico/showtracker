/** Returns true if the show date is in the past (before today midnight) */
export function isShowPast(data: string): boolean {
  return new Date(data + 'T23:59:59') < new Date()
}

/** Labels for participação toggle, tense-aware by show date */
export function participacaoLabel(data: string): { sim: string; nao: string } {
  return isShowPast(data)
    ? { sim: 'participei', nao: 'não participei' }
    : { sim: 'participarei', nao: 'não participarei' }
}
