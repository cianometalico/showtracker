'use client'

import { useState } from 'react'
import Link from 'next/link'
// addArtistToShow migrado para ArtistPicker (show-detail-client)

type Artist = { id: string; nome: string; genero?: string | null }
type ShowArtist = { artist_id: string; ordem: number; faz_estampa: boolean; artists: Artist }
type Venue = { id: string; nome: string; cidade: string } | null

interface ShowData {
  id: string
  status_ingresso: string
  concorrencia?: string | null
  clima_estimado?: string | null
  observacoes?: string | null
  resultado_geral?: string | null
}

interface Props {
  show:       ShowData
  lineup:     ShowArtist[]
  venue:      Venue
  allArtists: { id: string; nome: string }[]
}

export function ShowClient({ show, lineup: initialLineup, venue, allArtists }: Props) {
  const [lineup, setLineup] = useState(initialLineup)

  return (
    <div className="space-y-8">
      <LineupBlock showId={show.id} lineup={lineup} setLineup={setLineup} allArtists={allArtists} />
      {/* TODO: campo removido na auditoria — ContextoBlock depende de qualidade_concorrencia, fiscalizacao, risco_cancelamento, motivo_urgencia */}
      {/* TODO: campo removido na auditoria — DesignsBlock depende de designs */}
      <ResultadoBlock show={show} />
    </div>
  )
}

// ── LINEUP ───────────────────────────────────────────────────

function LineupBlock({
  showId, lineup, setLineup, allArtists
}: {
  showId: string
  lineup: ShowArtist[]
  setLineup: (l: ShowArtist[]) => void
  allArtists: { id: string; nome: string }[]
}) {
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const existingIds = new Set(lineup.map(sa => sa.artist_id))
  const filtered = allArtists
    .filter(a => !existingIds.has(a.id))
    .filter(a => a.nome.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 8)

  async function addArtist(artist: { id: string; nome: string }) {
    setSaving(true)
    const nextOrder = Math.max(0, ...lineup.map(sa => sa.ordem)) + 1
    // TODO: addArtistToShow migrado — usar updateShowInline com artistas[]
    setLineup([...lineup, {
      artist_id:   artist.id,
      ordem:       nextOrder,
      faz_estampa: false,
      artists:     { id: artist.id, nome: artist.nome },
    }])
    setSearch('')
    setAdding(false)
    setSaving(false)
  }

  return (
    <Section titulo="Lineup">
      {lineup.length === 0 && !adding && (
        <p className="text-sm text-gray-400 mb-3">Nenhum artista cadastrado.</p>
      )}
      {lineup.length > 0 && (
        <div className="mb-2">
          {lineup.map(sa => <LineupRow key={sa.artist_id} sa={sa} />)}
        </div>
      )}
      {adding ? (
        <div className="mt-2">
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar artista..."
            className="w-full text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-gray-400 mb-1"
          />
          {search.length > 0 && (
            <div className="border border-gray-200 rounded overflow-hidden">
              {filtered.length === 0
                ? <p className="text-xs text-gray-400 px-3 py-2">Nenhum artista encontrado.</p>
                : filtered.map(a => (
                    <button key={a.id} onClick={() => addArtist(a)} disabled={saving}
                      className="w-full text-left text-sm px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0 cursor-pointer disabled:opacity-50">
                      {a.nome}
                    </button>
                  ))
              }
            </div>
          )}
          <button onClick={() => { setAdding(false); setSearch('') }}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600 cursor-pointer">
            Cancelar
          </button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="text-sm text-gray-400 hover:text-gray-700 border border-dashed border-gray-300 rounded px-3 py-1.5 hover:border-gray-500 transition-colors cursor-pointer">
          + Adicionar artista
        </button>
      )}
    </Section>
  )
}

function LineupRow({ sa }: { sa: ShowArtist }) {
  const [fez, setFez] = useState(sa.faz_estampa)

  function toggle() {
    setFez(v => !v)
    // TODO: persistir faz_estampa — toggleFezEstampa removido na auditoria
  }

  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-300 w-4 text-right font-mono">{sa.ordem}</span>
      <Link href={`/artistas/${sa.artist_id}`}
        className="flex-1 text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors">
        {sa.artists.nome}
      </Link>
      <button onClick={toggle}
        className={`text-xs px-2 py-0.5 rounded border transition-colors cursor-pointer ${
          fez
            ? 'bg-blue-50 border-blue-200 text-blue-600'
            : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-400'
        }`}>
        {fez ? 'estampa ✓' : 'estampa'}
      </button>
    </div>
  )
}

// TODO: campo removido na auditoria — ContextoBlock removido (dependia de qualidade_concorrencia, fiscalizacao, risco_cancelamento, motivo_urgencia, updateContexto)

// TODO: campo removido na auditoria — DesignsBlock removido (dependia de designs)

// ── RESULTADO ────────────────────────────────────────────────

const RESULTADO_OPTIONS = [
  { value: '',              label: '— sem resultado' },
  { value: 'sucesso_total', label: 'Sucesso Total' },
  { value: 'sucesso',       label: 'Sucesso' },
  { value: 'medio',         label: 'Médio' },
  { value: 'fracasso',      label: 'Fracasso' },
]

function corResultado(r: string) {
  switch (r) {
    case 'sucesso_total': return 'text-emerald-600'
    case 'sucesso':       return 'text-green-600'
    case 'medio':         return 'text-yellow-600'
    case 'fracasso':      return 'text-red-500'
    default:              return ''
  }
}

function ResultadoBlock({ show }: { show: ShowData }) {
  const [resultado, setResultado] = useState(show.resultado_geral ?? '')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)

  async function salvar() {
    // TODO: updateResultado / updateShowField removidos na auditoria — reimplementar com action real
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Section titulo="Resultado">
      <div className="space-y-3">
        <FieldSelect label="Resultado" value={resultado} options={RESULTADO_OPTIONS}
          onChange={setResultado} colorClass={resultado ? corResultado(resultado) : ''} />
        {/* TODO: campo removido na auditoria — resultado_notas */}
        <div className="flex items-center gap-3">
          <button onClick={salvar} disabled={saving}
            className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50 cursor-pointer">
            {saving ? 'Salvando...' : 'Salvar resultado'}
          </button>
          {saved && <span className="text-xs text-green-600">✓ Salvo</span>}
        </div>
      </div>
    </Section>
  )
}

// ── SHARED ────────────────────────────────────────────────────

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{titulo}</h2>
      {children}
    </div>
  )
}

function FieldSelect({
  label, value, options, onChange, colorClass = ''
}: {
  label: string; value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  colorClass?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-400 w-28 shrink-0 text-sm">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className={`text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-gray-400 focus:outline-none cursor-pointer ${colorClass}`}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}