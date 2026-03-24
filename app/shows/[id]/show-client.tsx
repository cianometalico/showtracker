'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { updateContexto, updateResultado, toggleFezEstampa, addArtistToShow } from './actions'
import { InferenceBlock } from './inference-block'

type Artist = { id: string; nome: string; genero?: string | null; porte_fisico?: string | null }
type ShowArtist = { artist_id: string; billing_order: number; fez_estampa: boolean; artists: Artist }
type Venue = { id: string; nome: string; cidade: string } | null

interface ShowData {
  id: string
  status_ingresso: string
  concorrentes: string
  qualidade_concorrencia: number | null
  clima_estimado: string
  fiscalizacao: boolean
  risco_cancelamento: boolean
  motivo_urgencia: string
  observacoes?: string | null
  resultado_geral?: string | null
  resultado_notas?: string | null
  designs: { id: string; nome: string; status: string }[]
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
      <ContextoBlock show={show} />
      <InferenceBlock showId={show.id} />
      <DesignsBlock show={show} />
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
  const [, startT] = useTransition()

  const existingIds = new Set(lineup.map(sa => sa.artist_id))
  const filtered = allArtists
    .filter(a => !existingIds.has(a.id))
    .filter(a => a.nome.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 8)

  async function addArtist(artist: { id: string; nome: string }) {
    setSaving(true)
    const nextOrder = Math.max(0, ...lineup.map(sa => sa.billing_order)) + 1
    const res = await addArtistToShow(showId, artist.id, nextOrder)
    if (res.ok) {
      setLineup([...lineup, {
        artist_id:     artist.id,
        billing_order: nextOrder,
        fez_estampa:   false,
        artists:       { id: artist.id, nome: artist.nome },
      }])
      setSearch('')
      setAdding(false)
    }
    setSaving(false)
  }

  return (
    <Section titulo="Lineup">
      {lineup.length === 0 && !adding && (
        <p className="text-sm text-gray-400 mb-3">Nenhum artista cadastrado.</p>
      )}
      {lineup.length > 0 && (
        <div className="mb-2">
          {lineup.map(sa => <LineupRow key={sa.artist_id} showId={showId} sa={sa} />)}
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

function LineupRow({ showId, sa }: { showId: string; sa: ShowArtist }) {
  const [fez, setFez] = useState(sa.fez_estampa)
  const [, startT]    = useTransition()

  function toggle() {
    const next = !fez
    setFez(next)
    startT(async () => {
      const res = await toggleFezEstampa(showId, sa.artist_id, next)
      if (!res.ok) setFez(fez)
    })
  }

  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-300 w-4 text-right font-mono">{sa.billing_order}</span>
      <Link href={`/database/artistas/${sa.artist_id}`}
        className="flex-1 text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors">
        {sa.artists.nome}
      </Link>
      {sa.artists.porte_fisico && (
        <span className="text-xs text-gray-400">{sa.artists.porte_fisico}</span>
      )}
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

// ── CONTEXTO ─────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'sold_out',       label: 'Sold Out' },
  { value: 'ultimo_lote',    label: 'Último Lote' },
  { value: 'intermediario',  label: 'Intermediário' },
  { value: 'mal_vendido',    label: 'Mal Vendido' },
  { value: 'nao_participei', label: 'Não Participei' },
]

// Normaliza valores legados (com espaço/acento) para o formato do enum atual
function normalizeStatus(v: string): string {
  const map: Record<string, string> = {
    'sold out':             'sold_out',
    'último lote':          'ultimo_lote',
    'lotes intermediários': 'intermediario',
    'mal vendido':          'mal_vendido',
    'não participei':       'nao_participei',
  }
  return map[v] ?? v
}
const URGENCIA_OPTIONS = [
  { value: 'nenhum',            label: '—' },
  { value: 'primeira_vez_brasil', label: '🇧🇷 Primeira vez no Brasil' },
  { value: 'despedida',         label: '🎤 Tour de despedida' },
  { value: 'reuniao',           label: '🔥 Reunião (banda voltou)' },
  { value: 'lancamento_album',  label: '💿 Lançamento de álbum' },
]

// concorrência agora é slider 0–10 (qualidade_concorrencia no banco)
function labelConcorrencia(v: number) {
  if (v <= 1) return 'Nenhuma'
  if (v <= 3) return 'Pouca'
  if (v <= 6) return 'Moderada'
  if (v <= 8) return 'Forte'
  return 'Saturado'
}
function multConcorrenciaLabel(v: number) {
  const m = 1.30 - (v / 10) * 0.80
  return `×${m.toFixed(2)}`
}

function ContextoBlock({ show }: { show: ShowData }) {
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [status,       setStatus]       = useState(normalizeStatus(show.status_ingresso))
  const [concorrencia, setConcorrencia] = useState<number>(show.qualidade_concorrencia ?? 0)
  const [fiscalizacao, setFiscalizacao] = useState(show.fiscalizacao)
  const [risco,        setRisco]        = useState(show.risco_cancelamento)
  const [urgencia,     setUrgencia]     = useState(show.motivo_urgencia ?? 'nenhum')
  const [observacoes,  setObservacoes]  = useState(show.observacoes ?? '')

  async function salvar() {
    setSaving(true)
    await (updateContexto as any)(show.id, {
      status_ingresso:    status,
      qualidade_concorrencia: concorrencia,
      fiscalizacao,
      risco_cancelamento: risco,
      motivo_urgencia:    urgencia as any,
      observacoes:        observacoes || null,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Section titulo="Contexto">
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-4">
        <FieldSelect label="Ingresso"     value={status}       options={STATUS_OPTIONS}       onChange={setStatus} />
        <div className="flex items-center gap-3">
          <span className="text-gray-400 w-28 shrink-0 text-sm">Concorrência</span>
          <input type="range" min={0} max={10} step={1}
            value={concorrencia} onChange={e => setConcorrencia(Number(e.target.value))}
            className="flex-1 cursor-pointer" />
          <span className="text-xs tabular-nums text-gray-500 w-16 text-right">
            {labelConcorrencia(concorrencia)} {multConcorrenciaLabel(concorrencia)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 w-28 shrink-0 text-sm">Fiscalização</span>
          <input type="checkbox" checked={fiscalizacao}
            onChange={e => setFiscalizacao(e.target.checked)} className="cursor-pointer" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 w-28 shrink-0 text-sm">Risco cancel.</span>
          <input type="checkbox" checked={risco}
            onChange={e => setRisco(e.target.checked)} className="cursor-pointer" />
        </div>
        <div className="col-span-2">
          <FieldSelect label="Urgência" value={urgencia} options={URGENCIA_OPTIONS} onChange={setUrgencia} />
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-xs text-gray-400 mb-1">Observações</label>
        <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)}
          rows={3} placeholder="Notas livres sobre o show..."
          className="w-full text-sm text-gray-700 border border-gray-200 rounded px-3 py-2 resize-none focus:outline-none focus:border-gray-400"
        />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={salvar} disabled={saving}
          className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50 cursor-pointer">
          {saving ? 'Salvando...' : 'Salvar contexto'}
        </button>
        {saved && <span className="text-xs text-green-600">✓ Salvo</span>}
      </div>
    </Section>
  )
}

// ── DESIGNS ──────────────────────────────────────────────────

function DesignsBlock({ show }: { show: ShowData }) {
  return (
    <Section titulo="Designs">
      {show.designs.length > 0 && (
        <div className="mb-3">
          {show.designs.map(d => (
            <div key={d.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
              <span className="flex-1 text-sm text-gray-800 font-medium">{d.nome}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${statusDesignColor(d.status)}`}>{d.status}</span>
            </div>
          ))}
        </div>
      )}
      {show.designs.length === 0 && (
        <p className="text-sm text-gray-400 mb-3">Nenhum design cadastrado.</p>
      )}
      <button
        className="text-sm text-gray-400 hover:text-gray-700 border border-dashed border-gray-300 rounded px-3 py-1.5 hover:border-gray-500 transition-colors cursor-pointer"
        onClick={() => alert('Em breve: formulário de design')}>
        + Adicionar design
      </button>
    </Section>
  )
}

function statusDesignColor(status: string) {
  switch (status) {
    case 'pronto':     return 'bg-green-50 text-green-600'
    case 'produzindo': return 'bg-blue-50 text-blue-600'
    case 'aprovado':   return 'bg-yellow-50 text-yellow-600'
    default:           return 'bg-gray-50 text-gray-400'
  }
}

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
  const [notas,     setNotas]     = useState(show.resultado_notas ?? '')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)

  async function salvar() {
    setSaving(true)
    await updateResultado(show.id, (resultado || null) as any)
    const { updateShowField } = await import('./actions')
    await updateShowField(show.id, 'resultado_notas', notas || null)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Section titulo="Resultado">
      <div className="space-y-3">
        <FieldSelect label="Resultado" value={resultado} options={RESULTADO_OPTIONS}
          onChange={setResultado} colorClass={resultado ? corResultado(resultado) : ''} />
        <div>
          <label className="block text-xs text-gray-400 mb-1">Notas pós-show</label>
          <textarea value={notas} onChange={e => setNotas(e.target.value)}
            rows={3} placeholder="O que aconteceu? Observações para o futuro..."
            className="w-full text-sm text-gray-700 border border-gray-200 rounded px-3 py-2 resize-none focus:outline-none focus:border-gray-400"
          />
        </div>
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