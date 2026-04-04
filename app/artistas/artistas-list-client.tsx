'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { removeAccents } from '@/lib/text-utils'
import { countryName } from '@/lib/countries'

const PAGE_SIZE = 10

const LETRAS = ['#','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z']

// Strip "(native name)" from countryName results for compact display
function paisPrimario(pais: string | null): string | null {
  if (!pais) return null
  return countryName(pais)?.replace(/\s*\(.*\)$/, '').trim() ?? null
}

function letraDeNome(nome: string): string {
  const first = nome[0] ?? ''
  if (/\d/.test(first)) return '#'
  return removeAccents(first).toUpperCase()
}

type Artist = {
  id: string
  nome: string
  pais: string | null
  founded_year: number | null
  top_tag: string | null
  lastfm_listeners: number | null
  total_shows: number
  mbid?: string | null
}

export function ArtistasListClient({ artists }: { artists: Artist[] }) {
  const [busca,      setBusca]      = useState('')
  const [letraAtiva, setLetraAtiva] = useState<string | null>(null)
  const [pagina,     setPagina]     = useState(1)

  // Step 1 — text search
  const buscaFiltered = useMemo(() => {
    if (!busca.trim()) return artists
    const q = removeAccents(busca.toLowerCase())
    return artists.filter(a =>
      removeAccents(a.nome.toLowerCase()).includes(q) ||
      removeAccents((a.pais ?? '').toLowerCase()).includes(q) ||
      removeAccents((a.top_tag ?? '').toLowerCase()).includes(q)
    )
  }, [artists, busca])

  // Letters present in the current busca result
  const letrasDisponiveis = useMemo(() => {
    const set = new Set<string>()
    for (const a of buscaFiltered) set.add(letraDeNome(a.nome))
    return set
  }, [buscaFiltered])

  // Step 2 — letter filter (applied on top of busca)
  const filtered = useMemo(() => {
    if (!letraAtiva) return buscaFiltered
    return buscaFiltered.filter(a => letraDeNome(a.nome) === letraAtiva)
  }, [buscaFiltered, letraAtiva])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page       = Math.min(pagina, totalPages)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleBusca(val: string) {
    setBusca(val)
    setPagina(1)
  }

  function handleLetra(l: string) {
    setLetraAtiva(prev => prev === l ? null : l)
    setPagina(1)
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Header — mesmo padrão de shows */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--text)', margin: 0, flexShrink: 0 }}>Artistas</h1>
        <input
          value={busca}
          onChange={e => handleBusca(e.target.value)}
          placeholder="buscar..."
          style={{
            flex: 1, fontSize: '0.8rem', background: 'none',
            border: 'none', borderBottom: '1px solid var(--border)',
            color: 'var(--text)', outline: 'none', padding: '0.2rem 0.25rem',
          }}
        />
        <Link href="/artistas?abrir=artista" style={{
          padding: '0.4rem 1rem', fontSize: '0.8rem', flexShrink: 0,
          background: 'var(--surface-raised)', color: 'var(--text)',
          border: '1px solid var(--border)', borderRadius: 4, textDecoration: 'none',
        }}>
          + novo artista
        </Link>
      </div>

      {/* Barra de letras */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.1rem', marginBottom: '0.75rem' }}>
        {LETRAS.map(l => {
          const hasItems = letrasDisponiveis.has(l)
          const isActive = letraAtiva === l
          return (
            <button
              key={l}
              onClick={hasItems ? () => handleLetra(l) : undefined}
              style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.68rem',
                letterSpacing: '0.05em',
                background:    'none',
                border:        'none',
                padding:       '0.15rem 0.25rem',
                cursor:        hasItems ? 'pointer' : 'default',
                color:         isActive ? 'var(--accent-structure)' : 'var(--text-muted)',
                opacity:       hasItems ? 1 : 0.3,
              }}
            >
              {l}
            </button>
          )
        })}
      </div>

      <div>
        {filtered.length === 0 && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', padding: '2rem 0' }}>
            Nenhum artista encontrado.
          </p>
        )}
        {(() => {
          const items: React.ReactNode[] = []
          let currentLetter = ''
          for (const a of paginated) {
            const letter = letraDeNome(a.nome)
            if (letter !== currentLetter) {
              currentLetter = letter
              items.push(
                <div key={`sep-${letter}`} style={{
                  paddingTop: items.length === 0 ? 0 : '0.75rem',
                  paddingBottom: '0.2rem',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                    color: 'var(--text-muted)', letterSpacing: '0.08em',
                  }}>
                    {letter}
                  </span>
                </div>
              )
            }
            const pais = paisPrimario(a.pais)
            const meta: string[] = []
            if (pais) meta.push(pais)
            if (a.top_tag) meta.push(a.top_tag)
            if (a.founded_year) meta.push(`desde ${a.founded_year}`)
            items.push(
              <Link key={a.id} href={`/artistas/${a.id}`} style={{
                display: 'block',
                padding: '0.55rem 0',
                borderBottom: '1px solid var(--border)',
                textDecoration: 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem' }}>
                  <span style={{
                    fontFamily: 'var(--font-serif)', fontSize: '0.95rem', color: 'var(--text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {a.nome}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.75rem', flexShrink: 0,
                    color: a.total_shows === 0 ? 'var(--text-muted)' : 'var(--text-dim)',
                  }}>
                    {a.total_shows === 0 ? 'sem shows' : `${a.total_shows} ${a.total_shows !== 1 ? 'shows' : 'show'}`}
                  </span>
                </div>
                {meta.length > 0 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>
                    {meta.join(' | ')}
                  </div>
                )}
              </Link>
            )
          }
          return items
        })()}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', marginTop: '1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
          <button
            onClick={() => { setPagina(p => Math.max(1, p - 1)); window.scrollTo({ top: 0 }) }}
            disabled={page <= 1}
            style={{ background: 'none', border: 'none', cursor: page <= 1 ? 'default' : 'pointer', color: page <= 1 ? 'var(--text-muted)' : 'var(--text-primary)', padding: 0 }}
          >
            ← anterior
          </button>
          <span style={{ color: 'var(--text-dim)' }}>página {page} de {totalPages}</span>
          <button
            onClick={() => { setPagina(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0 }) }}
            disabled={page >= totalPages}
            style={{ background: 'none', border: 'none', cursor: page >= totalPages ? 'default' : 'pointer', color: page >= totalPages ? 'var(--text-muted)' : 'var(--text-primary)', padding: 0 }}
          >
            próxima →
          </button>
        </div>
      )}
    </div>
  )
}
