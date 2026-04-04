'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { updateVenueInline, deleteVenue } from './actions'
import type { UpdateVenueInput } from './actions'
import { getShowDisplayName } from '@/lib/show-utils'

// ── Types ─────────────────────────────────────────────────────

type VenueData = {
  id: string
  nome: string
  cidade: string
  bairro: string | null
  lat: number | null
  lng: number | null
  capacidade_praticavel: number | null
  tipo_default: string | null
  zona_risco: boolean | null
  risco_fiscalizacao: string | null
}

type Subprefeitura = {
  id: string
  nome: string
  risco_base: string
  notas: string | null
  perfil: string
}

type SubprefeituraOption = {
  id: string
  nome: string
  zona: string
}

type ShowRow = {
  id: string
  data: string
  nome_evento: string | null
  status_ingresso: string | null
  participou: boolean | null
  resultado_geral: string | null
  artistas: string[]
}

type NichoByVenue = { id: string; nome: string; underground_score: number | null; ocorrencias: number }
type DistribuicaoResultado = { sucesso_total: number; sucesso: number; medio: number; fracasso: number }

type Props = {
  venue: VenueData
  subprefeitura: Subprefeitura | null
  subprefeituras: SubprefeituraOption[]
  shows: ShowRow[]
  nichosByVenue?: NichoByVenue[]
  venueResultado?: { total_shows: number; distribuicao: DistribuicaoResultado } | null
}

// ── Constants ─────────────────────────────────────────────────

const LABEL_RESULTADO: Record<string, string> = {
  sucesso_total: 'Sucesso Total',
  sucesso:       'Sucesso',
  medio:         'Médio',
  fracasso:      'Fracasso',
}

const COR_RESULTADO: Record<string, string> = {
  sucesso_total: 'var(--status-pos)',
  sucesso:       'var(--status-pos)',
  medio:         'var(--amber)',
  fracasso:      'var(--red)',
}

const LABEL_STATUS: Record<string, string> = {
  'sold out':    'Sold Out',
  'bem vendido': 'Bem Vendido',
  'mal vendido': 'Mal Vendido',
}

const RISCO_COR: Record<string, string> = {
  low:    'var(--status-pos)',
  medium: 'var(--amber)',
  high:   'var(--red)',
}

const RISCO_LABEL: Record<string, string> = {
  low:    'Baixo',
  medium: 'Médio',
  high:   'Alto',
}

// ── Main Component ────────────────────────────────────────────

export function VenueDetailClient({ venue, subprefeitura, subprefeituras, shows, nichosByVenue, venueResultado }: Props) {
  // ── Edit state ──
  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [saving,    startSave]    = useTransition()
  const [deleting,  startDelete]  = useTransition()

  // ── Form fields ──
  const [eNome,   setENome]   = useState(venue.nome)
  const [eCidade, setECidade] = useState(venue.cidade ?? '')
  const [eBairro, setEBairro] = useState(venue.bairro ?? '')
  const [eCap,    setECap]    = useState(String(venue.capacidade_praticavel ?? ''))
  const [eRisco,    setERisco]    = useState(venue.risco_fiscalizacao ?? '')
  const [eSubpref,  setESubpref]  = useState(subprefeitura?.id ?? '')
  const [eLat,      setELat]      = useState(String(venue.lat ?? ''))
  const [eLng,      setELng]      = useState(String(venue.lng ?? ''))

  // ── Stats ──
  const participados = shows.filter(s => s.participou)
  const sucessos     = participados.filter(s => ['sucesso', 'sucesso_total'].includes(s.resultado_geral ?? ''))
  const taxaSucesso  = participados.length > 0 ? Math.round((sucessos.length / participados.length) * 100) : null

  // ── Handlers ──

  function resetEditState() {
    setENome(venue.nome)
    setECidade(venue.cidade ?? '')
    setEBairro(venue.bairro ?? '')
    setECap(String(venue.capacidade_praticavel ?? ''))
    setERisco(venue.risco_fiscalizacao ?? '')
    setESubpref(subprefeitura?.id ?? '')
    setELat(String(venue.lat ?? ''))
    setELng(String(venue.lng ?? ''))
    setEditError(null)
  }

  function startEdit() {
    resetEditState()
    setIsEditing(true)
  }

  function cancelEdit() {
    resetEditState()
    setIsEditing(false)
  }

  function submit() {
    if (!eNome.trim()) { setEditError('Nome obrigatório'); return }
    setEditError(null)
    const input: UpdateVenueInput = {
      nome:                  eNome.trim(),
      cidade:                eCidade.trim(),
      bairro:                eBairro.trim() || null,
      capacidade_praticavel: eCap ? parseInt(eCap) : null,
      tipo_default:          null,
      risco_fiscalizacao:    eRisco || null,
      lat:                   eLat ? parseFloat(eLat) : null,
      lng:                   eLng ? parseFloat(eLng) : null,
      subprefeitura_id:      eSubpref || null,
    }
    startSave(async () => {
      const res = await updateVenueInline(venue.id, input)
      if (res.error) { setEditError(res.error) } else { setIsEditing(false) }
    })
  }

  function handleDelete() {
    if (!confirm('Excluir este local? Shows vinculados perderão o venue.')) return
    startDelete(async () => { await deleteVenue(venue.id) })
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div>
      {/* Breadcrumb */}
      <Link href="/locais" className="breadcrumb">← Locais</Link>

      {/* Header */}
      <div style={{ marginTop: '1rem', marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--text)', margin: 0 }}>
            {venue.nome}
          </h1>
          {!isEditing && (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 6 }}>
              <span>{venue.bairro ? `${venue.bairro} · ${venue.cidade ?? ''}` : (venue.cidade ?? '—')}</span>
              {venue.capacidade_praticavel && (
                <>
                  <span style={{ margin: '0 6px', opacity: 0.4 }}>|</span>
                  <span>cap. {venue.capacidade_praticavel.toLocaleString('pt-BR')}</span>
                </>
              )}
              {venue.risco_fiscalizacao && (
                <>
                  <span style={{ margin: '0 6px', opacity: 0.4 }}>|</span>
                  <span style={{ color: RISCO_COR[venue.risco_fiscalizacao] ?? 'var(--text-dim)' }}>
                    {venue.risco_fiscalizacao}
                  </span>
                </>
              )}
              <span style={{ margin: '0 6px', opacity: 0.4 }}>|</span>
              <span>{subprefeitura ? subprefeitura.nome : '—'}</span>
            </div>
          )}
        </div>
        {!isEditing && (
          <button onClick={startEdit} style={editBtnStyle}>editar</button>
        )}
      </div>

      {/* ── EDIT FORM ────────────────────────────────────── */}
      {isEditing && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            <EField label="Nome *">
              <input value={eNome} onChange={e => setENome(e.target.value)} style={inputStyle} />
            </EField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <EField label="Cidade">
                <input value={eCidade} onChange={e => setECidade(e.target.value)} style={inputStyle} />
              </EField>
              <EField label="Bairro">
                <input value={eBairro} onChange={e => setEBairro(e.target.value)}
                  placeholder="ex: Pinheiros, Vila Madalena" style={inputStyle} />
              </EField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <EField label="Capacidade praticável">
                <input type="number" value={eCap} onChange={e => setECap(e.target.value)}
                  placeholder="Ex: 3200" style={inputStyle} />
              </EField>
              <EField label="Risco de fiscalização">
                <select value={eRisco} onChange={e => setERisco(e.target.value)} style={inputStyle}>
                  <option value="">—</option>
                  <option value="low">Baixo</option>
                  <option value="medium">Médio</option>
                  <option value="high">Alto</option>
                </select>
              </EField>
            </div>

            <EField label="Subprefeitura">
              <select
                value={eSubpref}
                onChange={e => setESubpref(e.target.value)}
                style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: '0.78rem', textTransform: 'uppercase' }}
              >
                <option value="">— sem subprefeitura —</option>
                {subprefeituras.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.nome.toUpperCase()} ({s.zona.toUpperCase()})
                  </option>
                ))}
              </select>
            </EField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <EField label="Latitude">
                <input value={eLat} onChange={e => setELat(e.target.value)}
                  placeholder="-23.5514" style={inputStyle} />
              </EField>
              <EField label="Longitude">
                <input value={eLng} onChange={e => setELng(e.target.value)}
                  placeholder="-46.6339" style={inputStyle} />
              </EField>
            </div>

            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: -8 }}>
              Pega no Google Maps: clique direito → "O que há aqui?"
            </p>

          </div>

          {editError && <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--red)' }}>{editError}</p>}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button onClick={submit} disabled={saving} style={{ ...saveBtnStyle, opacity: saving ? 0.5 : 1 }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={cancelEdit} style={cancelBtnStyle}>Cancelar</button>
            </div>
            <button onClick={handleDelete} disabled={deleting} style={{
              padding: '0.4rem 0.9rem', fontSize: '0.8rem', background: 'none',
              color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 4,
              cursor: 'pointer', opacity: deleting ? 0.5 : 1,
            }}>
              {deleting ? 'Excluindo...' : 'Excluir local'}
            </button>
          </div>
        </div>
      )}

      {/* ── READ MODE stats ──────────────────────────────── */}
      {!isEditing && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-dim)', margin: '0 0 1.5rem' }}>
          {shows.length} {shows.length !== 1 ? 'shows' : 'show'}
          {' | '}
          {participados.length} {participados.length !== 1 ? 'participados' : 'participado'}
          {taxaSucesso !== null && (
            <> | <span style={{ color: taxaSucesso >= 70 ? 'var(--status-pos)' : taxaSucesso >= 40 ? 'var(--status-neut)' : 'var(--status-neg)' }}>{taxaSucesso}% taxa</span></>
          )}
        </p>
      )}

      {/* ── PÚBLICOS FREQUENTES ──────────────────────────── */}
      {nichosByVenue && nichosByVenue.length > 0 && !isEditing && (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-sm)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Públicos frequentes
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              {nichosByVenue.length} {nichosByVenue.length === 1 ? 'nicho' : 'nichos'}
            </span>
          </div>
          <div style={{ background: 'var(--surface-raised)', padding: 'var(--space-md)', borderRadius: 2 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {nichosByVenue.map(n => (
                <div key={n.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Link href={`/publicos/${n.id}`} style={{ fontFamily: 'var(--font-serif)', fontSize: '0.9rem', color: 'var(--text-primary)', textDecoration: 'none' }}>
                      {n.nome}
                    </Link>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      {n.ocorrencias} {n.ocorrencias === 1 ? 'show' : 'shows'}
                    </span>
                  </div>
                  {n.underground_score != null && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      underground {n.underground_score}/10
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RESULTADO NO VENUE ───────────────────────────── */}
      {venueResultado && venueResultado.total_shows > 0 && !isEditing && (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-sm)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Resultado aqui
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              {venueResultado.total_shows} {venueResultado.total_shows === 1 ? 'show' : 'shows'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {([
              { key: 'sucesso_total', label: 'sucesso total', cor: 'var(--status-pos)' },
              { key: 'sucesso',       label: 'sucesso',       cor: 'var(--status-neut-p)' },
              { key: 'medio',         label: 'médio',         cor: 'var(--status-neut)' },
              { key: 'fracasso',      label: 'fracasso',      cor: 'var(--status-neg)' },
            ] as { key: keyof DistribuicaoResultado; label: string; cor: string }[])
              .filter(r => venueResultado.distribuicao[r.key] > 0)
              .map(r => (
                <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: r.cor, minWidth: 100 }}>{r.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>{venueResultado.distribuicao[r.key]}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── SHOW HISTORY (sempre visível) ────────────────── */}
      <div>
        <p className="section-label">Histórico de shows</p>
        {shows.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Nenhum show neste local.</p>
        ) : (
          <div>
            {shows.map(s => {
              const past = new Date(s.data + 'T23:59:59') < new Date()
              const nome = getShowDisplayName(s.nome_evento, s.artistas)
              return (
                <Link key={s.id} href={`/shows/${s.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.5rem 0', borderBottom: '1px solid var(--border)',
                  textDecoration: 'none',
                  opacity: past && !s.participou ? 0.3 : past ? 0.6 : 1,
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 90, flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
                    {new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nome}
                  </span>
                  <span style={{
                    fontSize: '0.75rem', flexShrink: 0,
                    color: s.resultado_geral ? COR_RESULTADO[s.resultado_geral] ?? 'var(--text-dim)' : 'var(--text-dim)',
                  }}>
                    {s.resultado_geral
                      ? LABEL_RESULTADO[s.resultado_geral] ?? s.resultado_geral
                      : LABEL_STATUS[s.status_ingresso ?? ''] ?? s.status_ingresso ?? '—'}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function InfoCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: '0.9rem', color: 'var(--text)', margin: '2px 0 0' }}>
        {children}
      </p>
    </div>
  )
}

function EField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────

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
