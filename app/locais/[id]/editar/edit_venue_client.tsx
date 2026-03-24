'use client'

import { useState, useTransition } from 'react'
import { updateVenue, deleteVenue } from '../actions'
import type { UpdateVenueInput } from '../actions'

type Props = {
  venue: {
    id: string
    nome: string
    cidade: string
    capacidade_praticavel: number | null
    risco_fiscalizacao: string | null
    lat: number | null
    lng: number | null
  }
}

export function EditVenueClient({ venue }: Props) {
  const [nome,   setNome]   = useState(venue.nome)
  const [cidade, setCidade] = useState(venue.cidade ?? '')
  const [cap,    setCap]    = useState(String(venue.capacidade_praticavel ?? ''))
  const [risco,  setRisco]  = useState(venue.risco_fiscalizacao ?? '')
  const [lat,    setLat]    = useState(String(venue.lat ?? ''))
  const [lng,    setLng]    = useState(String(venue.lng ?? ''))

  const [saving,   startSave]   = useTransition()
  const [deleting, startDelete] = useTransition()
  const [error,    setError]    = useState<string | null>(null)

  function submit() {
    if (!nome.trim()) { setError('Nome obrigatório'); return }
    setError(null)
    const input: UpdateVenueInput = {
      nome:                  nome.trim(),
      cidade:                cidade.trim(),
      capacidade_praticavel: cap ? parseInt(cap) : null,
      risco_fiscalizacao:    risco || null,
      lat:                   lat ? parseFloat(lat) : null,
      lng:                   lng ? parseFloat(lng) : null,
    }
    startSave(async () => { await updateVenue(venue.id, input) })
  }

  function handleDelete() {
    if (!confirm('Excluir este local? Shows vinculados perderão o venue.')) return
    startDelete(async () => { await deleteVenue(venue.id) })
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 480 }}>

      {/* Header com breadcrumb e excluir */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <a href={`/locais/${venue.id}`} style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textDecoration: 'none' }}>
          ← {venue.nome}
        </a>
        <button onClick={handleDelete} disabled={deleting} style={{
          fontSize: '0.75rem', background: 'none', color: 'var(--red)',
          border: '1px solid var(--red)', borderRadius: 4,
          padding: '0.25rem 0.75rem', cursor: 'pointer', opacity: deleting ? 0.5 : 1,
        }}>
          {deleting ? 'Excluindo...' : 'Excluir'}
        </button>
      </div>

      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1.5rem' }}>
        Editar local
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        <Field label="Nome *">
          <input value={nome} onChange={e => setNome(e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Cidade">
          <input value={cidade} onChange={e => setCidade(e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Capacidade praticável">
          <input type="number" value={cap} onChange={e => setCap(e.target.value)}
            placeholder="Ex: 3200" style={inputStyle} />
        </Field>

        <Field label="Risco de fiscalização">
          <select value={risco} onChange={e => setRisco(e.target.value)} style={inputStyle}>
            <option value="">—</option>
            <option value="low">Baixo</option>
            <option value="medium">Médio</option>
            <option value="high">Alto</option>
          </select>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Latitude">
            <input value={lat} onChange={e => setLat(e.target.value)}
              placeholder="-23.5514" style={inputStyle} />
          </Field>
          <Field label="Longitude">
            <input value={lng} onChange={e => setLng(e.target.value)}
              placeholder="-46.6339" style={inputStyle} />
          </Field>
        </div>

        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: -8 }}>
          Pega no Google Maps: clique direito → "O que há aqui?"
        </p>

      </div>

      {error && <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--red)' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '1.5rem' }}>
        <button onClick={submit} disabled={saving} style={{
          padding: '0.5rem 1.5rem', fontSize: '0.875rem',
          background: 'var(--surface-2)', color: 'var(--text)',
          border: '1px solid var(--border)', borderRadius: 4,
          cursor: 'pointer', opacity: saving ? 0.5 : 1,
        }}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        <a href={`/locais/${venue.id}`} style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textDecoration: 'none' }}>
          Cancelar
        </a>
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