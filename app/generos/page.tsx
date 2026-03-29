import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function GenerosPage() {
  const supabase = await createClient()

  const { data: genres } = await (supabase as any)
    .from('genres')
    .select('id, nome, zona, descritores')
    .order('nome', { ascending: true })

  const { data: artists } = await (supabase as any)
    .from('artists')
    .select('id, nome, genre_id, tags_editorial, tags_behavioral, lastfm_listeners')
    .not('genre_id', 'is', null)
    .order('nome', { ascending: true })

  const artistsByGenre: Record<string, any[]> = {}
  for (const a of (artists ?? [])) {
    if (!artistsByGenre[a.genre_id]) artistsByGenre[a.genre_id] = []
    artistsByGenre[a.genre_id].push(a)
  }

  const { data: untagged } = await (supabase as any)
    .from('artists')
    .select('id, nome, tags_editorial, tags_behavioral')
    .is('genre_id', null)
    .order('nome', { ascending: true })

  const genreList = (genres ?? []) as any[]

  return (
    <div style={{ padding: '1.5rem', maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Gêneros</h1>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          {genreList.length} gêneros · alimentado pelo ohara
        </span>
      </div>

      {genreList.length === 0 && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '2rem' }}>
          Nenhum gênero cadastrado. Enriqueça artistas para popular automaticamente.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {genreList.map((g: any) => {
          const arts = artistsByGenre[g.id] ?? []
          const descritores = (g.descritores as string[] | null) ?? []

          return (
            <div key={g.id} style={{
              border: '1px solid var(--border)', borderRadius: 6,
              background: 'var(--surface)', overflow: 'hidden',
            }}>
              <div style={{
                padding: '0.75rem 1rem',
                borderBottom: arts.length > 0 || descritores.length > 0 ? '1px solid var(--border)' : 'none',
                display: 'flex', alignItems: 'center', gap: '1rem',
              }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)' }}>{g.nome}</span>
                {g.zona && (
                  <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-dim)' }}>
                    {g.zona}
                  </span>
                )}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  {arts.length} artista{arts.length !== 1 ? 's' : ''}
                </span>
              </div>

              {descritores.length > 0 && (
                <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {descritores.map((d: string) => (
                    <span key={d} style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-dim)' }}>
                      {d}
                    </span>
                  ))}
                </div>
              )}

              {arts.length > 0 && (
                <div style={{ padding: '0.5rem 0' }}>
                  {arts.map((a: any) => {
                    const topTag = (a.tags_editorial as string[] | null)?.[0]
                      ?? (a.tags_behavioral as {name:string}[] | null)?.[0]?.name
                      ?? null
                    return (
                      <Link key={a.id} href={`/artistas/${a.id}`} style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '0.35rem 1rem', textDecoration: 'none',
                      }}>
                        <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text)' }}>{a.nome}</span>
                        {topTag && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{topTag}</span>}
                        {a.lastfm_listeners && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {a.lastfm_listeners.toLocaleString('pt-BR')}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Artistas sem gênero — sem Link aninhado */}
      {(untagged ?? []).length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <p className="section-label">
            Sem gênero ({(untagged ?? []).length})
          </p>
          <div style={{ border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', overflow: 'hidden' }}>
            {(untagged ?? []).map((a: any) => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0.4rem 1rem', borderBottom: '1px solid var(--border)',
                opacity: 0.5,
              }}>
                <Link href={`/artistas/${a.id}`} style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text)', textDecoration: 'none' }}>
                  {a.nome}
                </Link>
                <Link href={`/artistas/${a.id}`} style={{ fontSize: '0.72rem', color: 'var(--cyan)', textDecoration: 'none' }}>
                  ver artista →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}