import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { NichoManager } from './nicho-manager'
import { nichoColor } from '@/lib/nicho-color'
import { EnrichButton } from './enrich-button'
import { ArtistDetailClient } from './artist-detail-client'
import { OverrideSectionClient } from './override-section-client'

export default async function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: artist, error } = await (supabase as any)
    .from('artists')
    .select(`
      id, nome, pais, mbid, tags_editorial, tags_behavioral, lastfm_listeners, wikipedia_url, genre_id, ultima_atualizacao,
      energia, receptividade_autoral, commodificacao, letramento, abertura_experimental,
      geracao_override, estetica_override, cor_dominante_override, tipo_nostalgia_override
    `)
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

    const saByShow: Record<string, any> = {}
    for (const sa of (saRows ?? [])) saByShow[sa.show_id] = sa

    const mapped = (showRows ?? []).map((s: any) => ({
      ...s,
      venue: Array.isArray(s.venues) ? s.venues[0] : s.venues,
      ordem: saByShow[s.id]?.ordem ?? 1,
      faz_estampa: saByShow[s.id]?.faz_estampa ?? false,
    }))

    const todayStr = new Date().toISOString().slice(0, 10)
    const future = mapped.filter((s: any) => s.data >= todayStr).sort((a: any, b: any) => a.data.localeCompare(b.data))
    const past   = mapped.filter((s: any) => s.data < todayStr).sort((a: any, b: any) => b.data.localeCompare(a.data))
    shows = [...future, ...past]
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
    .select('id, nome, underground_score, letramento, receptividade_autoral, commodificacao, energia, abertura_experimental')
    .order('underground_score', { ascending: true })

  // nichos já vinculados a este artista (com score para determinar nicho principal)
  const { data: artistNichos } = await (supabase as any)
    .from('artist_nichos')
    .select('nicho_id, score')
    .eq('artist_id', id)

  const linkedNichoIds = (artistNichos ?? []).map((an: any) => an.nicho_id)

  // Nicho principal = maior score
  const primaryNichoId = (artistNichos ?? []).length > 0
    ? (artistNichos ?? []).reduce((best: any, cur: any) => ((cur.score ?? 0) > (best.score ?? 0) ? cur : best)).nicho_id
    : null

  const primaryNicho = primaryNichoId
    ? (allNichos ?? []).find((n: any) => n.id === primaryNichoId) ?? null
    : null

  const nichosForManager = (allNichos ?? []).map((n: any) => ({
    id: n.id,
    nome: n.nome,
    underground_score: n.underground_score ?? 5,
    cor: nichoColor(n.nome, n.underground_score ?? 5),
  }))

  // Designs do artista
  const { data: designRows } = await (supabase as any)
    .from('design_stock')
    .select('design_id, nome, ativo, total_vendido, saldo_atual')
    .eq('artist_id', id)
    .order('nome')
  const artistDesigns = (designRows ?? []) as any[]

  return (
    <div className="page-container">

      <Link href="/artistas" className="breadcrumb">
        ← Artistas
      </Link>

      <ArtistDetailClient artist={{
        id: artist.id,
        nome: artist.nome,
        pais: artist.pais ?? null,
        mbid: artist.mbid ?? null,
        lastfm_listeners: artist.lastfm_listeners ?? null,
      }} />

      {/* Stats */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Shows', value: String(shows.length) },
          { label: 'Participei', value: String(participados.length) },
          { label: 'Taxa sucesso', value: taxaSucesso !== null ? `${taxaSucesso}%` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="stat-card">
            <p className="stat-value">{value}</p>
            <p className="stat-label">{label}</p>
          </div>
        ))}
      </div>

      {/* Nichos */}
      <NichoManager
        artistId={id}
        allNichos={nichosForManager}
        linkedNichoIds={linkedNichoIds}
      />

      {/* Overrides */}
      <OverrideSectionClient
        artistId={id}
        overrides={{
          letramento:            artist.letramento ?? null,
          receptividade_autoral: artist.receptividade_autoral ?? null,
          commodificacao:        artist.commodificacao ?? null,
          energia:               artist.energia ?? null,
          abertura_experimental: artist.abertura_experimental ?? null,
          geracao_override:       artist.geracao_override ?? null,
          estetica_override:      artist.estetica_override ?? null,
          cor_dominante_override: artist.cor_dominante_override ?? null,
          tipo_nostalgia_override: artist.tipo_nostalgia_override ?? null,
        }}
        nichoRef={primaryNicho ? {
          id:                    primaryNicho.id,
          nome:                  primaryNicho.nome,
          cor:                   nichoColor(primaryNicho.nome, primaryNicho.underground_score ?? 5),
          underground_score:     primaryNicho.underground_score ?? 5,
          letramento:            primaryNicho.letramento ?? null,
          receptividade_autoral: primaryNicho.receptividade_autoral ?? null,
          commodificacao:        primaryNicho.commodificacao ?? null,
          energia:               primaryNicho.energia ?? null,
          abertura_experimental: primaryNicho.abertura_experimental ?? null,
        } : null}
      />

      {/* Tags */}
      {(tags_editorial.length > 0 || tags_behavioral.length > 0) && (
        <div style={{ marginBottom: '1.5rem' }}>
          {tags_editorial.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <p className="section-label">MusicBrainz</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {tags_editorial.map((t: string, i: number) => (
                  <span key={i} style={{
                    background: 'var(--tag-blue-bg)', padding: '0.15rem 0.5rem',
                    borderRadius: 3, fontSize: '0.75rem', border: '1px solid var(--tag-blue-border)', color: 'var(--text)',
                  }}>{t}</span>
                ))}
              </div>
            </div>
          )}
          {tags_behavioral.length > 0 && (
            <div>
              <p className="section-label">Last.fm</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {tags_behavioral.map((t: any, i: number) => (
                  <span key={i} style={{
                    background: 'var(--tag-blue-bg)', padding: '0.15rem 0.5rem',
                    borderRadius: 3, fontSize: '0.75rem', border: '1px solid var(--tag-blue-border)', color: 'var(--text)',
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
      <EnrichButton
        artistId={id}
        artistNome={artist.nome}
        artistMbid={artist.mbid ?? null}
        ultimaAtualizacao={artist.ultima_atualizacao ?? null}
      />

      {/* Designs */}
      {artistDesigns.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p className="section-label" style={{ margin: 0 }}>Designs</p>
            <a href="/estoque/new" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textDecoration: 'none' }}>+ novo design</a>
          </div>
          <div>
            {artistDesigns.map((d: any) => (
              <a key={d.design_id} href={`/estoque/${d.design_id}`}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.45rem 0', borderBottom: '1px solid var(--border)', textDecoration: 'none', opacity: d.ativo ? 1 : 0.5 }}>
                <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text)' }}>{d.nome}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>{d.total_vendido} vendidas</span>
                <span style={{
                  fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
                  color: d.saldo_atual > 0 ? 'var(--green)' : 'var(--text-muted)',
                }}>
                  {d.saldo_atual} em estoque
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Histórico de shows */}
      <div>
        <p className="section-label">Histórico de shows</p>
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
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 90, flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
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
      </div>

    </div>
  )
}