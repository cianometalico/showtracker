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