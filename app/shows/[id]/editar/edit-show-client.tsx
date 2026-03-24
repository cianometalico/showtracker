'use client'

import { useState, useTransition } from 'react'
import {
  updateShow, deleteShow, searchVenues, searchArtists,
  addArtistToShow, removeArtistFromShow, reorderArtist,
} from '../actions'
import type { UpdateShowInput } from '../actions'

type Venue    = { id: string; nome: string; cidade: string }
type Artist   = { id: string; nome: string }
type LineupItem = { artist_id: string; nome: string; ordem: number }

type Props = {
  show: {
    id: string
    data: string
    nome_evento: string | null
    status_ingresso: string | null
    concorrencia: string | null
    clima_estimado: string | null
    resultado_geral: string | null
    participou: boolean
    observacoes: string | null
    venue_id: string | null
  }
  venue:   { id: string; nome: string; cidade: string } | null
  lineup:  LineupItem[]
}

export function EditShowClient({ show, venue: initialVenue, lineup: initialLineup }: Props) {
  const [nome_evento,  setNomeEvento]  = useState(show.nome_evento ?? '')
  const [data,         setData]        = useState(show.data)
  const [status,       setStatus]      = useState(show.status_ingresso ?? '')
  const [concorrencia, setConcorrencia]= useState(show.concorrencia ?? '')
  const [clima,        setClima]       = useState(show.clima_estimado ?? '')
  const [resultado,    setResultado]   = useState(show.resultado_geral ?? '')
  const [participou,   setParticipou]  = useState(show.participou)
  const [observacoes,  setObservacoes] = useState(show.observacoes ?? '')

  const [venueId,      setVenueId]     = useState<string | null>(show.venue_id)
  const [venueLabel,   setVenueLabel]  = useState(initialVenue?.nome ?? '')
  const [venueQuery,   setVenueQuery]  = useState('')
  const [venueResults, setVenueResults]= useState<Venue[]>([])

  const [lineup,       setLineup]      = useState<LineupItem[]>(
    [...initialLineup].sort((a, b) => a.ordem - b.ordem)
  )
  const [artistQuery,  setArtistQuery] = useState('')
  const [artistRes,    setArtistRes]   = useState<Artist[]>([])

  const [saving,   startSave]   = useTransition()
  const [deleting, startDelete] = useTransition()
  const [lineupPending, startLineup] = useTransition()
  const [error,    setError]    = useState<string | null>(null)

  // venue search
  async function onVenueSearch(q: string) {
    setVenueQuery(q)
    setVenueId(null)
    setVenueLabel('')
    if (q.length < 2) { setVenueResults([]); return }
    setVenueResults(await searchVenues(q))
  }

  // artist search
  async function onArtistSearch(q: string) {
    setArtistQuery(q)
    if (q.length < 2) { setArtistRes([]); return }
    const res = await searchArtists(q)
    setArtistRes(res.filter(a => !lineup.find(l => l.artist_id === a.id)))
  }

  function addArtist(a: Artist) {
    const novaOrdem = lineup.length + 1
    setLineup(prev => [...prev, { artist_id: a.id, nome: a.nome, ordem: novaOrdem }])
    setArtistQuery('')
    setArtistRes([])
    startLineup(async () => { await addArtistToShow(show.id, a.id, novaOrdem) })
  }

  function removeArtist(artistId: string) {
    setLineup(prev => {
      const next = prev.filter(l => l.artist_id !== artistId)
        .map((l, i) => ({ ...l, ordem: i + 1 }))
      return next
    })
    startLineup(async () => { await removeArtistFromShow(show.id, artistId) })
  }

  function moveUp(i: number) {
  if (i === 0) return
  const next = [...lineup]
  ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
  const reordered = next.map((l, idx) => ({ ...l, ordem: idx + 1 }))
  setLineup(reordered)
  startLineup(async () => {
    await reorderArtist(show.id, reordered[i - 1].artist_id, reordered[i - 1].ordem)
    await reorderArtist(show.id, reordered[i].artist_id, reordered[i].ordem)
  })
}

  function submit() {
    if (!data) { setError('Data obrigatória'); return }
    setError(null)
    const input: UpdateShowInput = {
      nome_evento: nome_evento || null, data,
      venue_id: venueId, status_ingresso: status || null,
      concorrencia: concorrencia || null, clima_estimado: clima || null,
      resultado_geral: resultado || null, participou, observacoes: observacoes || null,
    }
    startSave(async () => { await updateShow(show.id, input) })
  }

  function handleDelete() {
    if (!confirm('Excluir este show? Não pode ser desfeito.')) return
    startDelete(async () => { await deleteShow(show.id) })
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 600 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <a href={`/shows/${show.id}`} style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textDecoration: 'none' }}>
          ← Show
        </a>
      </div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1.5rem' }}>Editar show</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        <Field label="Nome do evento (opcional)">
          <input value={nome_evento} onChange={e => setNomeEvento(e.target.value)} style={inputStyle} />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Data *">
            <input type="date" value={data} onChange={e => setData(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Status ingresso">
            <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
              <option value="">—</option>
              <option value="sold out">Sold Out</option>
              <option value="bem vendido">Bem Vendido</option>
              <option value="mal vendido">Mal Vendido</option>
            </select>
          </Field>
        </div>

        <Field label="Venue">
          {venueId ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ ...inputStyle, flex: 1 }}>{venueLabel}</span>
              <button onClick={() => { setVenueId(null); setVenueLabel(''); setVenueQuery('') }} style={clearBtnStyle}>✕</button>
            </div>
          ) : (
            <div>
              <input value={venueQuery} onChange={e => onVenueSearch(e.target.value)} placeholder="Buscar venue..." style={inputStyle} />
              {venueResults.length > 0 && (
                <div style={dropdownStyle}>
                  {venueResults.map(v => (
                    <button key={v.id} onClick={() => { setVenueId(v.id); setVenueLabel(v.nome); setVenueResults([]) }} style={dropdownItemStyle}>
                      {v.nome} <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>· {v.cidade}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Field>

        {/* Lineup */}
        <Field label="Lineup (ordem = headliner primeiro)">
          {lineup.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              {lineup.map((l, i) => (
                <div key={l.artist_id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.3rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)', width: 16 }}>{l.ordem}</span>
                  <a href={`/artistas/${l.artist_id}`} target="_blank" rel="noreferrer"
                    style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text)', textDecoration: 'none' }}>
                    {l.nome}
                  </a>
                  {i > 0 && (
                    <button onClick={() => moveUp(i)} disabled={lineupPending}
                      style={{ fontSize: '0.7rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>↑</button>
                  )}
                  <button onClick={() => removeArtist(l.artist_id)} disabled={lineupPending}
                    style={clearBtnStyle}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div>
            <input value={artistQuery} onChange={e => onArtistSearch(e.target.value)}
              placeholder="Adicionar artista..." style={inputStyle} />
            {artistRes.length > 0 && (
              <div style={dropdownStyle}>
                {artistRes.map(a => (
                  <button key={a.id} onClick={() => addArtist(a)} style={dropdownItemStyle}>
                    {a.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Concorrência">
            <select value={concorrencia} onChange={e => setConcorrencia(e.target.value)} style={inputStyle}>
              <option value="">—</option>
              <option value="nenhuma">Nenhuma</option>
              <option value="baixa">Baixa</option>
              <option value="média">Média</option>
              <option value="alta">Alta</option>
            </select>
          </Field>
          <Field label="Clima">
            <select value={clima} onChange={e => setClima(e.target.value)} style={inputStyle}>
              <option value="">—</option>
              <option value="sol">Sol</option>
              <option value="nublado">Nublado</option>
              <option value="chuva">Chuva</option>
              <option value="frio">Frio</option>
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Resultado">
            <select value={resultado} onChange={e => setResultado(e.target.value)} style={inputStyle}>
              <option value="">—</option>
              <option value="sucesso_total">Sucesso Total</option>
              <option value="sucesso">Sucesso</option>
              <option value="medio">Médio</option>
              <option value="fracasso">Fracasso</option>
            </select>
          </Field>
          <Field label="Participação">
            <select value={participou ? 'sim' : 'nao'} onChange={e => setParticipou(e.target.value === 'sim')} style={inputStyle}>
              <option value="sim">Participei</option>
              <option value="nao">Não participei</option>
            </select>
          </Field>
        </div>

        <Field label="Observações">
          <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)}
            rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>

      </div>

      {error && <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--red)' }}>{error}</p>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={submit} disabled={saving}
            style={{ padding: '0.5rem 1.5rem', fontSize: '0.875rem', background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <a href={`/shows/${show.id}`} style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textDecoration: 'none' }}>Cancelar</a>
        </div>
        <button onClick={handleDelete} disabled={deleting}
          style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: 'none', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 4, cursor: 'pointer', opacity: deleting ? 0.5 : 1 }}>
          {deleting ? 'Excluindo...' : 'Excluir show'}
        </button>
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
  border: '1px solid var(--border)', borderRadius: 4, marginTop: 4, overflow: 'hidden', background: 'var(--surface)',
}
const dropdownItemStyle: React.CSSProperties = {
  width: '100%', textAlign: 'left', fontSize: '0.875rem', padding: '0.45rem 0.75rem',
  background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text)',
}
const clearBtnStyle: React.CSSProperties = {
  fontSize: '0.75rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px',
}