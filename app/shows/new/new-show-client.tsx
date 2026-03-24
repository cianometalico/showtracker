'use client'

import { useState, useTransition } from 'react'
import { createShow, searchArtists, searchVenues } from './actions'
import type { CreateShowInput } from './actions'

type Artist = { id: string; nome: string }
type Venue  = { id: string; nome: string; cidade: string }

export function NewShowClient() {
  const [nome_evento,  setNomeEvento]  = useState('')
  const [data,         setData]        = useState('')
  const [status,       setStatus]      = useState('bem vendido')
  const [venueId,      setVenueId]     = useState<string | null>(null)
  const [venueLabel,   setVenueLabel]  = useState('')
  const [venueQuery,   setVenueQuery]  = useState('')
  const [venueResults, setVenueResults]= useState<Venue[]>([])
  const [venueNovo,    setVenueNovo]   = useState(false)
  const [venueNome,    setVenueNome]   = useState('')
  const [venueCidade,  setVenueCidade] = useState('São Paulo')

  const [artistIds,    setArtistIds]   = useState<Artist[]>([])
  const [artistNovos,  setArtistNovos] = useState<string[]>([])
  const [artistQuery,  setArtistQuery] = useState('')
  const [artistRes,    setArtistRes]   = useState<Artist[]>([])

  const [saving, startSave] = useTransition()
  const [error,  setError]  = useState<string | null>(null)

  async function onVenueSearch(q: string) {
    setVenueQuery(q)
    setVenueId(null)
    setVenueLabel('')
    if (q.length < 2) { setVenueResults([]); return }
    const res = await searchVenues(q)
    setVenueResults(res)
  }

  async function onArtistSearch(q: string) {
    setArtistQuery(q)
    if (q.length < 2) { setArtistRes([]); return }
    const res = await searchArtists(q)
    setArtistRes(res.filter(a => !artistIds.find(x => x.id === a.id)))
  }

  function addArtistExistente(a: Artist) {
    setArtistIds(prev => [...prev, a])
    setArtistQuery('')
    setArtistRes([])
  }

  function addArtistNovo() {
    const nome = artistQuery.trim()
    if (!nome || artistNovos.includes(nome)) return
    setArtistNovos(prev => [...prev, nome])
    setArtistQuery('')
    setArtistRes([])
  }

  function removeArtist(id: string)  { setArtistIds(prev => prev.filter(a => a.id !== id)) }
  function removeNovo(nome: string)   { setArtistNovos(prev => prev.filter(n => n !== nome)) }

  function moveUp(i: number) {
    if (i === 0) return
    setArtistIds(prev => {
      const next = [...prev]
      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
      return next
    })
  }

  function submit() {
    if (!data)                                       { setError('Data obrigatória'); return }
    if (!venueId && !venueNome)                      { setError('Venue obrigatório'); return }
    if (artistIds.length === 0 && artistNovos.length === 0) { setError('Pelo menos um artista é necessário'); return }
    setError(null)

    const input: CreateShowInput = {
      nome_evento:         nome_evento || null,
      data,
      venue_id:            venueId,
      venue_nome_novo:     venueNovo ? venueNome : null,
      venue_cidade_novo:   venueNovo ? venueCidade : null,
      status_ingresso:     status,
      participou: data ? new Date(data + 'T23:59:59') < new Date() : false,
      artista_ids:         artistIds.map(a => a.id),
      artista_nomes_novos: artistNovos,
    }
    startSave(async () => { await createShow(input) })
  }

  const s = (style: React.CSSProperties) => style

  return (
    <div style={{ padding: '1.5rem', maxWidth: 560 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <a href="/shows" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textDecoration: 'none' }}>← Shows</a>
      </div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1.5rem' }}>Novo show</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Nome evento */}
        <Field label="Nome do evento (opcional)">
          <input value={nome_evento} onChange={e => setNomeEvento(e.target.value)}
            placeholder="Lollapalooza 2026, NDP Fest..."
            style={inputStyle} />
        </Field>

        {/* Data */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Data *">
            <input type="date" value={data} onChange={e => setData(e.target.value)}
              style={inputStyle} />
          </Field>
          <Field label="Status ingresso">
            <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
              <option value="sold out">Sold Out</option>
              <option value="bem vendido">Bem Vendido</option>
              <option value="mal vendido">Mal Vendido</option>
            </select>
          </Field>
        </div>

        {/* Venue */}
        <Field label="Venue *">
          {venueId ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ ...inputStyle, flex: 1, color: 'var(--text)' }}>{venueLabel}</span>
              <button onClick={() => { setVenueId(null); setVenueLabel(''); setVenueQuery(''); setVenueNovo(false) }}
                style={clearBtnStyle}>✕</button>
            </div>
          ) : (
            <div>
              <input value={venueQuery} onChange={e => onVenueSearch(e.target.value)}
                placeholder="Buscar venue..." style={inputStyle} />
              {venueResults.length > 0 && (
                <div style={dropdownStyle}>
                  {venueResults.map(v => (
                    <button key={v.id}
                      onClick={() => { setVenueId(v.id); setVenueLabel(v.nome); setVenueResults([]); setVenueNovo(false) }}
                      style={dropdownItemStyle}>
                      {v.nome} <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>· {v.cidade}</span>
                    </button>
                  ))}
                </div>
              )}
              {venueQuery.length >= 2 && venueResults.length === 0 && !venueNovo && (
                <button onClick={() => { setVenueNovo(true); setVenueNome(venueQuery) }}
                  style={{ fontSize: '0.8rem', color: 'var(--cyan)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>
                  + Criar "{venueQuery}" como novo venue
                </button>
              )}
              {venueNovo && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, border: '1px dashed var(--border)', borderRadius: 4, padding: '0.75rem' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>Novo venue</p>
                  <input value={venueNome} onChange={e => setVenueNome(e.target.value)} placeholder="Nome" style={inputStyle} />
                  <input value={venueCidade} onChange={e => setVenueCidade(e.target.value)} placeholder="Cidade" style={inputStyle} />
                </div>
              )}
            </div>
          )}
        </Field>

        {/* Artistas */}
        <Field label="Artistas * (ordem = tamanho de público)">
          {(artistIds.length > 0 || artistNovos.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
              {artistIds.map((a, i) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)', width: 16 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text)' }}>{a.nome}</span>
                  {i > 0 && (
                    <button onClick={() => moveUp(i)}
                      style={{ fontSize: '0.7rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>↑</button>
                  )}
                  <button onClick={() => removeArtist(a.id)}
                    style={clearBtnStyle}>✕</button>
                </div>
              ))}
              {artistNovos.map((nome, i) => (
                <div key={nome} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)', width: 16 }}>{artistIds.length + i + 1}</span>
                  <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--cyan)' }}>{nome} <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>novo</span></span>
                  <button onClick={() => removeNovo(nome)} style={clearBtnStyle}>✕</button>
                </div>
              ))}
            </div>
          )}
          <input value={artistQuery}
            onChange={e => onArtistSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && artistRes.length === 0 && addArtistNovo()}
            placeholder="Buscar ou digitar nome..."
            style={inputStyle} />
          {artistRes.length > 0 && (
            <div style={dropdownStyle}>
              {artistRes.map(a => (
                <button key={a.id} onClick={() => addArtistExistente(a)} style={dropdownItemStyle}>
                  {a.nome}
                </button>
              ))}
            </div>
          )}
          {artistQuery.length >= 2 && artistRes.length === 0 && (
            <button onClick={addArtistNovo}
              style={{ fontSize: '0.8rem', color: 'var(--cyan)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>
              + Adicionar "{artistQuery}" como novo (Enter)
            </button>
          )}
        </Field>

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
          {saving ? 'Salvando...' : 'Criar show'}
        </button>
        <a href="/shows" style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textDecoration: 'none' }}>Cancelar</a>
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
  width: '100%',
  fontSize: '0.875rem',
  background: 'var(--surface)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '0.45rem 0.75rem',
  outline: 'none',
  boxSizing: 'border-box',
}

const dropdownStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 4,
  marginTop: 4,
  overflow: 'hidden',
  background: 'var(--surface)',
}

const dropdownItemStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  fontSize: '0.875rem',
  padding: '0.45rem 0.75rem',
  background: 'none',
  border: 'none',
  borderBottom: '1px solid var(--border)',
  cursor: 'pointer',
  color: 'var(--text)',
}

const clearBtnStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-dim)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0 4px',
}