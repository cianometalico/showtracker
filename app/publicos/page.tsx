import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { nichoColor, nichoColorAlpha } from '@/lib/nicho-color'

export default async function PublicosPage() {
  const supabase = await createClient()

  const { data: nichos } = await (supabase as any)
    .from('nichos')
    .select(`
      id, nome, underground_score, tags,
      coesao, identidade_visual, maturidade,
      letramento, receptividade_autoral, commodificacao, energia,
      geracao, faixa_etaria, estetica, cor_dominante,
      fator_compra, concorrencia_merch, abertura_experimental, tipo_nostalgia
    `)
    .order('underground_score', { ascending: true })

  const { data: artistNichos } = await (supabase as any)
    .from('artist_nichos')
    .select('nicho_id, artist_id, score, artists(id, nome, lastfm_listeners)')

  const artistsByNicho: Record<string, any[]> = {}
  const nichoArtistIds = new Set<string>()

  for (const an of (artistNichos ?? [])) {
    const artist = Array.isArray(an.artists) ? an.artists[0] : an.artists
    if (!artistsByNicho[an.nicho_id]) artistsByNicho[an.nicho_id] = []
    artistsByNicho[an.nicho_id].push({ ...an, artist })
    nichoArtistIds.add(an.artist_id)
  }

  const { data: semNicho } = await (supabase as any)
    .from('artists')
    .select('id, nome')
    .order('nome', { ascending: true })
  const artistasSemNicho = (semNicho ?? []).filter((a: any) => !nichoArtistIds.has(a.id))

  const { data: generos } = await (supabase as any)
    .from('genres')
    .select('id, nome')
    .order('nome', { ascending: true })

  const dimText  = 'var(--text-dim)'
  const bodyText = 'var(--text-primary)'

  return (
    <div style={{ padding: '1.5rem', maxWidth: 960 }}>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 400, color: bodyText, margin: 0 }}>
            públicos
          </h1>
          <p style={{ fontSize: '0.78rem', color: dimText, margin: '4px 0 0' }}>
            leitura de tribos — nichos · gêneros
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: dimText }}>
            {(nichos ?? []).length} nichos · {(generos ?? []).length} gêneros
          </span>
          <Link href="/publicos/novo" style={{
            fontSize: '0.75rem', color: dimText,
            background: 'var(--surface-raised)', border: '1px solid var(--border)',
            padding: '0.2rem 0.65rem', borderRadius: 4, textDecoration: 'none',
          }}>
            + novo nicho
          </Link>
        </div>
      </div>

      {/* nichos */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontSize: '0.62rem', color: dimText, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
          nichos — escuro → underground · claro → mainstream
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '1rem' }}>
          {(nichos ?? []).map((n: any) => {
            const score = n.underground_score ?? 5
            const cor   = nichoColor(n.nome, score)

            const arts = (artistsByNicho[n.id] ?? [])
              .sort((a: any, b: any) => (b.artist?.lastfm_listeners ?? 0) - (a.artist?.lastfm_listeners ?? 0))
            const topArts = arts.slice(0, 4)

            return (
              <Link key={n.id} href={`/publicos/${n.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  border: `1px solid ${nichoColorAlpha(n.nome, score, 0.3)}`,
                  borderLeft: `3px solid ${cor}`,
                  borderRadius: 6,
                  background: nichoColorAlpha(n.nome, score, 0.07),
                  padding: '1.25rem',
                  height: '100%', boxSizing: 'border-box',
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 400, color: cor, letterSpacing: '0.04em', fontFamily: 'var(--font-serif)' }}>
                      {n.nome}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: dimText, fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: cor }}>{score}</span>/10 · {arts.length} artistas
                    </span>
                  </div>

                  {/* Mini scores */}
                  {(n.coesao || n.energia || n.commodificacao) && (
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                      {n.coesao && <span style={{ fontSize: '0.7rem', color: dimText }}>coesão <span style={{ color: cor }}>{n.coesao}</span></span>}
                      {n.energia && <span style={{ fontSize: '0.7rem', color: dimText }}>energia <span style={{ color: cor }}>{n.energia}</span></span>}
                      {n.commodificacao && <span style={{ fontSize: '0.7rem', color: dimText }}>merch <span style={{ color: cor }}>{n.commodificacao}</span></span>}
                      {n.concorrencia_merch && <span style={{ fontSize: '0.7rem', color: dimText }}>concorrência <span style={{ color: bodyText }}>{n.concorrencia_merch}</span></span>}
                    </div>
                  )}

                  {/* Geração + faixa */}
                  {(n.geracao?.length > 0 || n.faixa_etaria) && (
                    <div style={{ marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.75rem', color: dimText }}>
                        {n.geracao?.join(', ')}{n.faixa_etaria ? ` · ${n.faixa_etaria}` : ''}
                      </span>
                    </div>
                  )}

                  {topArts.length > 0 && (
                    <div style={{ paddingTop: '0.65rem', borderTop: `1px solid ${nichoColorAlpha(n.nome, score, 0.2)}` }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {topArts.map((a: any) => (
                          <span key={a.artist_id} style={{
                            fontSize: '0.75rem', color: bodyText,
                            padding: '0.1rem 0.45rem',
                            background: nichoColorAlpha(n.nome, score, 0.12),
                            borderRadius: 3,
                          }}>
                            {a.artist?.nome}
                          </span>
                        ))}
                        {arts.length > 4 && (
                          <span style={{ fontSize: '0.72rem', color: dimText, padding: '0.1rem 0.3rem' }}>
                            +{arts.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* gêneros */}
      {(generos ?? []).length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontSize: '0.62rem', color: dimText, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
            gêneros
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {(generos ?? []).map((g: any) => (
              <Link key={g.id} href={`/publicos/generos/${g.id}`} style={{ textDecoration: 'none' }}>
                <span style={{
                  fontSize: '0.78rem', padding: '0.2rem 0.65rem',
                  background: 'var(--surface-raised)', border: '1px solid var(--border)',
                  borderRadius: 3, color: 'var(--text-dim)',
                }}>{g.nome}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* sem nicho */}
      {artistasSemNicho.length > 0 && (
        <div>
          <p style={{ fontSize: '0.62rem', color: dimText, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
            artistas pendentes de nicho — {artistasSemNicho.length}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {artistasSemNicho.map((a: any) => (
              <Link key={a.id} href={`/artistas/${a.id}`} style={{ textDecoration: 'none' }}>
                <span style={{
                  fontSize: '0.75rem', padding: '0.15rem 0.55rem',
                  background: 'var(--surface-base)', border: '1px solid var(--border)',
                  borderRadius: 3, color: 'var(--text-muted)',
                }}>{a.nome}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}