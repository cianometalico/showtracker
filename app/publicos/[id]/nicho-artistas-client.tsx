'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { addArtistToNicho, removeArtistFromNicho, updateArtistNichoScore } from './actions'

type LinkedArtist = {
  artist_id: string
  score: number | null
  nome: string
  lastfm_listeners: number | null
  topTag: string | null
}

type SearchResult = {
  id: string
  nome: string
  pais: string | null
  lastfm_listeners: number | null
}

export function NichoArtistasClient({
  nichoId,
  initialArtistas,
}: {
  nichoId: string
  initialArtistas: LinkedArtist[]
}) {
  const [artistas,     setArtistas]    = useState<LinkedArtist[]>(initialArtistas)
  const [editingScore, setEditingScore] = useState<string | null>(null)
  const [scoreInput,   setScoreInput]   = useState('')
  const [query,        setQuery]        = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [adding, startAdd] = useTransition()
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Busca com debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || query.trim().length < 2) {
      setResults([])
      setShowResults(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/artists?search=${encodeURIComponent(query.trim())}`)
      if (res.ok) {
        const data = await res.json()
        const linked = new Set(artistas.map(a => a.artist_id))
        setResults((data.artists ?? []).filter((a: SearchResult) => !linked.has(a.id)))
        setShowResults(true)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, artistas])

  function handleAdd(artist: SearchResult) {
    setQuery('')
    setShowResults(false)
    startAdd(async () => {
      const res = await addArtistToNicho(nichoId, artist.id, 1.0)
      if (!res.error) {
        setArtistas(prev => [...prev, {
          artist_id: artist.id,
          score: 1.0,
          nome: artist.nome,
          lastfm_listeners: artist.lastfm_listeners,
          topTag: null,
        }].sort((a, b) => (b.lastfm_listeners ?? 0) - (a.lastfm_listeners ?? 0)))
      }
    })
  }

  function handleRemove(artistId: string) {
    startAdd(async () => {
      const res = await removeArtistFromNicho(nichoId, artistId)
      if (!res.error) setArtistas(prev => prev.filter(a => a.artist_id !== artistId))
    })
  }

  function openScoreEdit(artistId: string, current: number | null) {
    setEditingScore(artistId)
    setScoreInput(String(current ?? 1))
  }

  function commitScore(artistId: string) {
    const n = parseFloat(scoreInput)
    if (!isNaN(n) && n > 0) {
      const score = Math.round(Math.min(Math.max(n, 0.1), 3.0) * 10) / 10
      setArtistas(prev => prev.map(a => a.artist_id === artistId ? { ...a, score } : a))
      updateArtistNichoScore(nichoId, artistId, score)
    }
    setEditingScore(null)
  }

  function handleScoreKeyDown(e: React.KeyboardEvent, artistId: string) {
    if (e.key === 'Enter') { e.preventDefault(); commitScore(artistId) }
    if (e.key === 'Escape') setEditingScore(null)
  }

  const labelColor = 'rgba(255,255,255,0.45)'
  const valueColor = 'rgba(255,255,255,0.85)'

  return (
    <section>
      <p style={sectionLabel}>artistas — {artistas.length}</p>

      {/* Lista */}
      {artistas.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: labelColor, marginBottom: '0.75rem' }}>
          nenhum artista vinculado.
        </p>
      ) : (
        <div style={{ marginBottom: '0.75rem' }}>
          {artistas.map(a => (
            <div key={a.artist_id} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.45rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <Link href={`/artistas/${a.artist_id}`} style={{ flex: 1, fontSize: '0.9rem', color: valueColor, textDecoration: 'none' }}>
                {a.nome}
              </Link>
              {a.topTag && <span style={{ fontSize: '0.72rem', color: labelColor }}>{a.topTag}</span>}
              {a.lastfm_listeners != null && (
                <span style={{ fontSize: '0.72rem', color: labelColor, fontFamily: 'monospace', width: 72, textAlign: 'right' }}>
                  {a.lastfm_listeners.toLocaleString('pt-BR')}
                </span>
              )}
              {/* Score — read/edit */}
              {editingScore === a.artist_id ? (
                <input
                  autoFocus
                  type="number"
                  value={scoreInput}
                  step={0.1} min={0.1} max={3}
                  onChange={e => setScoreInput(e.target.value)}
                  onBlur={() => commitScore(a.artist_id)}
                  onKeyDown={e => handleScoreKeyDown(e, a.artist_id)}
                  style={{
                    width: 52, fontSize: '0.78rem', textAlign: 'center',
                    background: 'var(--surface)', color: 'var(--cyan)',
                    border: '1px solid var(--cyan)', borderRadius: 3,
                    padding: '0.15rem 0.3rem', outline: 'none',
                  }}
                />
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: '0.75rem', color: labelColor, fontFamily: 'monospace' }}>
                    {(a.score ?? 1).toFixed(1)}
                  </span>
                  <button
                    onClick={() => openScoreEdit(a.artist_id, a.score)}
                    style={{
                      fontSize: '0.6rem', color: labelColor, background: 'none',
                      border: 'none', cursor: 'pointer', padding: '0 1px', lineHeight: 1,
                      opacity: 0.5,
                    }}
                    title="editar score"
                  >✎</button>
                </span>
              )}
              <button
                onClick={() => handleRemove(a.artist_id)}
                style={{
                  fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
                  lineHeight: 1,
                }}
                title="remover vínculo"
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Busca para adicionar */}
      <div ref={searchRef} style={{ position: 'relative', maxWidth: 340 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="buscar artista para vincular..."
          disabled={adding}
          style={{
            width: '100%', fontSize: '0.825rem',
            background: 'var(--surface)', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: 4,
            padding: '0.4rem 0.75rem', outline: 'none', boxSizing: 'border-box',
            opacity: adding ? 0.5 : 1,
          }}
        />
        {showResults && results.length > 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 4, zIndex: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}>
            {results.map(r => (
              <button
                key={r.id}
                onClick={() => handleAdd(r)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  width: '100%', padding: '0.5rem 0.75rem',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <span style={{ flex: 1, fontSize: '0.85rem', color: valueColor }}>{r.nome}</span>
                {r.pais && <span style={{ fontSize: '0.7rem', color: labelColor }}>{r.pais}</span>}
                {r.lastfm_listeners != null && (
                  <span style={{ fontSize: '0.7rem', color: labelColor, fontFamily: 'monospace' }}>
                    {r.lastfm_listeners.toLocaleString('pt-BR')}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        {showResults && results.length === 0 && query.trim().length >= 2 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '0.5rem 0.75rem',
            fontSize: '0.8rem', color: labelColor,
          }}>
            nenhum artista encontrado
          </div>
        )}
      </div>
    </section>
  )
}

const sectionLabel: React.CSSProperties = {
  fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase', letterSpacing: '0.1em',
  margin: '0 0 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 6,
}
