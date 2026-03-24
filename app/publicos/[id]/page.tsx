import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { nichoColor, nichoColorAlpha } from '@/lib/nicho-color'

export default async function NichoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: nicho, error } = await (supabase as any)
    .from('nichos')
    .select('id, nome, underground_score, descritores, corporalidade, mentalidade, tags, descricao')
    .eq('id', id)
    .single()

  if (error || !nicho) notFound()

  const score = nicho.underground_score ?? 5
  const cor   = nichoColor(nicho.nome, score)
  const corBg = nichoColorAlpha(nicho.nome, score, 0.07)

  const { data: artistNichos } = await (supabase as any)
    .from('artist_nichos')
    .select('artist_id, score, artists(id, nome, lastfm_listeners, tags_editorial, tags_behavioral, pais)')
    .eq('nicho_id', id)

  const artistas = (artistNichos ?? [])
    .map((an: any) => ({
      ...an,
      artist: Array.isArray(an.artists) ? an.artists[0] : an.artists,
    }))
    .sort((a: any, b: any) => (b.artist?.lastfm_listeners ?? 0) - (a.artist?.lastfm_listeners ?? 0))

  const corp  = nicho.corporalidade as Record<string, any> | null
  const ment  = nicho.mentalidade  as Record<string, any> | null
  const descs = (nicho.descritores as string[] | null) ?? []
  const tags  = (nicho.tags as string[] | null) ?? []

  const { data: generos } = await (supabase as any)
    .from('genres')
    .select('id, nome')

  const generosRelacionados = (generos ?? []).filter((g: any) =>
    tags.map((t: string) => t.toLowerCase()).includes(g.nome.toLowerCase())
  )

  const CORP_LABELS: Record<string, string> = {
    faixa_etaria: 'faixa etária',
    estetica: 'estética',
    geracao: 'geração',
    genero_predominante: 'gênero',
  }

  const MENT_LABELS: Record<string, string> = {
    valores: 'valores',
    comportamento_compra: 'comportamento de compra',
    concorrencia_tipica: 'concorrência típica',
  }

  const labelColor = 'rgba(255,255,255,0.45)'
  const valueColor = 'rgba(255,255,255,0.88)'

  return (
    <div style={{ padding: '1.5rem', maxWidth: 720 }}>

      <Link href="/publicos" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
        ← públicos
      </Link>

      {/* CARD IDENTIDADE — tudo dentro */}
      <div style={{
        marginTop: '1.25rem', marginBottom: '2rem',
        border: `1px solid ${nichoColorAlpha(nicho.nome, score, 0.35)}`,
        borderLeft: `4px solid ${cor}`,
        borderRadius: 6, background: corBg, padding: '1.5rem',
      }}>
        {/* Nome + score */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, color: cor, letterSpacing: '-0.02em' }}>
            {nicho.nome}
          </h1>
          <span style={{ fontSize: '0.7rem', color: labelColor }}>underground {score}/10</span>
        </div>

        {nicho.descricao && (
          <p style={{ fontSize: '0.9rem', color: valueColor, margin: '0 0 1.25rem', opacity: 0.75 }}>
            {nicho.descricao}
          </p>
        )}

        {/* Corporalidade + Mentalidade */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ fontSize: '0.62rem', color: labelColor, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.6rem' }}>
              corporalidade
            </p>
            {corp ? Object.entries(corp).map(([k, v]) => (
              <div key={k} style={{ marginBottom: 8 }}>
                <span style={{ fontSize: '0.68rem', color: labelColor }}>{CORP_LABELS[k] ?? k.replace(/_/g, ' ')}: </span>
                <span style={{ fontSize: '0.85rem', color: valueColor }}>{String(v)}</span>
              </div>
            )) : <span style={{ fontSize: '0.8rem', color: labelColor }}>—</span>}
          </div>
          <div>
            <p style={{ fontSize: '0.62rem', color: labelColor, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.6rem' }}>
              mentalidade
            </p>
            {ment ? Object.entries(ment).map(([k, v]) => (
              <div key={k} style={{ marginBottom: 8 }}>
                <span style={{ fontSize: '0.68rem', color: labelColor }}>{MENT_LABELS[k] ?? k.replace(/_/g, ' ')}: </span>
                <span style={{ fontSize: '0.85rem', color: valueColor }}>
                  {Array.isArray(v) ? v.join(', ') : String(v)}
                </span>
              </div>
            )) : <span style={{ fontSize: '0.8rem', color: labelColor }}>—</span>}
          </div>
        </div>

        {/* Gêneros relacionados — dentro do card */}
        {(tags.length > 0 || generosRelacionados.length > 0) && (
          <div style={{ marginBottom: '1rem', paddingTop: '1rem', borderTop: `1px solid ${nichoColorAlpha(nicho.nome, score, 0.2)}` }}>
            <p style={{ fontSize: '0.62rem', color: labelColor, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.6rem' }}>
              gêneros associados
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {tags.map((t: string) => {
                const match = generosRelacionados.find((g: any) => g.nome.toLowerCase() === t.toLowerCase())
                return match ? (
                  <Link key={t} href={`/publicos/generos/${match.id}`} style={{ textDecoration: 'none' }}>
                    <span style={{
                      fontSize: '0.75rem', padding: '0.15rem 0.55rem',
                      background: nichoColorAlpha(nicho.nome, score, 0.15),
                      border: `1px solid ${nichoColorAlpha(nicho.nome, score, 0.4)}`,
                      borderRadius: 4, color: cor,
                    }}>{t}</span>
                  </Link>
                ) : (
                  <span key={t} style={{
                    fontSize: '0.75rem', padding: '0.15rem 0.55rem',
                    background: nichoColorAlpha(nicho.nome, score, 0.08),
                    border: `1px solid ${nichoColorAlpha(nicho.nome, score, 0.25)}`,
                    borderRadius: 4, color: `${cor}cc`,
                  }}>{t}</span>
                )
              })}
            </div>
          </div>
        )}

        {/* Descritores — dentro do card, menor */}
        {descs.length > 0 && (
          <div style={{ paddingTop: '0.75rem', borderTop: `1px solid ${nichoColorAlpha(nicho.nome, score, 0.15)}` }}>
            <p style={{ fontSize: '0.58rem', color: labelColor, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.5rem' }}>
              descritores
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {descs.map((d: string) => (
                <span key={d} style={{
                  fontSize: '0.65rem', padding: '0.1rem 0.4rem',
                  background: nichoColorAlpha(nicho.nome, score, 0.08),
                  border: `1px solid ${nichoColorAlpha(nicho.nome, score, 0.18)}`,
                  borderRadius: 3, color: `${cor}88`,
                }}>{d}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ARTISTAS — fora do card */}
      <div>
        <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
          artistas — {artistas.length}
        </p>
        {artistas.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)' }}>nenhum artista vinculado.</p>
        ) : (
          <div>
            {artistas.map((a: any) => {
              const topTag = (a.artist?.tags_editorial as string[] | null)?.[0]
                ?? (a.artist?.tags_behavioral as {name:string}[] | null)?.[0]?.name
                ?? null
              return (
                <Link key={a.artist_id} href={`/artistas/${a.artist_id}`} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  textDecoration: 'none',
                }}>
                  <span style={{ flex: 1, fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>{a.artist?.nome ?? '—'}</span>
                  {topTag && <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>{topTag}</span>}
                  {a.artist?.lastfm_listeners && (
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                      {a.artist.lastfm_listeners.toLocaleString('pt-BR')}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}