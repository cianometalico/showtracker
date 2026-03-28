'use client'

import { useState, useTransition, useMemo } from 'react'
import { createDesign } from './actions'
import { removeAccents } from '@/lib/text-utils'

type Artist = { id: string; nome: string }

export function NewDesignClient({ artists }: { artists: Artist[] }) {
  const [nome,       setNome]       = useState('')
  const [artistId,   setArtistId]   = useState('')
  const [artistQ,    setArtistQ]    = useState('')
  const [descricao,  setDescricao]  = useState('')
  const [ativo,      setAtivo]      = useState(true)

  const [saving, startSave] = useTransition()
  const [error,  setError]  = useState<string | null>(null)

  const artistResults = useMemo(() => {
    if (!artistQ.trim() || artistQ.length < 1) return []
    const q = removeAccents(artistQ.toLowerCase())
    return artists.filter(a => removeAccents(a.nome.toLowerCase()).includes(q)).slice(0, 8)
  }, [artists, artistQ])

  const selectedArtist = artists.find(a => a.id === artistId)

  function submit() {
    if (!nome.trim())   { setError('Nome obrigatório'); return }
    if (!artistId)      { setError('Artista obrigatório'); return }
    setError(null)
    startSave(async () => {
      await createDesign({ nome: nome.trim(), artist_id: artistId, descricao: descricao || null, ativo })
    })
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 480 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <a href="/estoque" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textDecoration: 'none' }}>← Estoque</a>
      </div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1.5rem' }}>Novo design</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        <Field label="Nome *">
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="ex: Cabeça de Medusa" style={inputStyle} />
        </Field>

        <Field label="Artista *">
          {selectedArtist ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ ...inputStyle, flex: 1, color: 'var(--text)' }}>{selectedArtist.nome}</span>
              <button onClick={() => { setArtistId(''); setArtistQ('') }}
                style={{ fontSize: '0.75rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>✕</button>
            </div>
          ) : (
            <div>
              <input value={artistQ} onChange={e => setArtistQ(e.target.value)}
                placeholder="Buscar artista..." style={inputStyle} />
              {artistResults.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 4, marginTop: 4, overflow: 'hidden', background: 'var(--surface)' }}>
                  {artistResults.map(a => (
                    <button key={a.id}
                      onClick={() => { setArtistId(a.id); setArtistQ('') }}
                      style={{ width: '100%', textAlign: 'left', fontSize: '0.875rem', padding: '0.45rem 0.75rem', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text)' }}>
                      {a.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Field>

        <Field label="Descrição">
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
            rows={3} placeholder="Opcional..." style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" id="ativo" checked={ativo} onChange={e => setAtivo(e.target.checked)}
            style={{ width: 'auto', cursor: 'pointer' }} />
          <label htmlFor="ativo" style={{ fontSize: '0.875rem', color: 'var(--text)', cursor: 'pointer' }}>Ativo</label>
        </div>

      </div>

      {error && <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--red)' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', alignItems: 'center' }}>
        <button onClick={submit} disabled={saving}
          style={{
            padding: '0.5rem 1.5rem', fontSize: '0.875rem',
            background: 'var(--surface-2)', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: 4,
            cursor: 'pointer', opacity: saving ? 0.5 : 1,
          }}>
          {saving ? 'Salvando...' : 'Criar design'}
        </button>
        <a href="/estoque" style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textDecoration: 'none' }}>Cancelar</a>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: '0.875rem', background: 'var(--surface)', color: 'var(--text)',
  border: '1px solid var(--border)', borderRadius: 4, padding: '0.45rem 0.75rem',
  outline: 'none', boxSizing: 'border-box',
}
