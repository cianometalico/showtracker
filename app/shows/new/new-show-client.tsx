'use client'

import { useState, useTransition } from 'react'
import { createShow, searchVenues } from './actions'
import type { CreateShowInput } from './actions'
import { ArtistPicker } from '@/components/artist-picker'
import type { PickedArtist } from '@/components/artist-picker'

type Venue = { id: string; nome: string; cidade: string }

interface DateEntry {
  data: string
  artistas: PickedArtist[]
}

export function NewShowClient() {
  const [nome_evento,   setNomeEvento]   = useState('')
  const [status,        setStatus]       = useState('')
  const [concorrencia,  setConcorrencia] = useState('')
  const [sourceUrl,     setSourceUrl]    = useState('')
  const [observacoes,   setObservacoes]  = useState('')

  const [venueId,      setVenueId]      = useState<string | null>(null)
  const [venueLabel,   setVenueLabel]   = useState('')
  const [venueQuery,   setVenueQuery]   = useState('')
  const [venueResults, setVenueResults] = useState<Venue[]>([])
  const [venueNovo,    setVenueNovo]    = useState(false)
  const [venueNome,    setVenueNome]    = useState('')
  const [venueCidade,  setVenueCidade]  = useState('São Paulo')

  const [dates, setDates] = useState<DateEntry[]>([{ data: '', artistas: [] }])

  const [saving, startSave] = useTransition()
  const [error,  setError]  = useState<string | null>(null)

  async function onVenueSearch(q: string) {
    setVenueQuery(q)
    setVenueId(null)
    setVenueLabel('')
    if (q.length < 2) { setVenueResults([]); return }
    setVenueResults(await searchVenues(q))
  }

  function addDate() {
    setDates(prev => [...prev, { data: '', artistas: [] }])
  }

  function removeDate(i: number) {
    setDates(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateDateData(i: number, data: string) {
    setDates(prev => prev.map((d, idx) => idx === i ? { ...d, data } : d))
  }

  function updateDateArtistas(i: number, artistas: PickedArtist[]) {
    setDates(prev => prev.map((d, idx) => idx === i ? { ...d, artistas } : d))
  }

  function submit() {
    if (dates.some(d => !d.data)) { setError('Todas as datas são obrigatórias'); return }
    if (!venueId && !venueNome)   { setError('Venue obrigatório'); return }
    if (dates.some(d => d.artistas.length === 0)) { setError('Cada data precisa de pelo menos um artista'); return }
    setError(null)

    const input: CreateShowInput = {
      nome_evento:       nome_evento || null,
      venue_id:          venueId,
      venue_nome_novo:   venueNovo ? venueNome : null,
      venue_cidade_novo: venueNovo ? venueCidade : null,
      status_ingresso:   status || null,
      concorrencia:      concorrencia || null,
      source_url:        sourceUrl || null,
      observacoes:       observacoes || null,
      dates: dates.map(d => ({
        data:     d.data,
        artistas: d.artistas.map(a => ({ artist_id: a.id, ordem: a.ordem, faz_estampa: a.faz_estampa })),
      })),
    }
    startSave(async () => { await createShow(input) })
  }

  const multData = dates.length > 1

  return (
    <div style={{ padding: '1.5rem', maxWidth: 560 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <a href="/shows" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textDecoration: 'none' }}>← Shows</a>
      </div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1.5rem' }}>Novo show</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        <Field label="Nome do evento">
          <input value={nome_evento} onChange={e => setNomeEvento(e.target.value)}
            placeholder="opcional — se vazio, usa nomes dos artistas"
            style={{ ...inputStyle, fontSize: '0.8rem', color: nome_evento ? 'var(--text)' : 'var(--text-dim)' }} />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Status ingresso">
            <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
              <option value="">sem informação</option>
              <option value="sold out">Sold Out</option>
              <option value="bem vendido">Bem Vendido</option>
              <option value="mal vendido">Mal Vendido</option>
            </select>
          </Field>
          <Field label="Concorrência">
            <select value={concorrencia} onChange={e => setConcorrencia(e.target.value)} style={inputStyle}>
              <option value="">—</option>
              <option value="nenhuma">Nenhuma</option>
              <option value="baixa">Baixa</option>
              <option value="média">Média</option>
              <option value="alta">Alta</option>
            </select>
          </Field>
        </div>

        <Field label="local *">
          {venueId ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ ...inputStyle, flex: 1, color: 'var(--text)' }}>{venueLabel}</span>
              <button onClick={() => { setVenueId(null); setVenueLabel(''); setVenueQuery(''); setVenueNovo(false) }}
                style={clearBtnStyle}>✕</button>
            </div>
          ) : (
            <div>
              <input value={venueQuery} onChange={e => onVenueSearch(e.target.value)}
                placeholder="buscar local..." style={inputStyle} />
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
                  + criar &quot;{venueQuery}&quot; como novo local
                </button>
              )}
              {venueNovo && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, border: '1px dashed var(--border)', borderRadius: 4, padding: '0.75rem' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>novo local</p>
                  <input value={venueNome} onChange={e => setVenueNome(e.target.value)} placeholder="nome" style={inputStyle} />
                  <input value={venueCidade} onChange={e => setVenueCidade(e.target.value)} placeholder="cidade" style={inputStyle} />
                </div>
              )}
            </div>
          )}
        </Field>

        {/* ── DATAS ─────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Datas e lineup *
            </label>
            {multData && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                cada data cria um show separado
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {dates.map((entry, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '0.875rem', background: 'var(--surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {multData ? `dia ${i + 1}` : 'data'}
                  </span>
                  {dates.length > 1 && (
                    <button onClick={() => removeDate(i)}
                      style={{ fontSize: '0.75rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      ✕ remover
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input type="date" value={entry.data} onChange={e => updateDateData(i, e.target.value)} style={inputStyle} />
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                      Artistas (ordem = tamanho de público)
                    </p>
                    <ArtistPicker
                      selectedArtists={entry.artistas}
                      onArtistsChange={artistas => updateDateArtistas(i, artistas)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addDate}
            style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--cyan)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            + adicionar data
          </button>
        </div>

        <Field label="Source URL">
          <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}
            placeholder="https://..." style={inputStyle} />
        </Field>

        <Field label="Observações">
          <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)}
            rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>

      </div>

      {error && <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--red)' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', alignItems: 'center' }}>
        <button onClick={submit} disabled={saving}
          style={{
            padding: '0.5rem 1.5rem', fontSize: '0.875rem',
            background: 'var(--surface-raised)', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: 4,
            cursor: 'pointer', opacity: saving ? 0.5 : 1,
          }}>
          {saving ? 'Salvando...' : dates.length > 1 ? `Criar ${dates.length} shows` : 'Criar show'}
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
  width: '100%', fontSize: '0.875rem', background: 'var(--surface)', color: 'var(--text)',
  border: '1px solid var(--border)', borderRadius: 4, padding: '0.45rem 0.75rem',
  outline: 'none', boxSizing: 'border-box',
}

const dropdownStyle: React.CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 4, marginTop: 4,
  overflow: 'hidden', background: 'var(--surface)',
}

const dropdownItemStyle: React.CSSProperties = {
  width: '100%', textAlign: 'left', fontSize: '0.875rem', padding: '0.45rem 0.75rem',
  background: 'none', border: 'none', borderBottom: '1px solid var(--border)',
  cursor: 'pointer', color: 'var(--text)',
}

const clearBtnStyle: React.CSSProperties = {
  fontSize: '0.75rem', color: 'var(--text-dim)', background: 'none',
  border: 'none', cursor: 'pointer', padding: '0 4px',
}
