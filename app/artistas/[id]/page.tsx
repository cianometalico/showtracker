import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { NichoManager } from './nicho-manager'
import { nichoColor, nichoColorAlpha } from '@/lib/nicho-color'
import { EnrichButton } from './enrich-button'
import { ArtistDetailClient } from './artist-detail-client'
import { OverrideSectionClient } from './override-section-client'

export default async function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: artist, error } = await (supabase as any)
    .from('artists')
    .select(`
      id, nome, pais, mbid, founded_year, tags_editorial, tags_behavioral, lastfm_listeners, wikipedia_url, genre_id, ultima_atualizacao,
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

    shows = mapped.sort((a: any, b: any) => b.data.localeCompare(a.data))
  }

  const participados = shows.filter(s => s.participou)
  const comResultado = participados.filter(s => s.resultado_geral)
  const sucessos = comResultado.filter(s => ['sucesso', 'sucesso_total'].includes(s.resultado_geral))
  const taxaSucesso = comResultado.length > 0 ? Math.round((sucessos.length / comResultado.length) * 100) : null

  const tags_editorial  = (artist.tags_editorial  as string[] | null) ?? []
  const tags_behavioral = (artist.tags_behavioral as { name: string; count?: number }[] | null) ?? []

  const COR_RESULTADO: Record<string, string> = {
    sucesso_total: 'var(--status-pos)', sucesso: 'var(--status-pos)',
    medio: 'var(--status-neut)', fracasso: 'var(--status-neg)',
  }

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

  const linkedNichos = (artistNichos ?? []).map((an: any) => ({ id: an.nicho_id, score: an.score ?? 5 }))

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

  const linkedNichosDisplay = linkedNichos
    .map(ln => {
      const nicho = (allNichos ?? []).find((n: any) => n.id === ln.id)
      if (!nicho) return null
      return {
        id:                nicho.id,
        nome:              nicho.nome,
        underground_score: nicho.underground_score ?? 5,
        score:             ln.score,
      }
    })
    .filter(Boolean) as { id: string; nome: string; underground_score: number; score: number }[]

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
        founded_year: artist.founded_year ?? null,
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

      {/* Grid: nichos ∥ tags */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 24, alignItems: 'start', marginBottom: '1.5rem',
      }}>
        {/* Nichos — coluna esquerda */}
        <div>
          <p className="section-label">Nichos</p>
          {linkedNichosDisplay.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-serif)' }}>
              nenhum nicho vinculado
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {linkedNichosDisplay.map(n => (
                <a key={n.id} href={`/publicos/${n.id}`} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '0.2rem 0.6rem', borderRadius: 4,
                  background: nichoColorAlpha(n.nome, n.underground_score, n.score / 10),
                  border: `1px solid ${nichoColor(n.nome, n.underground_score)}55`,
                  color: nichoColor(n.nome, n.underground_score),
                  textDecoration: 'none', fontSize: '0.78rem', fontFamily: 'var(--font-serif)',
                }}>
                  {n.nome}
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {n.score}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Tags — coluna direita */}
        <div>
          {tags_editorial.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <p className="section-label" style={{ color: 'var(--amber)' }}>MusicBrainz</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {tags_editorial.map((t: string, i: number) => (
                  <span key={i} style={{
                    background: 'var(--surface-raised)', padding: '0.15rem 0.5rem',
                    borderRadius: 3, fontSize: '0.72rem', color: 'var(--text-dim)',
                    fontFamily: 'var(--font-mono)',
                  }}>{t}</span>
                ))}
              </div>
            </div>
          )}
          {tags_behavioral.length > 0 && (
            <div>
              <p className="section-label" style={{ color: 'var(--amber)' }}>Last.fm</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {tags_behavioral.map((t: any, i: number) => (
                  <span key={i} style={{
                    background: 'var(--surface-raised)', padding: '0.15rem 0.5rem',
                    borderRadius: 3, fontSize: '0.72rem', color: 'var(--text-dim)',
                    fontFamily: 'var(--font-mono)',
                  }}>{t.name}</span>
                ))}
              </div>
            </div>
          )}
          {tags_editorial.length === 0 && tags_behavioral.length === 0 && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>—</p>
          )}
        </div>
      </div>

      {/* NichoManager — vinculation control */}
      <NichoManager
        artistId={id}
        allNichos={nichosForManager}
        linkedNichos={linkedNichos}
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
              const isPast = new Date(s.data + 'T23:59:59') < new Date()
              const venue  = s.venue?.nome ?? '—'
              const corRes = s.resultado_geral ? COR_RESULTADO[s.resultado_geral] ?? 'var(--text-dim)' : 'var(--text-dim)'
              return (
                <Link key={s.id} href={`/shows/${s.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.5rem 0', borderBottom: '1px solid var(--border)',
                    textDecoration: 'none', opacity: isPast && !s.participou ? 0.3 : isPast ? 0.7 : 1,
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
                  <span style={{ fontSize: '0.75rem', color: corRes, flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
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