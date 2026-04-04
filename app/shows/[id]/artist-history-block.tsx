import { getShowsByArtista } from '@/lib/db/shows'
import { ArtistTabsClient } from './artist-tabs-client'

type LineupArtist = {
  id:    string
  nome:  string
  mbid:  string | null
  ordem: number
}

type Props = {
  lineup:          LineupArtist[]
  currentShowId:   string
  currentShowData: string
}

type SetlistShow = {
  data:        string | null
  venue_nome:  string | null
  cidade:      string | null
  pais:        string | null
  estado:      string | null
  setlist_url: string | null
}

type RadiantShow = {
  id:          string
  data:        string
  nome_evento: string | null
  venue_nome:  string | null
  cidade:      string | null
}

type MergedRow = {
  sortDate:    string
  displayDate: string
  venue_nome:  string | null
  cidade:      string | null
  setlist_url: string | null
  radiant_id:  string | null
}

// ── Date helpers ──────────────────────────────────────────────

function sfDateToISO(ddmmyyyy: string | null): string | null {
  if (!ddmmyyyy) return null
  const [d, m, y] = ddmmyyyy.split('-')
  if (!d || !m || !y) return null
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function formatSFDate(ddmmyyyy: string | null): string {
  const iso = sfDateToISO(ddmmyyyy)
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00Z').toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatISODate(iso: string): string {
  return new Date(iso + 'T12:00:00Z').toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Merge logic (BRASIL: setlist BR + passados Radiant, dedup ±1d) ────────────

function mergeHistorico(setlist: SetlistShow[], passados: RadiantShow[]): MergedRow[] {
  const rows: MergedRow[] = passados.map(s => ({
    sortDate:    s.data,
    displayDate: formatISODate(s.data),
    venue_nome:  s.venue_nome,
    cidade:      s.cidade,
    setlist_url: null,
    radiant_id:  s.id,
  }))

  for (const s of setlist) {
    const iso = sfDateToISO(s.data)
    if (!iso) continue
    const isDup = rows.some(r => {
      const diff = Math.abs(new Date(iso).getTime() - new Date(r.sortDate).getTime())
      return diff <= 86_400_000
    })
    if (!isDup) {
      rows.push({
        sortDate:    iso,
        displayDate: formatSFDate(s.data),
        venue_nome:  s.venue_nome,
        cidade:      s.cidade,
        setlist_url: s.setlist_url,
        radiant_id:  null,
      })
    }
  }

  return rows.sort((a, b) => b.sortDate.localeCompare(a.sortDate)).slice(0, 5)
}

// ── Fetch ─────────────────────────────────────────────────────

async function fetchSetlist(action: string, mbid: string): Promise<SetlistShow[]> {
  try {
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    const res = await fetch(
      `${base}/api/setlistfm?action=${action}&mbid=${mbid}&limit_pages=1`,
      { next: { revalidate: 86400 } },
    )
    if (!res.ok) return []
    const data = await res.json()
    return ((data.shows ?? []) as SetlistShow[]).slice(0, 3)
  } catch {
    return []
  }
}

// ── Row renderer ──────────────────────────────────────────────

function ShowRow({ displayDate, venue_nome, cidade, setlist_url, radiant_id, isCurrent }: MergedRow & { isCurrent?: boolean }) {
  const label = [displayDate, venue_nome, cidade].filter(Boolean).join(' | ')
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: '0.4rem',
      fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
      color: isCurrent ? 'var(--accent-structure)' : 'var(--text-dim)',
    }}>
      <span>{label}</span>
      {isCurrent ? (
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>← este show</span>
      ) : radiant_id ? (
        <a href={`/shows/${radiant_id}`} style={linkStyle}>→</a>
      ) : setlist_url ? (
        <a href={setlist_url} target="_blank" rel="noopener noreferrer" style={linkStyle}>↗</a>
      ) : null}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────

export async function ArtistHistoryBlock({ lineup, currentShowId }: Props) {
  const hoje = new Date().toISOString().split('T')[0]

  const results = await Promise.all(
    lineup.map(async (artist) => {
      const [brasilShows, globalShows, showsResult] = await Promise.all([
        artist.mbid ? fetchSetlist('shows_brasil', artist.mbid) : Promise.resolve([] as SetlistShow[]),
        artist.mbid ? fetchSetlist('shows_global', artist.mbid) : Promise.resolve([] as SetlistShow[]),
        getShowsByArtista(artist.id, currentShowId),
      ])

      const all = showsResult.data
      const normalizar = (d: string) => d.split('T')[0]
      const passados = all.filter(s => normalizar(s.data) < hoje).slice(0, 3)
      const proximos  = all.filter(s => normalizar(s.data) >= hoje).slice(0, 3)

      const brasilRows = mergeHistorico(brasilShows, passados)

      const historicoRows: MergedRow[] = globalShows
        .map(s => {
          const iso = sfDateToISO(s.data)
          if (!iso) return null
          return {
            sortDate:    iso,
            displayDate: formatSFDate(s.data),
            venue_nome:  s.venue_nome,
            cidade:      s.cidade,
            setlist_url: s.setlist_url,
            radiant_id:  null,
          }
        })
        .filter((r): r is MergedRow => r !== null)
        .sort((a, b) => b.sortDate.localeCompare(a.sortDate))
        .slice(0, 5)

      return { artist, brasilRows, historicoRows, proximos }
    })
  )

  const withData = results.filter(r =>
    r.brasilRows.length > 0 ||
    r.historicoRows.length > 0 ||
    r.proximos.length > 0 ||
    r.artist.mbid !== null
  )
  if (withData.length === 0) return null

  return (
    <div>
      <p style={sectionLabelStyle}>HISTÓRICO · PRÓXIMOS</p>

      {withData.map((r, i) => {
        const brasilContent = r.brasilRows.length > 0
          ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {r.brasilRows.map((s, si) => <ShowRow key={si} {...s} />)}
            </div>
          )
          : null

        const historicoContent = r.artist.mbid
          ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {r.historicoRows.length === 0
                ? <p style={dimStyle}>sem histórico global</p>
                : r.historicoRows.map((s, si) => <ShowRow key={si} {...s} />)
              }
            </div>
          )
          : null

        const proximosContent = r.proximos.length > 0
          ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {r.proximos.map((s: RadiantShow) => (
                <ShowRow
                  key={s.id}
                  sortDate={s.data}
                  displayDate={formatISODate(s.data)}
                  venue_nome={s.venue_nome}
                  cidade={s.cidade}
                  setlist_url={null}
                  radiant_id={s.id}
                  isCurrent={s.id === currentShowId}
                />
              ))}
            </div>
          )
          : null

        return (
          <div key={r.artist.id}>
            {i > 0 && (
              <hr style={{ border: 'none', borderTop: '1px solid color-mix(in srgb, var(--border) 50%, transparent)', margin: '1rem 0' }} />
            )}
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '0.95rem', color: 'var(--text)', margin: '0 0 0.5rem' }}>
              {r.artist.nome}
            </p>
            <ArtistTabsClient
              brasilContent={brasilContent}
              historicoContent={historicoContent}
              proximosContent={proximosContent}
            />
          </div>
        )
      })}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 500,
  letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--accent-structure)', margin: '0 0 0.75rem',
}

const dimStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0,
}

const linkStyle: React.CSSProperties = {
  color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.68rem', flexShrink: 0,
}
