'use client'

import { useState, useTransition, Fragment } from 'react'
import { updateArtist, deleteArtist } from './actions'
import { countryName } from '@/lib/countries'
import { EnrichmentDot } from '@/components/enrichment-dot'

type ArtistData = {
  id: string
  nome: string
  pais: string | null
  mbid: string | null
  founded_year: number | null
  lastfm_listeners: number | null
}

export function ArtistDetailClient({ artist }: { artist: ArtistData }) {
  const [isEditing,    setIsEditing]    = useState(false)
  const [editError,    setEditError]    = useState<string | null>(null)
  const [deleteError,  setDeleteError]  = useState<string | null>(null)
  const [saving,       startSave]       = useTransition()
  const [deleting,     startDelete]     = useTransition()

  const [eNome, setENome] = useState(artist.nome)
  const [ePais, setEPais] = useState(artist.pais ?? '')

  function startEdit() {
    setENome(artist.nome)
    setEPais(artist.pais ?? '')
    setEditError(null)
    setDeleteError(null)
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
    setEditError(null)
  }

  function submitEdit() {
    if (!eNome.trim()) { setEditError('Nome obrigatório'); return }
    setEditError(null)
    startSave(async () => {
      await updateArtist(artist.id, { nome: eNome.trim(), pais: ePais.trim() || null })
      setIsEditing(false)
    })
  }

  function handleDelete() {
    if (!confirm('Excluir este artista? Não pode ser desfeito.')) return
    setDeleteError(null)
    startDelete(async () => {
      const res = await deleteArtist(artist.id)
      if (res?.error) setDeleteError(res.error)
    })
  }

  if (isEditing) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Nome *</label>
            <input value={eNome} onChange={e => setENome(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>País (ISO){artist.mbid ? ' — somente leitura (vem do enrich)' : ''}</label>
            {artist.mbid ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, padding: '0.45rem 0.75rem', border: '1px solid var(--border)', borderRadius: 4, background: 'rgba(0,0,0,0.15)' }}>
                {countryName(artist.pais)}
              </p>
            ) : (
              <input value={ePais} onChange={e => setEPais(e.target.value)} placeholder="BR, US, GB…" style={inputStyle} />
            )}
          </div>
          {artist.mbid && (
            <div>
              <label style={labelStyle}>MBID (somente leitura)</label>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{artist.mbid}</p>
            </div>
          )}
        </div>

        {editError && <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: '0.75rem' }}>{editError}</p>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button onClick={submitEdit} disabled={saving} style={{ ...saveBtnStyle, opacity: saving ? 0.5 : 1 }}>
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
            <button onClick={cancelEdit} style={cancelBtnStyle}>Cancelar</button>
          </div>
          <button onClick={handleDelete} disabled={deleting} style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', background: 'none', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 4, cursor: 'pointer', opacity: deleting ? 0.5 : 1 }}>
            {deleting ? 'Excluindo…' : 'Excluir artista'}
          </button>
        </div>
        {deleteError && <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{deleteError}</p>}
      </div>
    )
  }

  // ── Pipe segments ──────────────────────────────────────────
  const pipeSegments: React.ReactNode[] = []

  if (artist.pais) {
    pipeSegments.push(countryName(artist.pais))
  }

  if (artist.founded_year) {
    pipeSegments.push(`desde ${artist.founded_year}`)
  }

  pipeSegments.push(
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <EnrichmentDot mbid={artist.mbid} />
      <span style={{ color: artist.mbid ? 'var(--amber)' : 'var(--text-muted)' }}>
        {artist.mbid ? 'enriquecido' : 'pendente'}
      </span>
    </span>
  )

  if (artist.lastfm_listeners && artist.lastfm_listeners > 0) {
    pipeSegments.push(`${artist.lastfm_listeners.toLocaleString('pt-BR')} ouvintes`)
  }

  if (artist.mbid) {
    pipeSegments.push(`mbid ${artist.mbid.slice(0, 8)}…`)
  }

  return (
    <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 400,
          color: 'var(--text)', margin: 0, lineHeight: 1.3,
        }}>
          {artist.nome}
        </h1>
        <button onClick={startEdit} style={editBtnStyle}>editar</button>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap',
        fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
        color: 'var(--text-dim)', marginTop: 6,
      }}>
        {pipeSegments.map((seg, i) => (
          <Fragment key={i}>
            {i > 0 && <span style={{ margin: '0 6px', opacity: 0.4 }}>|</span>}
            <span style={{ whiteSpace: 'nowrap' }}>{seg}</span>
          </Fragment>
        ))}
      </div>
      {deleteError && <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: 4 }}>{deleteError}</p>}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
}
const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: '0.875rem', background: 'var(--surface)', color: 'var(--text)',
  border: '1px solid var(--border)', borderRadius: 4, padding: '0.45rem 0.75rem',
  outline: 'none', boxSizing: 'border-box',
}
const saveBtnStyle: React.CSSProperties = {
  padding: '0.45rem 1.25rem', fontSize: '0.875rem', background: 'var(--surface-raised)',
  color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer',
}
const cancelBtnStyle: React.CSSProperties = {
  fontSize: '0.85rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
}
const editBtnStyle: React.CSSProperties = {
  fontSize: '0.75rem', color: 'var(--text-dim)', background: 'var(--surface-raised)',
  border: '1px solid var(--border)', padding: '0.2rem 0.6rem', borderRadius: 4, cursor: 'pointer', flexShrink: 0,
}
