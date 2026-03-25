# SKELETON-AUDIT

Conteúdo completo dos arquivos de estrutura do Radiant. Nenhuma modificação.

---

## 1. app/layout.tsx

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Radiant',
  description: 'Sistema operacional para vendas em shows',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <aside style={{
            width: 164,
            flexShrink: 0,
            background: 'var(--nav-bg)',
            borderRight: '1px solid var(--nav-border)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Logo */}
            <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--nav-border)' }}>
              <span style={{
                fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 700,
                letterSpacing: '0.15em', textTransform: 'uppercase' as const,
                color: 'var(--text)',
              }}>
                Radiant
              </span>
            </div>

            <nav style={{ padding: '0.5rem 0', flex: 1 }}>

              {/* Home */}
              <Link href="/" className="nav-link" aria-label="Página inicial">
                <span aria-hidden="true" style={{ marginRight: '0.5rem', fontWeight: 600 }}>☰</span>
                home
              </Link>

              {/* Separador */}
              <div style={{ margin: '0.4rem 1rem', borderTop: '1px solid var(--nav-border)', opacity: 0.5 }} />

              {/* Calendário + Agenda */}
              <Link href="/agenda" className="nav-link">calendário</Link>
              <Link href="/shows" className="nav-link">agenda</Link>

              {/* Separador */}
              <div style={{ margin: '0.4rem 1rem', borderTop: '1px solid var(--nav-border)', opacity: 0.5 }} />

              {/* Artistas/Bandas + Públicos */}
              <Link href="/artistas" className="nav-link">artistas</Link>
              <Link href="/publicos" className="nav-link">públicos</Link>

              {/* Separador */}
              <div style={{ margin: '0.4rem 1rem', borderTop: '1px solid var(--nav-border)', opacity: 0.5 }} />

              {/* Locais */}
              <Link href="/locais" className="nav-link">locais</Link>

              {/* Separador */}
              <div style={{ margin: '0.4rem 1rem', borderTop: '1px solid var(--nav-border)', opacity: 0.5 }} />

              {/* Ohara — destaque visual diferente */}
              <Link href="/ohara" className="nav-link" style={{ opacity: 0.6, fontStyle: 'italic' }}>
                ⟳ ohara
              </Link>

            </nav>

            <div style={{
              padding: '1rem',
              borderTop: '1px solid var(--nav-border)',
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
              fontFamily: 'monospace',
              letterSpacing: '0.05em',
            }}>
              v0.1.0
            </div>
          </aside>

          <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
```

---

## 2. app/shows/[id]/page.tsx

```tsx
import { WeatherWidget } from './weather-widget'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

function isPast(iso: string) {
  return new Date(iso + 'T23:59:59') < new Date()
}

function formatData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

const LABEL_STATUS: Record<string, string> = {
  'sold out': 'Sold Out',
  'bem vendido': 'Bem Vendido',
  'mal vendido': 'Mal Vendido',
}

const LABEL_RESULTADO: Record<string, string> = {
  sucesso_total: 'Sucesso Total',
  sucesso: 'Sucesso',
  medio: 'Médio',
  fracasso: 'Fracasso',
}

const COR_RESULTADO: Record<string, string> = {
  sucesso_total: '#4ade80',
  sucesso: '#4ade80',
  medio: '#fbbf24',
  fracasso: '#f87171',
}

export default async function ShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: show, error } = await supabase
    .from('shows')
    .select('id, data, nome_evento, status_ingresso, participou, resultado_geral, clima_estimado, concorrencia, observacoes, publico_estimado, singularidades, venue_id, venues(id, nome, cidade, capacidade_praticavel, zona_risco, lat, lng)')
    .eq('id', id)
    .single() as any

  if (error || !show) notFound()

  const { data: saRows } = await supabase
    .from('show_artists')
    .select('artist_id, ordem, faz_estampa, artists(id, nome, pais, tags_editorial, lastfm_listeners)')
    .eq('show_id', id)
    .order('ordem', { ascending: true }) as any

  const lineup = (saRows ?? []).map((sa: any) => ({
    artist_id: sa.artist_id,
    ordem: sa.ordem,
    faz_estampa: sa.faz_estampa,
    artist: Array.isArray(sa.artists) ? sa.artists[0] : sa.artists,
  }))

  const venue = Array.isArray(show.venues) ? show.venues[0] : show.venues
  const past = isPast(show.data)
  const nomeShow = show.nome_evento ?? lineup.map((l: any) => l.artist?.nome).filter(Boolean).join(' / ') ?? '—'
  const singularidades = (show.singularidades as string[] | null) ?? []

  return (
    <div style={{ padding: '1.5rem', maxWidth: 680 }}>

      {/* Breadcrumb */}
      <Link href="/shows" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textDecoration: 'none' }}>
        ← Shows
      </Link>

      {/* Header */}
      <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.3 }}>
            {nomeShow}
          </h1>
          {show.resultado_geral && (
            <span style={{
              fontSize: '0.75rem', fontWeight: 600, flexShrink: 0,
              color: COR_RESULTADO[show.resultado_geral] ?? 'var(--text-dim)',
              border: `1px solid ${COR_RESULTADO[show.resultado_geral] ?? 'var(--border)'}`,
              padding: '0.2rem 0.6rem', borderRadius: 4,
            }}>
              {LABEL_RESULTADO[show.resultado_geral] ?? show.resultado_geral}
            </span>
          )}
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 6 }}>
          {formatData(show.data)}
          {venue && <> · {venue.nome}, {venue.cidade}</>}
        </p>

        {/* Singularidades */}
        {singularidades.length > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: 8 }}>
            {singularidades.map((tag: string) => (
              <span key={tag} style={{
                fontSize: '0.7rem', padding: '0.15rem 0.5rem',
                background: '#1a1a2a', border: '1px solid var(--blue)',
                borderRadius: 3, color: 'var(--blue)',
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Métricas */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Status', value: LABEL_STATUS[show.status_ingresso ?? ''] ?? show.status_ingresso ?? '—' },
          { label: 'Público est.', value: show.publico_estimado ? show.publico_estimado.toLocaleString('pt-BR') : '—' },
          { label: 'Concorrência', value: show.concorrencia ?? '—' },
          { label: past ? 'Realizado' : 'Previsto', value: past ? (show.participou ? 'Sim' : 'Não') : '—' },
          { label: 'Clima', value: (
              <WeatherWidget
                data={show.data}
                lat={venue?.lat ?? null}
                lng={venue?.lng ?? null}
                climaSalvo={show.clima_estimado ?? null}
              />
            )
          }
        ].map(({ label, value }) => (
          <div key={label} style={{
            border: '1px solid var(--border)', borderRadius: 6,
            padding: '0.6rem 0.9rem', background: 'var(--surface)', minWidth: 100,
          }}>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{label}</p>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', margin: '2px 0 0' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Lineup */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Lineup
        </p>
        {lineup.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Sem artistas cadastrados.</p>
        ) : (
          <div>
            {lineup.map((l: any) => (
              <div key={l.artist_id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.5rem 0', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)', width: 16 }}>
                  {l.ordem}
                </span>
                <Link href={`/artistas/${l.artist_id}`} style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text)', textDecoration: 'none' }}>
                  {l.artist?.nome ?? '—'}
                </Link>
                {l.artist?.pais && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{l.artist.pais}</span>
                )}
                {l.artist?.lastfm_listeners && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                    {l.artist.lastfm_listeners.toLocaleString('pt-BR')}
                  </span>
                )}
                {l.faz_estampa && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--cyan)', padding: '0.1rem 0.4rem', border: '1px solid var(--cyan)', borderRadius: 3 }}>
                    estampa
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Venue */}
      {venue && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Venue
          </p>
          <Link href={`/locais/${venue.id}`} style={{ textDecoration: 'none' }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '0.75rem 1rem', background: 'var(--surface)' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>{venue.nome}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '2px 0 0' }}>
                {venue.cidade}
                {venue.capacidade_praticavel && ` · cap. ${venue.capacidade_praticavel.toLocaleString('pt-BR')}`}
                {venue.zona_risco && <span style={{ color: 'var(--red)', marginLeft: 6 }}>zona de risco</span>}
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* Observações */}
      {show.observacoes && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Observações
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>{show.observacoes}</p>
        </div>
      )}

      {/* Editar */}
      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <Link href={`/shows/${id}/editar`}
          style={{
            fontSize: '0.8rem', color: 'var(--text-dim)',
            textDecoration: 'none', border: '1px solid var(--border)',
            padding: '0.35rem 0.85rem', borderRadius: 4, background: 'var(--surface-2)',
          }}>
          Editar show
        </Link>
      </div>

    </div>
  )
}
```

---

## 3. app/artistas/[id]/page.tsx

```tsx
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { NichoManager } from './nicho-manager'
import { nichoColor } from '@/lib/nicho-color'

export default async function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: artist, error } = await (supabase as any)
    .from('artists')
    .select('id, nome, pais, mbid, tags_editorial, tags_behavioral, lastfm_listeners, wikipedia_url, genre_id, ultima_atualizacao')
    .eq('id', id)
    .single()

  if (error || !artist) notFound()

  const { data: saRows } = await (supabase as any)
    .from('show_artists')
    .select('show_id, ordem, faz_estampa')
    .eq('artist_id', id)

  const showIds = (saRows ?? []).map((sa: any) => sa.show_id)
  let shows: any[] = []

  if (showIds.length > 0) {
    const { data: showRows } = await (supabase as any)
      .from('shows')
      .select('id, data, nome_evento, status_ingresso, participou, resultado_geral, venues(id, nome, cidade)')
      .in('id', showIds)
      .order('data', { ascending: false })

    const saByShow: Record<string, any> = {}
    for (const sa of (saRows ?? [])) saByShow[sa.show_id] = sa

    shows = (showRows ?? []).map((s: any) => ({
      ...s,
      venue: Array.isArray(s.venues) ? s.venues[0] : s.venues,
      ordem: saByShow[s.id]?.ordem ?? 1,
      faz_estampa: saByShow[s.id]?.faz_estampa ?? false,
    }))
  }

  const participados = shows.filter(s => s.participou)
  const comResultado = participados.filter(s => s.resultado_geral)
  const sucessos = comResultado.filter(s => ['sucesso', 'sucesso_total'].includes(s.resultado_geral))
  const taxaSucesso = comResultado.length > 0 ? Math.round((sucessos.length / comResultado.length) * 100) : null

  const tags_editorial = (artist.tags_editorial as string[] | null) ?? []
  const tags_behavioral = (artist.tags_behavioral as { name: string; count?: number }[] | null) ?? []

  // todos os nichos disponíveis
  const { data: allNichos } = await (supabase as any)
    .from('nichos')
    .select('id, nome, underground_score')
    .order('underground_score', { ascending: true })

  // nichos já vinculados a este artista
  const { data: artistNichos } = await (supabase as any)
    .from('artist_nichos')
    .select('nicho_id')
    .eq('artist_id', id)

  const linkedNichoIds = (artistNichos ?? []).map((an: any) => an.nicho_id)

  const nichosForManager = (allNichos ?? []).map((n: any) => ({
    id: n.id,
    nome: n.nome,
    underground_score: n.underground_score ?? 5,
    cor: nichoColor(n.nome, n.underground_score ?? 5),
  }))

  return (
    <div style={{ padding: '1.5rem', maxWidth: 720 }}>

      <Link href="/artistas" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textDecoration: 'none' }}>
        ← Artistas
      </Link>

      <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{artist.nome}</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 4 }}>
          {[artist.pais, artist.lastfm_listeners ? artist.lastfm_listeners.toLocaleString('pt-BR') + ' listeners' : null]
            .filter(Boolean).join(' · ') || '—'}
        </p>
        {artist.mbid && (
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'monospace' }}>
            mbid: {artist.mbid}
          </p>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Shows', value: String(shows.length) },
          { label: 'Participei', value: String(participados.length) },
          { label: 'Taxa sucesso', value: taxaSucesso !== null ? `${taxaSucesso}%` : '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            flex: 1, border: '1px solid var(--border)', borderRadius: 6,
            padding: '0.75rem', textAlign: 'center', background: 'var(--surface)',
          }}>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{value}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Nichos */}
      <NichoManager
        artistId={id}
        allNichos={nichosForManager}
        linkedNichoIds={linkedNichoIds}
      />

      {/* Tags */}
      {(tags_editorial.length > 0 || tags_behavioral.length > 0) && (
        <div style={{ marginBottom: '1.5rem' }}>
          {tags_editorial.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                MusicBrainz
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {tags_editorial.map((t: string, i: number) => (
                  <span key={i} style={{
                    background: '#1a2a1a', padding: '0.15rem 0.5rem',
                    borderRadius: 3, fontSize: '0.75rem', border: '1px solid #2a3a2a', color: 'var(--text)',
                  }}>{t}</span>
                ))}
              </div>
            </div>
          )}
          {tags_behavioral.length > 0 && (
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Last.fm
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {tags_behavioral.map((t: any, i: number) => (
                  <span key={i} style={{
                    background: '#1a1a2a', padding: '0.15rem 0.5rem',
                    borderRadius: 3, fontSize: '0.75rem', border: '1px solid #2a2a3a', color: 'var(--text)',
                  }}>
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enriquecer */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href={`/ohara?prefill=${encodeURIComponent(artist.nome)}`}
          style={{
            display: 'inline-block', padding: '0.4rem 1rem',
            fontSize: '0.8rem', background: 'var(--surface-2)',
            color: 'var(--text-dim)', border: '1px solid var(--border)',
            borderRadius: 4, textDecoration: 'none',
          }}>
          Re-enriquecer via ohara →
        </Link>
        {artist.ultima_atualizacao && (
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.75rem' }}>
            atualizado {new Date(artist.ultima_atualizacao).toLocaleDateString('pt-BR')}
          </span>
        )}
      </div>

      {/* Histórico de shows */}
      <div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Histórico de shows
        </p>
        {shows.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Nenhum show cadastrado.</p>
        ) : (
          <div>
            {shows.map((s: any) => {
              const past = new Date(s.data + 'T23:59:59') < new Date()
              const venue = s.venue?.nome ?? '—'
              return (
                <Link key={s.id} href={`/shows/${s.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.5rem 0', borderBottom: '1px solid var(--border)',
                    textDecoration: 'none', opacity: past && !s.participou ? 0.3 : past ? 0.6 : 1,
                  }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 90, flexShrink: 0, fontFamily: 'monospace' }}>
                    {new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.nome_evento ?? venue}
                  </span>
                  {s.faz_estampa && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--cyan)', flexShrink: 0 }}>estampa</span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', flexShrink: 0 }}>
                    {s.resultado_geral ?? s.status_ingresso ?? '—'}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>&&

    </div>
  )
}
```

---

## 4. app/locais/[id]/page.tsx

```tsx
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const LABEL_RESULTADO: Record<string, string> = {
  sucesso_total: 'Sucesso Total',
  sucesso:       'Sucesso',
  medio:         'Médio',
  fracasso:      'Fracasso',
}

const COR_RESULTADO: Record<string, string> = {
  sucesso_total: 'var(--green)',
  sucesso:       'var(--green)',
  medio:         'var(--amber)',
  fracasso:      'var(--red)',
}

const LABEL_STATUS: Record<string, string> = {
  'sold out':    'Sold Out',
  'bem vendido': 'Bem Vendido',
  'mal vendido': 'Mal Vendido',
}

const RISCO_COR: Record<string, string> = {
  low:    'var(--green)',
  medium: 'var(--amber)',
  high:   'var(--red)',
}

export default async function VenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: venue, error } = await (supabase as any)
    .from('venues')
    .select('id, nome, cidade, lat, lng, capacidade_praticavel, tipo_default, zona_risco, risco_fiscalizacao')
    .eq('id', id)
    .single()

  if (error || !venue) notFound()

  const { data: showRows } = await (supabase as any)
    .from('shows')
    .select('id, data, nome_evento, status_ingresso, participou, resultado_geral')
    .eq('venue_id', id)
    .order('data', { ascending: false })

  const shows = (showRows ?? []) as any[]
  const showIds = shows.map((s: any) => s.id)

  let artistsByShow: Record<string, string[]> = {}
  if (showIds.length > 0) {
    const { data: saRows } = await (supabase as any)
      .from('show_artists')
      .select('show_id, artist_id')
      .in('show_id', showIds)

    const artistIds = [...new Set(((saRows ?? []) as any[]).map((sa: any) => sa.artist_id))]
    if (artistIds.length > 0) {
      const { data: artistRows } = await (supabase as any)
        .from('artists')
        .select('id, nome')
        .in('id', artistIds)

      const artistMap: Record<string, string> = {}
      for (const a of (artistRows ?? []) as any[]) artistMap[a.id] = a.nome

      for (const sa of (saRows ?? []) as any[]) {
        if (!artistsByShow[sa.show_id]) artistsByShow[sa.show_id] = []
        artistsByShow[sa.show_id].push(artistMap[sa.artist_id] ?? '?')
      }
    }
  }

  const showsEnriquecidos = shows.map((s: any) => ({
    ...s,
    artistas: artistsByShow[s.id] ?? [],
  }))

  const participados = showsEnriquecidos.filter((s: any) => s.participou)
  const sucessos     = participados.filter((s: any) => ['sucesso', 'sucesso_total'].includes(s.resultado_geral))
  const taxaSucesso  = participados.length > 0 ? Math.round((sucessos.length / participados.length) * 100) : null

  return (
    <div style={{ padding: '1.5rem', maxWidth: 680 }}>

      <Link href="/locais" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textDecoration: 'none' }}>
        ← Locais
      </Link>

      <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{venue.nome}</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 4 }}>{venue.cidade ?? '—'}</p>
      </div>

<div style={{ marginTop: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
<div>
  <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{venue.nome}</h1>
  <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 4 }}>{venue.cidade ?? '—'}</p>
</div>
<Link href={`/locais/${id}/editar`} style={{
  fontSize: '0.78rem', color: 'var(--text-dim)', textDecoration: 'none',
  border: '1px solid var(--border)', padding: '0.3rem 0.75rem',
  borderRadius: 4, background: 'var(--surface-2)', flexShrink: 0,
}}>
  Editar local
</Link>
</div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Shows',        value: String(shows.length) },
          { label: 'Participei',   value: String(participados.length) },
          { label: 'Taxa sucesso', value: taxaSucesso !== null ? `${taxaSucesso}%` : '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            border: '1px solid var(--border)', borderRadius: 6,
            padding: '0.6rem 0.9rem', background: 'var(--surface)', minWidth: 100,
          }}>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{label}</p>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', margin: '2px 0 0' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Info do venue */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '1rem', background: 'var(--surface)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Capacidade</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text)', margin: '2px 0 0' }}>
              {venue.capacidade_praticavel ? venue.capacidade_praticavel.toLocaleString('pt-BR') : '—'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Tipo</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text)', margin: '2px 0 0' }}>{venue.tipo_default ?? '—'}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Zona de risco</p>
            <p style={{ fontSize: '0.9rem', color: venue.zona_risco ? 'var(--red)' : 'var(--text-dim)', margin: '2px 0 0' }}>
              {venue.zona_risco ? 'Sim' : 'Não'}
            </p>
          </div>
          {venue.risco_fiscalizacao && (
            <div>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Fiscalização</p>
              <p style={{ fontSize: '0.9rem', color: RISCO_COR[venue.risco_fiscalizacao] ?? 'var(--text)', margin: '2px 0 0' }}>
                {venue.risco_fiscalizacao}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Histórico de shows */}
      <div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Histórico de shows
        </p>
        {showsEnriquecidos.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Nenhum show neste local.</p>
        ) : (
          <div>
            {showsEnriquecidos.map((s: any) => {
              const past = new Date(s.data + 'T23:59:59') < new Date()
              const nome = s.nome_evento ?? s.artistas.join(' / ') ?? '—'
              return (
                <Link key={s.id} href={`/shows/${s.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.5rem 0', borderBottom: '1px solid var(--border)',
                  textDecoration: 'none',
                  opacity: past && !s.participou ? 0.3 : past ? 0.6 : 1,
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 90, flexShrink: 0, fontFamily: 'monospace' }}>
                    {new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nome}
                  </span>
                  <span style={{
                    fontSize: '0.75rem', flexShrink: 0,
                    color: s.resultado_geral ? COR_RESULTADO[s.resultado_geral] ?? 'var(--text-dim)' : 'var(--text-dim)',
                  }}>
                    {s.resultado_geral
                      ? LABEL_RESULTADO[s.resultado_geral] ?? s.resultado_geral
                      : LABEL_STATUS[s.status_ingresso] ?? s.status_ingresso ?? '—'}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>

  )
}
```

---

## 5. app/locais/[id]/venue-client.tsx

```tsx
'use client'

import { useState, useTransition } from 'react'
import { updateVenue, deleteVenue } from './actions'
import type { UpdateVenueInput } from './actions'

type Props = {
  venue: {
    id: string
    nome: string
    cidade: string
    capacidade_praticavel: number | null
    risco_fiscalizacao: string | null
    lat: number | null
    lng: number | null
  }
}

export function EditVenueClient({ venue }: Props) {
  const [nome,   setNome]   = useState(venue.nome)
  const [cidade, setCidade] = useState(venue.cidade ?? '')
  const [cap,    setCap]    = useState(String(venue.capacidade_praticavel ?? ''))
  const [risco,  setRisco]  = useState(venue.risco_fiscalizacao ?? '')
  const [lat,    setLat]    = useState(String(venue.lat ?? ''))
  const [lng,    setLng]    = useState(String(venue.lng ?? ''))

  const [saving,   startSave]   = useTransition()
  const [deleting, startDelete] = useTransition()
  const [error,    setError]    = useState<string | null>(null)

  function submit() {
    if (!nome.trim()) { setError('Nome obrigatório'); return }
    setError(null)
    const input: UpdateVenueInput = {
      nome:                  nome.trim(),
      cidade:                cidade.trim(),
      capacidade_praticavel: cap ? parseInt(cap) : null,
      risco_fiscalizacao:    risco || null,
      lat:                   lat ? parseFloat(lat) : null,
      lng:                   lng ? parseFloat(lng) : null,
    }
    startSave(async () => { await updateVenue(venue.id, input) })
  }

  function handleDelete() {
    if (!confirm('Excluir este local? Shows vinculados perderão o venue.')) return
    startDelete(async () => { await deleteVenue(venue.id) })
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 480 }}>

      {/* Header com breadcrumb e excluir */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <a href={`/locais/${venue.id}`} style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textDecoration: 'none' }}>
          ← {venue.nome}
        </a>
        <button onClick={handleDelete} disabled={deleting} style={{
          fontSize: '0.75rem', background: 'none', color: 'var(--red)',
          border: '1px solid var(--red)', borderRadius: 4,
          padding: '0.25rem 0.75rem', cursor: 'pointer', opacity: deleting ? 0.5 : 1,
        }}>
          {deleting ? 'Excluindo...' : 'Excluir'}
        </button>
      </div>

      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1.5rem' }}>
        Editar local
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        <Field label="Nome *">
          <input value={nome} onChange={e => setNome(e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Cidade">
          <input value={cidade} onChange={e => setCidade(e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Capacidade praticável">
          <input type="number" value={cap} onChange={e => setCap(e.target.value)}
            placeholder="Ex: 3200" style={inputStyle} />
        </Field>

        <Field label="Risco de fiscalização">
          <select value={risco} onChange={e => setRisco(e.target.value)} style={inputStyle}>
            <option value="">—</option>
            <option value="low">Baixo</option>
            <option value="medium">Médio</option>
            <option value="high">Alto</option>
          </select>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Latitude">
            <input value={lat} onChange={e => setLat(e.target.value)}
              placeholder="-23.5514" style={inputStyle} />
          </Field>
          <Field label="Longitude">
            <input value={lng} onChange={e => setLng(e.target.value)}
              placeholder="-46.6339" style={inputStyle} />
          </Field>
        </div>

        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: -8 }}>
          Pega no Google Maps: clique direito → "O que há aqui?"
        </p>

      </div>

      {error && <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--red)' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '1.5rem' }}>
        <button onClick={submit} disabled={saving} style={{
          padding: '0.5rem 1.5rem', fontSize: '0.875rem',
          background: 'var(--surface-2)', color: 'var(--text)',
          border: '1px solid var(--border)', borderRadius: 4,
          cursor: 'pointer', opacity: saving ? 0.5 : 1,
        }}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        <a href={`/locais/${venue.id}`} style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textDecoration: 'none' }}>
          Cancelar
        </a>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: '0.875rem', background: 'var(--surface)', color: 'var(--text)',
  border: '1px solid var(--border)', borderRadius: 4, padding: '0.45rem 0.75rem',
  outline: 'none', boxSizing: 'border-box',
}
```

---

## 6. app/globals.css

```css
@import "tailwindcss";

@layer base {
  * { box-sizing: border-box; }

  body {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    background-color: #0f1117;
    color: #e2e8f0;
    margin: 0;
  }
}

:root {
  --nav-bg:         #0a0d13;
  --nav-border:     #1e2433;
  --nav-text:       #64748b;
  --nav-text-hover: #94a3b8;
  --nav-active:     #e2e8f0;
  --content-bg:     #0f1117;
  --surface:        #161b27;
  --surface-2:      #1e2433;
  --border:         #1e2433;
  --text:           #e2e8f0;
  --text-dim:       #64748b;
  --text-muted:     #334155;
  --green:          #4ade80;
  --cyan:           #22d3ee;
  --amber:          #fbbf24;
  --red:            #f87171;
  --blue:           #818cf8;
}

.nav-link {
  display: flex;
  align-items: center;
  padding: 0.45rem 1rem;
  font-size: 0.8rem;
  color: var(--nav-text);
  text-decoration: none;
  letter-spacing: 0.01em;
  transition: color 0.15s;
}

.nav-link:hover {
  color: var(--nav-text-hover);
}
```
