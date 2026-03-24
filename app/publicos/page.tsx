import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { nichoColor, nichoColorAlpha } from '@/lib/nicho-color'

export default async function PublicosPage() {
  const supabase = await createClient()

  const { data: nichos } = await (supabase as any)
    .from('nichos')
    .select('id, nome, underground_score, descritores, corporalidade, mentalidade, tags')
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

  const dimText  = 'rgba(255,255,255,0.4)'
  const bodyText = 'rgba(255,255,255,0.85)'

  return (
    <div style={{ padding: '1.5rem', maxWidth: 960 }}>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: bodyText, margin: 0, letterSpacing: '-0.01em' }}>
            públicos
          </h1>
          <p style={{ fontSize: '0.78rem', color: dimText, margin: '4px 0 0' }}>
            leitura de tribos — nichos · gêneros
          </p>
        </div>
        <span style={{ fontSize: '0.75rem', color: dimText }}>
          {(nichos ?? []).length} nichos · {(generos ?? []).length} gêneros
        </span>
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
            const corp  = n.corporalidade as Record<string, any> | null
            const ment  = n.mentalidade  as Record<string, any> | null
            const descs = (n.descritores as string[] | null) ?? []

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
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: cor, letterSpacing: '-0.01em' }}>
                      {n.nome}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: dimText }}>
                      {score}/10 · {arts.length} artistas
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                    {corp && (
                      <div>
                        <p style={{ fontSize: '0.6rem', color: dimText, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>corporalidade</p>
                        {Object.entries(corp).map(([k, v]) => (
                          <p key={k} style={{ fontSize: '0.78rem', color: bodyText, margin: '3px 0' }}>
                            <span style={{ color: dimText }}>{k.replace(/_/g, ' ')}: </span>{String(v)}
                          </p>
                        ))}
                      </div>
                    )}
                    {ment && (
                      <div>
                        <p style={{ fontSize: '0.6rem', color: dimText, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>mentalidade</p>
                        {ment.comportamento_compra && (
                          <p style={{ fontSize: '0.78rem', color: bodyText, margin: '3px 0' }}>
                            <span style={{ color: dimText }}>compra: </span>{String(ment.comportamento_compra)}
                          </p>
                        )}
                        {ment.concorrencia_tipica && (
                          <p style={{ fontSize: '0.78rem', color: bodyText, margin: '3px 0' }}>
                            <span style={{ color: dimText }}>concorrência: </span>{String(ment.concorrencia_tipica)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {topArts.length > 0 && (
                    <div style={{ marginBottom: '0.85rem', paddingTop: '0.75rem', borderTop: `1px solid ${nichoColorAlpha(n.nome, score, 0.2)}` }}>
                      <p style={{ fontSize: '0.6rem', color: dimText, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.4rem' }}>
                        referências
                      </p>
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

                  {descs.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {descs.slice(0, 7).map((d: string) => (
                        <span key={d} style={{
                          fontSize: '0.65rem', padding: '0.1rem 0.4rem',
                          background: nichoColorAlpha(n.nome, score, 0.12),
                          border: `1px solid ${nichoColorAlpha(n.nome, score, 0.3)}`,
                          borderRadius: 3, color: cor,
                        }}>{d}</span>
                      ))}
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
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 3, color: 'rgba(255,255,255,0.65)',
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
            sem nicho — {artistasSemNicho.length}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {artistasSemNicho.map((a: any) => (
              <Link key={a.id} href={`/artistas/${a.id}`} style={{ textDecoration: 'none' }}>
                <span style={{
                  fontSize: '0.75rem', padding: '0.15rem 0.55rem',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 3, color: 'rgba(255,255,255,0.35)',
                }}>{a.nome}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}