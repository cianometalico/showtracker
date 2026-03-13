// app/database/artistas/[id]/artist-client.tsx
'use client'

import { useState, useTransition, useEffect, } from 'react'
import Link from 'next/link'
import { updateArtist } from './actions'

type Show = {
  id: string; data: string; nome_evento: string | null
  status_ingresso: string; participou: boolean
  resultado_geral: string | null
  venue: { id: string; nome: string } | null
  billing_order: number; fez_estampa: boolean
}

type Artist = {
  id: string; nome: string; genero_canonico: string | null; generos?: string[] | null; musicbrainz_id?: string | null
  porte_fisico: string | null; energia: string | null
  perfil_estetico: string | null; historico: string | null
  propensao_compra: number | null; pais: string | null
  geracao_predominante: string | null
}

const LABEL_RESULTADO: Record<string, string> = {
  sucesso_total: 'Sucesso Total',
  sucesso:       'Sucesso',
  medio:         'Médio',
  fracasso:      'Fracasso',
}

const LABEL_STATUS: Record<string, string> = {
  sold_out:      'Sold Out',
  ultimo_lote:   'Último Lote',
  intermediario: 'Intermediário',
  mal_vendido:   'Mal Vendido',
}

function corResultado(r: string) {
  switch (r) {
    case 'sucesso_total': return 'text-emerald-600'
    case 'sucesso':       return 'text-green-600'
    case 'medio':         return 'text-yellow-600'
    case 'fracasso':      return 'text-red-500'
    default:              return 'text-gray-400'
  }
}

function formatData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export function ArtistClient({ artist, shows }: { artist: Artist; shows: Show[] }) {
  return (
    <div className="space-y-8">
      <PropensaoBlock artist={artist} />
      <InfoBlock artist={artist} />
      <ShowsBlock shows={shows} artistId={artist.id} mbid={(artist as any).musicbrainz_id ?? null} />
    </div>
  )
}

// ── PROPENSÃO ─────────────────────────────────────────────────

function PropensaoBlock({ artist }: { artist: Artist }) {
  const [valor,   setValor]   = useState(artist.propensao_compra ?? 1.0)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [, startT] = useTransition()

  async function salvar() {
    setSaving(true)
    await updateArtist(artist.id, { propensao_compra: valor })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const label = valor >= 1.2 ? 'Alta' : valor >= 0.9 ? 'Normal' : valor >= 0.6 ? 'Baixa' : 'Muito Baixa'
  const cor   = valor >= 1.2 ? 'text-emerald-600' : valor >= 0.9 ? 'text-gray-700' : valor >= 0.6 ? 'text-yellow-600' : 'text-red-500'

  return (
    <Section titulo="Propensão de compra">
      <div className="flex items-center gap-4">
        <input
          type="range" min={0.2} max={1.5} step={0.05}
          value={valor}
          onChange={e => setValor(parseFloat(e.target.value))}
          className="flex-1 cursor-pointer"
        />
        <span className={`text-sm font-semibold w-8 tabular-nums ${cor}`}>
          {valor.toFixed(2)}
        </span>
        <span className={`text-xs w-20 ${cor}`}>{label}</span>
        <button onClick={salvar} disabled={saving}
          className="px-3 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50 cursor-pointer">
          {saving ? '...' : 'Salvar'}
        </button>
        {saved && <span className="text-xs text-green-600">✓</span>}
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Multiplicador aplicado na inferência de vendas. 1.0 = neutro, &gt;1.0 = público compra mais, &lt;1.0 = compra menos.
      </p>
    </Section>
  )
}

// ── INFO ──────────────────────────────────────────────────────

const PORTE_OPTIONS = [
  { value: '',           label: '—' },
  { value: 'local',      label: 'Local' },
  { value: 'regional',   label: 'Regional' },
  { value: 'nacional',   label: 'Nacional' },
  { value: 'internacional', label: 'Internacional' },
]

const GERACAO_OPTIONS = [
  { value: '',       label: '—' },
  { value: 'z',      label: 'Z (2000s+)' },
  { value: 'millennial', label: 'Millennial (80s-90s)' },
  { value: 'x',      label: 'X (70s)' },
  { value: 'boomers', label: 'Boomers (50s-60s)' },
  { value: 'misto',  label: 'Misto' },
]

function InfoBlock({ artist }: { artist: Artist }) {
  const [nome,     setNome]     = useState(artist.nome)
  const [genero,   setGenero]   = useState(artist.genero_canonico ?? '')
  const [porte,    setPorte]    = useState(artist.porte_fisico ?? '')
  const [geracao,  setGeracao]  = useState(artist.geracao_predominante ?? '')
  const [historico, setHistorico] = useState(artist.historico ?? '')
  const [perfil,   setPerfil]   = useState(artist.perfil_estetico ?? '')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  async function salvar() {
    setSaving(true)
    await updateArtist(artist.id, {
      nome:                  nome.trim() || artist.nome,
      genero_canonico:       genero || null,
      porte_fisico:          porte || null,
      geracao_predominante:  geracao || null,
      historico:             historico || null,
      perfil_estetico:       perfil || null,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Section titulo="Perfil">
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Nome</label>
        <input value={nome} onChange={e => setNome(e.target.value)}
          placeholder="Nome do artista"
          className="w-full text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-gray-400" />
      </div>
      {Array.isArray((artist as any).generos) && (artist as any).generos.length > 1 && (
        <div className="mb-1">
          <span className="text-xs text-gray-300">
            Gêneros detectados: {((artist as any).generos as string[]).join(', ')}
          </span>
        </div>
      )}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Gênero principal</label>
        <input value={genero} onChange={e => setGenero(e.target.value)}
          placeholder="ex: metal, rock, hardcore, pop..."
          className="w-full text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-gray-400" />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Porte</label>
          <select value={porte} onChange={e => setPorte(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded px-3 py-2 bg-white focus:outline-none focus:border-gray-400">
            {PORTE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Geração predominante</label>
          <select value={geracao} onChange={e => setGeracao(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded px-3 py-2 bg-white focus:outline-none focus:border-gray-400">
            {GERACAO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Perfil estético do público</label>
        <input value={perfil} onChange={e => setPerfil(e.target.value)}
          placeholder="ex: metaleiros clássicos, indie hipsters, público familiar..."
          className="w-full text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-gray-400" />
      </div>
      <div className="mb-4">
        <label className="block text-xs text-gray-400 mb-1">Histórico / notas</label>
        <textarea value={historico} onChange={e => setHistorico(e.target.value)}
          rows={3} placeholder="Observações sobre o artista, comportamento do público..."
          className="w-full text-sm border border-gray-200 rounded px-3 py-2 resize-none focus:outline-none focus:border-gray-400" />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={salvar} disabled={saving}
          className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50 cursor-pointer">
          {saving ? 'Salvando...' : 'Salvar perfil'}
        </button>
        {saved && <span className="text-xs text-green-600">✓ Salvo</span>}
      </div>
    </Section>
  )
}

// ── SHOWS ─────────────────────────────────────────────────────

type SFShowHistorico = {
  data: string; venue_nome: string | null; cidade: string | null
  tour: string | null; setlist_url: string | null
}

function ShowsBlock({ shows, artistId, mbid }: {
  shows:    Show[]
  artistId: string
  mbid:     string | null
}) {
  const [aba,     setAba]     = useState<'cadastrados' | 'brasil'>('cadastrados')
  const [sfShows, setSfShows] = useState<SFShowHistorico[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (aba !== 'brasil' || sfShows !== null) return
    if (!mbid) { setSfShows([]); setError('Artista sem MBID — faça o enriquecimento primeiro'); return }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/setlistfm?action=shows_brasil&mbid=${mbid}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.error) throw new Error(data.error)
        setSfShows(data.shows ?? [])
      })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [aba, mbid])

  const realizados = shows.filter(s => s.participou)
  const outros     = shows.filter(s => !s.participou)

  return (
    <Section titulo="Histórico de shows">
      <div className="flex gap-1 mb-4">
        {([
          ['cadastrados', `Shows cadastrados (${shows.length})`],
          ['brasil',      'Brasil (Setlist.fm)'],
        ] as const).map(([k, label]) => (
          <button key={k} onClick={() => setAba(k)}
            className={`px-3 py-1 text-xs rounded cursor-pointer transition-colors ${
              aba === k ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {aba === 'cadastrados' && (
        <>
          {shows.length === 0 && <p className="text-sm text-gray-400">Nenhum show cadastrado.</p>}
          {realizados.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">Realizados ({realizados.length})</p>
              <div className="divide-y divide-gray-100">
                {realizados.map(s => <ShowRow key={s.id} show={s} />)}
              </div>
            </div>
          )}
          {outros.length > 0 && (
            <div className="opacity-40">
              <p className="text-xs text-gray-400 mb-2">Não realizados ({outros.length})</p>
              <div className="divide-y divide-gray-100">
                {outros.map(s => <ShowRow key={s.id} show={s} />)}
              </div>
            </div>
          )}
        </>
      )}

      {aba === 'brasil' && (
        <>
          {loading && <p className="text-sm text-gray-400 animate-pulse">Carregando Setlist.fm…</p>}
          {error    && <p className="text-sm text-red-400">{error}</p>}
          {!loading && sfShows !== null && sfShows.length === 0 && !error && (
            <p className="text-sm text-gray-400">Nenhuma passagem pelo Brasil encontrada.</p>
          )}
          {!loading && sfShows && sfShows.length > 0 && (
            <>
              <p className="text-xs text-gray-400 mb-3">
                {sfShows.length} passagem{sfShows.length !== 1 ? 's' : ''} pelo Brasil
              </p>
              <div>
                {sfShows.map((s, i) => {
                  const ts = sfTs(s.data)
                  const now = Date.now()
                  const maxD = Math.max(...sfShows.map(x => Math.abs(sfTs(x.data) - now)), 1)
                  const op = 1.0 - (Math.abs(ts - now) / maxD) * 0.55
                  return (
                    <div key={i} className="flex items-center gap-3 py-1.5" style={{ opacity: op }}>
                      <span className="text-xs text-gray-400 w-28 shrink-0 tabular-nums">{sfFmt(s.data)}</span>
                      <span className="flex-1 text-sm text-gray-700 truncate">{s.venue_nome ?? '—'}</span>
                      <span className="text-xs text-gray-400 shrink-0 w-20 text-right truncate">{s.cidade ?? '—'}</span>
                      {s.tour && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0 max-w-[120px] truncate">
                          {s.tour}
                        </span>
                      )}
                      {s.setlist_url && (
                        <a href={s.setlist_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-600 shrink-0">↗</a>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </Section>
  )
}


function sfTs(ddmmyyyy: string): number {
  const p = ddmmyyyy.split('-')
  if (p.length !== 3) return 0
  return new Date(`${p[2]}-${p[1]}-${p[0]}T12:00:00Z`).getTime()
}
function sfFmt(ddMMyyyy: string): string {
  const p = ddMMyyyy.split('-')
  if (p.length !== 3) return ddMMyyyy
  return new Date(`${p[2]}-${p[1]}-${p[0]}T12:00:00Z`).toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

function ShowRow({ show }: { show: Show }) {
  return (
    <Link href={`/shows/${show.id}`}
      className="flex items-center gap-3 py-2 hover:bg-gray-50 px-2 -mx-2 rounded transition-colors">
      <span className="text-xs text-gray-400 w-28 shrink-0 tabular-nums">{formatData(show.data)}</span>
      <span className="flex-1 text-sm text-gray-700 truncate">
        {show.nome_evento ?? show.venue?.nome ?? '—'}
      </span>
      {show.fez_estampa && (
        <span className="text-xs text-blue-500 shrink-0">estampa</span>
      )}
      <span className={`text-xs shrink-0 ${show.resultado_geral ? corResultado(show.resultado_geral) : 'text-gray-400'}`}>
        {show.resultado_geral
          ? LABEL_RESULTADO[show.resultado_geral]
          : LABEL_STATUS[show.status_ingresso] ?? '—'}
      </span>
    </Link>
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