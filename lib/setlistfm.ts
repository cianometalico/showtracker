const SL_BASE = 'https://api.setlist.fm/rest/1.0'

function getHeaders() {
  return {
    'x-api-key': process.env.SETLISTFM_API_KEY ?? '',
    'Accept': 'application/json',
  }
}

export type Setlist = {
  id: string
  eventDate: string
  venue: { name: string; city: { name: string; country: { name: string } } }
  sets: { set: { song: { name: string }[] }[] }
  url: string
}

export async function searchSetlists(artistName: string, p = 1): Promise<{
  total: number
  setlists: Setlist[]
}> {
  const url = `${SL_BASE}/search/setlists?artistName=${encodeURIComponent(artistName)}&p=${p}&countryCode=BR`
  const res = await fetch(url, { headers: getHeaders() })
  if (!res.ok) return { total: 0, setlists: [] }
  const data = await res.json()
  return {
    total: data.total ?? 0,
    setlists: data.setlist ?? [],
  }
}

export async function getArtistSetlists(mbid: string, p = 1): Promise<{
  total: number
  setlists: Setlist[]
}> {
  const url = `${SL_BASE}/artist/${mbid}/setlists?p=${p}`
  const res = await fetch(url, { headers: getHeaders() })
  if (!res.ok) return { total: 0, setlists: [] }
  const data = await res.json()
  return {
    total: data.total ?? 0,
    setlists: data.setlist ?? [],
  }
}

export function extractTopSongs(setlists: Setlist[], limit = 10): string[] {
  const freq: Record<string, number> = {}
  for (const sl of setlists) {
    for (const set of sl.sets?.set ?? []) {
      for (const song of set.song ?? []) {
        if (song.name) freq[song.name] = (freq[song.name] ?? 0) + 1
      }
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name)
}