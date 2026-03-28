'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { removeAccents } from '@/lib/text-utils'

type Artist = {
  id: string
  nome: string
  pais: string | null
  top_tag: string | null
  lastfm_listeners: number | null
  total_shows: number
}

export function ArtistasListClient({ artists }: { artists: Artist[] }) {
  const [busca, setBusca] = useState('')

  const filtered = useMemo(() => {
    if (!busca.trim()) return artists
    const q = removeAccents(busca.toLowerCase())
    return artists.filter(a =>
      removeAccents(a.nome.toLowerCase()).includes(q) ||
      removeAccents((a.pais ?? '').toLowerCase()).includes(q) ||
      removeAccents((a.top_tag ?? '').toLowerCase()).includes(q)
    )
  }, [artists, busca])

  return (
    <div style={{ padding: '1.5rem', maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Artistas</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/artistas?abrir=artista" style={{
            fontSize: '0.8rem', color: 'var(--text-dim)',
            border: '1px solid var(--border)', borderRadius: 4,
            padding: '0.25rem 0.7rem', textDecoration: 'none',
          }}>
            + novo artista
          </Link>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="buscar..."
            style={{
              fontSize: '0.8rem', background: 'none',
              border: 'none', borderBottom: '1px solid var(--border)',
              color: 'var(--text)', outline: 'none',
              padding: '0.2rem 0.25rem', width: 140,
            }}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            {filtered.length} de {artists.length}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', padding: '0 0.5rem 0.5rem', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flex: 1 }}>Nome</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 80, flexShrink: 0 }}>País</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 120, flexShrink: 0 }}>Tag principal</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 80, flexShrink: 0 }}>ouvintes</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 50, flexShrink: 0, textAlign: 'right' }}>Shows</span>
      </div>

      <div>
        {filtered.length === 0 && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', padding: '2rem 0.5rem' }}>
            Nenhum artista encontrado.
          </p>
        )}
        {filtered.map(a => (
          <Link key={a.id} href={`/artistas/${a.id}`} style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            padding: '0.6rem 0.5rem', borderBottom: '1px solid var(--border)',
            textDecoration: 'none',
          }}>
            <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.nome}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 80, flexShrink: 0 }}>
              {a.pais ?? '—'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 120, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.top_tag ?? '—'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 80, flexShrink: 0, fontFamily: 'monospace' }}>
              {a.lastfm_listeners ? a.lastfm_listeners.toLocaleString('pt-BR') : '—'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 50, flexShrink: 0, textAlign: 'right' }}>
              {a.total_shows > 0 ? a.total_shows : '—'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}