'use client'

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { EnrichmentDot } from './enrichment-dot'

type LocalArtist = {
  id: string
  nome: string
  pais: string | null
  tags_editorial: string[] | null
  lastfm_listeners: number | null
  mbid?: string | null
}
type MBCandidate = {
  mbid: string; nome: string; pais: string | null
  tipo: string | null; disambiguation: string | null
}
type Phase = 'local' | 'mb' | 'enriching'

export type OharaSearchHandle = { open: () => void }

export const OharaSearch = forwardRef<OharaSearchHandle, { defaultExpanded?: boolean }>(
function OharaSearch({ defaultExpanded = false }, ref) {
  const [open,          setOpen]          = useState(defaultExpanded)
  const [query,         setQuery]         = useState('')
  const [phase,         setPhase]         = useState<Phase>('local')
  const [localResults,  setLocalResults]  = useState<LocalArtist[]>([])
  const [mbResults,     setMbResults]     = useState<MBCandidate[]>([])
  const [loading,       setLoading]       = useState(false)
  const [enrichingNome, setEnrichingNome] = useState('')
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)

  // ── Auto-open via ?abrir=artista ────────────────────────────
  useEffect(() => {
    if (searchParams.get('abrir') === 'artista') {
      openSearch()
      router.replace(pathname)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // ── Local search (debounce 300ms) ────────────────────────────
  useEffect(() => {
    if (!open || phase !== 'local') return
    if (query.length < 2) { setLocalResults([]); return }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/artists?search=${encodeURIComponent(query)}`)
        const data = await res.json()
        setLocalResults(data.artists ?? [])
      } finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query, open, phase])

  // ── MB search (debounce 500ms) ───────────────────────────────
  useEffect(() => {
    if (!open || phase !== 'mb') return
    if (query.length < 2) { setMbResults([]); return }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/musicbrainz?action=search&q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setMbResults(data.artists ?? [])
      } finally { setLoading(false) }
    }, 500)
    return () => clearTimeout(t)
  }, [query, open, phase])

  // ── Click outside to close ───────────────────────────────────
  useEffect(() => {
    if (!open || defaultExpanded) return
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeSearch()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, defaultExpanded])

  function openSearch() {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  function closeSearch() {
    if (defaultExpanded) return
    setOpen(false)
    setQuery('')
    setPhase('local')
    setLocalResults([])
    setMbResults([])
  }

  function navigate(id: string) {
    router.push(`/artistas/${id}`)
    setQuery('')
    setLocalResults([])
    setMbResults([])
    if (!defaultExpanded) {
      setOpen(false)
      setPhase('local')
    }
  }

  async function enrichAndNavigate(candidate: MBCandidate) {
    setPhase('enriching')
    setEnrichingNome(candidate.nome)
    try {
      const enrichRes  = await fetch(`/api/enrich?mbid=${candidate.mbid}&name=${encodeURIComponent(candidate.nome)}`)
      const enrichData = await enrichRes.json()
      if (enrichData.error) throw new Error(enrichData.error)

      const saveRes  = await fetch('/api/artists', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mbid:            enrichData.identity?.mbid,
          name:            enrichData.identity?.name,
          country:         enrichData.identity?.country,
          type:            enrichData.identity?.type,
          tags_editorial:  enrichData.tags_editorial,
          tags_behavioral: enrichData.tags_behavioral,
          listeners:       enrichData.audience?.listeners,
          wikipedia_url:   enrichData.sources?.wikipedia
            ? `https://en.wikipedia.org/wiki/${encodeURIComponent((enrichData.identity?.name ?? '').replace(/\s+/g, '_'))}`
            : null,
        }),
      })
      const saved = await saveRes.json()
      if (saved.id) navigate(saved.id)
      else setPhase('mb')
    } catch {
      setPhase('mb')
    }
  }

  const noLocal = phase === 'local' && !loading && query.length >= 2 && localResults.length === 0

  useImperativeHandle(ref, () => ({ open: openSearch }))

  // ── Collapsed state ──────────────────────────────────────────
  if (!open) {
    return (
      <button onClick={openSearch} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-dim)', fontSize: '0.75rem',
        padding: '0.25rem 0', textAlign: 'left',
      }}>
        buscar artista
      </button>
    )
  }

  // ── Expanded state ───────────────────────────────────────────
  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {phase === 'enriching' ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>
          <span style={{ color: 'var(--amber)' }}>⟳</span> enriquecendo {enrichingNome}…
        </p>
      ) : (
        <>
          {phase === 'mb' && (
            <button onClick={() => { setPhase('local'); setMbResults([]) }} style={{
              fontSize: '0.7rem', color: 'var(--cyan)', background: 'none',
              border: 'none', cursor: 'pointer', padding: '0 0 4px', display: 'block',
            }}>
              ← local
            </button>
          )}

          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && closeSearch()}
              placeholder={phase === 'mb' ? 'musicbrainz...' : 'buscar artista...'}
              autoFocus={phase === 'mb'}
              style={{
                width: '100%', fontSize: '0.8rem',
                background: 'var(--surface)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: 4,
                padding: '0.35rem 0.6rem', outline: 'none', boxSizing: 'border-box',
              }}
            />
            {loading && (
              <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>···</span>
            )}
          </div>

          {/* Resultados locais */}
          {phase === 'local' && localResults.length > 0 && (
            <div style={{
              position: 'absolute', left: 0, right: 0, zIndex: 200,
              background: 'var(--nav-bg)', border: '1px solid var(--border)',
              borderRadius: 4, marginTop: 2, maxHeight: 260, overflowY: 'auto',
            }}>
              {localResults.slice(0, 8).map(a => {
                const tag = a.tags_editorial?.[0] ?? null
                const ouvintes = a.lastfm_listeners
                  ? a.lastfm_listeners.toLocaleString('pt-BR')
                  : null
                return (
                  <button key={a.id} onClick={() => navigate(a.id)} style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '0.4rem 0.7rem', background: 'none', border: 'none',
                    borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <EnrichmentDot mbid={a.mbid} />
                      <span style={{ fontSize: '0.825rem', color: 'var(--text)' }}>{a.nome}</span>
                    </span>
                    {(a.pais || tag || ouvintes) && (
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 1 }}>
                        {[a.pais, tag, ouvintes ? `${ouvintes} ouvintes` : null].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Sem resultado local → busca MB */}
          {noLocal && (
            <button onClick={() => setPhase('mb')} style={{
              marginTop: 5, fontSize: '0.75rem', color: 'var(--cyan)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'block',
            }}>
              buscar no musicbrainz →
            </button>
          )}

          {/* Resultados MB */}
          {phase === 'mb' && mbResults.length > 0 && !loading && (
            <div style={{
              position: 'absolute', left: 0, right: 0, zIndex: 200,
              background: 'var(--nav-bg)', border: '1px solid var(--border)',
              borderRadius: 4, marginTop: 2, maxHeight: 260, overflowY: 'auto',
            }}>
              {mbResults.slice(0, 8).map(r => (
                <button key={r.mbid} onClick={() => enrichAndNavigate(r)} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '0.4rem 0.7rem', background: 'none', border: 'none',
                  borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  borderLeft: '2px solid var(--amber)',
                }}>
                  <span style={{ fontSize: '0.825rem', color: 'var(--text)' }}>{r.nome}</span>
                  {(r.pais || r.tipo) && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: 5 }}>
                      · {[r.tipo, r.pais].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {r.disambiguation && (
                    <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 1 }}>
                      {r.disambiguation}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Sem resultado MB */}
          {phase === 'mb' && !loading && query.length >= 2 && mbResults.length === 0 && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 5 }}>
              nenhum resultado no musicbrainz
            </p>
          )}

          {/* Fechar (só no nav, não na home) */}
          {!defaultExpanded && (
            <button onClick={closeSearch} style={{
              marginTop: 5, fontSize: '0.7rem', color: 'var(--text-muted)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'block',
            }}>
              fechar
            </button>
          )}
        </>
      )}
    </div>
  )
})
