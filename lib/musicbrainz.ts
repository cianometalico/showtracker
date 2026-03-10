const MB_BASE = 'https://musicbrainz.org/ws/2'
const MB_HEADERS = {
  'User-Agent': 'ShowTracker/2.0 (contato@showtracker.app)',
  'Accept': 'application/json',
}

export type MBArtist = {
  id: string
  name: string
  country?: string
  genres?: string[]
  disambiguation?: string
  begin?: string // ano de início
}

export async function searchArtist(nome: string): Promise<MBArtist[]> {
  const url = `${MB_BASE}/artist?query=${encodeURIComponent(nome)}&limit=5&fmt=json`
  const res = await fetch(url, { headers: MB_HEADERS })
  if (!res.ok) return []
  const data = await res.json()
  return (data.artists ?? []).map((a: any) => ({
    id: a.id,
    name: a.name,
    country: a.country,
    genres: a.tags?.map((t: any) => t.name) ?? [],
    disambiguation: a.disambiguation,
    begin: a['life-span']?.begin?.slice(0, 4),
  }))
}

export async function getArtistById(mbid: string): Promise<MBArtist | null> {
  const url = `${MB_BASE}/artist/${mbid}?inc=tags&fmt=json`
  const res = await fetch(url, { headers: MB_HEADERS })
  if (!res.ok) return null
  const a = await res.json()
  return {
    id: a.id,
    name: a.name,
    country: a.country,
    genres: a.tags?.map((t: any) => t.name) ?? [],
    disambiguation: a.disambiguation,
    begin: a['life-span']?.begin?.slice(0, 4),
  }
}