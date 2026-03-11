import { supabase } from '@/lib/supabase'

export type Genre = {
  id: string
  nome: string
  tags_mb: string[]
  multiplicador_propensao: number
  energia_tipica: number
  perfil_estetico_tipico: number
  zona: string
  notas: string
}

export async function getGenres(): Promise<Genre[]> {
  const { data, error } = await supabase.from('genres').select('*').order('nome')
  if (error) throw error
  return data ?? []
}

export async function getGenreByTag(tag: string): Promise<Genre | null> {
  const { data } = await supabase
    .from('genres')
    .select('*')
  if (!data) return null
  const tagLower = tag.toLowerCase()
  return data.find(g => g.tags_mb?.some((t: string) => tagLower.includes(t) || t.includes(tagLower))) ?? null
}

export async function getGenreByNome(nome: string): Promise<Genre | null> {
  const { data } = await supabase
    .from('genres')
    .select('*')
    .ilike('nome', nome)
    .single()
  return data ?? null
}

export async function resolveGenreFromTags(tags: string[]): Promise<Genre | null> {
  const { data } = await supabase.from('genres').select('*')
  if (!data) return null
  for (const tag of tags) {
    const tagLower = tag.toLowerCase()
    const match = data.find(g =>
      g.tags_mb?.some((t: string) => tagLower.includes(t) || t.includes(tagLower))
    )
    if (match) return match
  }
  return null
}