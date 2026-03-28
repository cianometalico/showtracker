'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  updateShowInline, updateResultado, updateParticipou, deleteShow, searchVenues, duplicateShow,
} from './actions'
import type { UpdateShowInput } from './actions'
import { isShowPast, getShowDisplayName } from '@/lib/show-utils'
import { ArtistPicker } from '@/components/artist-picker'
import type { PickedArtist } from '@/components/artist-picker'

// ── Types ─────────────────────────────────────────────────────

type Venue = {
  id: string; nome: string; cidade: string; bairro?: string | null
  capacidade_praticavel?: number | null; zona_risco?: boolean | null
}

type LineupItem = {
  artist_id: string; nome: string; ordem: number; faz_estampa: boolean
  pais?: string | null; lastfm_listeners?: number | null
}

type ShowData = {
  id: string; data: string; nome_evento: string | null
  status_ingresso: string | null; participou: boolean | null
  resultado_geral: string | null; clima_estimado: string | null
  concorrencia: string | null; observacoes: string | null
  publico_estimado: number | null; singularidades: string[] | null
  legado: boolean | null; venue_id: string | null
  source_url: string | null; pecas_levadas: number | null; pecas_vendidas: number | null
}

type Props = { show: ShowData; venue: Venue | null; lineup: LineupItem[] }

// ── Constants ─────────────────────────────────────────────────

const LABEL_STATUS: Record<string, string> = {
  'sold out': 'Sold Out', 'bem vendido': 'Bem Vendido', 'mal vendido': 'Mal Vendido',
}
const LABEL_RESULTADO: Record<string, string> = {
  sucesso_total: 'Sucesso Total', sucesso: 'Sucesso', medio: 'Médio', fracasso: 'Fracasso',
}
const COR_RESULTADO: Record<string, string> = {
  sucesso_total: 'var(--green)', sucesso: 'var(--green)', medio: 'var(--amber)', fracasso: 'var(--red)',
}

function formatData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function lineupToPickedArtists(lineup: LineupItem[]): PickedArtist[] {
  return lineup.map(l => ({ id: l.artist_id, nome: l.nome, ordem: l.ordem, faz_estampa: l.faz_estampa }))
}

// ── Main Component ────────────────────────────────────────────

export function ShowDetailClient({ show, venue: initialVenue, lineup: initialLineup }: Props) {
  const router = useRouter()
  const past = isShowPast(show.data)
  const nomeShow = getShowDisplayName(show.nome_evento, initialLineup.map(l => l.nome))

  // ── General edit state ──
  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [saving,    startSave]    = useTransition()
  const [deleting,  startDelete]  = useTransition()

  // ── Edit form fields ──
  const [eNome,         setENome]        = useState(show.nome_evento ?? '')
  const [eData,         setEData]        = useState(show.data)
  const [eStatus,       setEStatus]      = useState(show.status_ingresso ?? '')
  const [eConcorrencia, setEConcorrencia]= useState(show.concorrencia ?? '')
  const [eObservacoes,  setEObservacoes] = useState(show.observacoes ?? '')
  const [eSourceUrl,    setESourceUrl]   = useState(show.source_url ?? '')

  // ── Venue edit ──
  const [eVenueId,      setEVenueId]      = useState<string | null>(show.venue_id)
  const [eVenueLabel,   setEVenueLabel]   = useState(initialVenue?.nome ?? '')
  const [eVenueQuery,   setEVenueQuery]   = useState('')
  const [eVenueResults, setEVenueResults] = useState<{ id: string; nome: string; cidade: string }[]>([])

  // ── Artists edit (ArtistPicker) ──
  const [pickerArtists, setPickerArtists] = useState<PickedArtist[]>(() => lineupToPickedArtists(initialLineup))

  // ── Duplicar show (nova data) ──
  const [showSiblingInput,  setShowSiblingInput]  = useState(false)
  const [siblingDate,       setSiblingDate]       = useState('')
  const [siblingError,      setSiblingError]      = useState<string | null>(null)
  const [creatingSibling,   startCreateSibling]   = useTransition()

  // ── Participou toggle ──
  const [pParticipou, setPParticipou] = useState(show.participou ?? false)
  const [savingP,     startSaveP]     = useTransition()

  function toggleParticipou(val: boolean) {
    setPParticipou(val)
    startSaveP(async () => { await updateParticipou(show.id, val) })
  }

  // ── Resultado (always editable) ──
  const [rPecasLevadas,  setRPecasLevadas]  = useState<number>(show.pecas_levadas ?? 0)
  const [rPecasVendidas, setRPecasVendidas] = useState<number>(show.pecas_vendidas ?? 0)
  const [rResultado,     setRResultado]     = useState(show.resultado_geral ?? '')
  const [savingR,        startSaveR]        = useTransition()
  const [rSaved,         setRSaved]         = useState(false)
  const [rError,         setRError]         = useState<string | null>(null)

  useEffect(() => {
    setRPecasLevadas(show.pecas_levadas ?? 0)
    setRPecasVendidas(show.pecas_vendidas ?? 0)
    setRResultado(show.resultado_geral ?? '')
    setRSaved(false)
  }, [show.pecas_levadas, show.pecas_vendidas, show.resultado_geral])

  const taxa = rPecasLevadas > 0 ? (rPecasVendidas / rPecasLevadas * 100) : null
  const taxaColor = taxa === null ? 'var(--text-dim)'
    : taxa >= 70 ? 'var(--green)' : taxa >= 30 ? 'var(--amber)' : 'var(--red)'

  // ── Handlers ─────────────────────────────────────────────

  function resetEditState() {
    setENome(show.nome_evento ?? '')
    setEData(show.data)
    setEStatus(show.status_ingresso ?? '')
    setEConcorrencia(show.concorrencia ?? '')
    setEObservacoes(show.observacoes ?? '')
    setESourceUrl(show.source_url ?? '')
    setEVenueId(show.venue_id)
    setEVenueLabel(initialVenue?.nome ?? '')
    setEVenueQuery('')
    setEVenueResults([])
    setPickerArtists(lineupToPickedArtists(initialLineup))
    setEditError(null)
  }

  function startEdit() { resetEditState(); setIsEditing(true) }
  function cancelEdit() { resetEditState(); setIsEditing(false) }

  function submitEdit() {
    if (!eData)                  { setEditError('Data obrigatória'); return }
    if (pickerArtists.length === 0) { setEditError('Pelo menos um artista é necessário'); return }
    setEditError(null)
    const input: UpdateShowInput = {
      nome_evento:     eNome || null,
      data:            eData,
      venue_id:        eVenueId,
      status_ingresso: eStatus || null,
      concorrencia:    eConcorrencia || null,
      resultado_geral: rResultado || null,
      observacoes:     eObservacoes || null,
      source_url:      eSourceUrl || null,
      pecas_levadas:   rPecasLevadas || null,
      pecas_vendidas:  rPecasVendidas || null,
    }
    const artistas = pickerArtists.map(a => ({
      artist_id: a.id, ordem: a.ordem, faz_estampa: a.faz_estampa,
    }))
    startSave(async () => {
      await updateShowInline(show.id, input, artistas)
      setIsEditing(false)
    })
  }

  function handleDelete() {
    if (!confirm('Excluir este show? Não pode ser desfeito.')) return
    startDelete(async () => { await deleteShow(show.id) })
  }

  function handleCreateSibling() {
    if (!siblingDate) { setSiblingError('Informe a data'); return }
    setSiblingError(null)
    startCreateSibling(async () => {
      const res = await duplicateShow(show.id, siblingDate)
      if (res.error) { setSiblingError(res.error) }
      else if (res.id) { router.push(`/shows/${res.id}`) }
    })
  }

  async function onVenueSearch(q: string) {
    setEVenueQuery(q)
    setEVenueId(null)
    setEVenueLabel('')
    if (q.length < 2) { setEVenueResults([]); return }
    setEVenueResults(await searchVenues(q))
  }

  function saveResultado() {
    setRError(null)
    setRSaved(false)
    startSaveR(async () => {
      const res = await updateResultado(show.id, {
        pecas_levadas:   rPecasLevadas || null,
        pecas_vendidas:  rPecasVendidas || null,
        resultado_geral: rResultado || null,
      })
      if (res.error) { setRError(res.error) } else { setRSaved(true) }
    })
  }

  // ── Render ────────────────────────────────────────────────

  const singularidades = show.singularidades ?? []

  return (
    <div>
      <Link href="/shows" className="breadcrumb">← Shows</Link>

      {/* Header */}
      <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.3 }}>
            {nomeShow}
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
            {show.legado && !isEditing && (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '0.2rem 0.6rem', borderRadius: 4 }}>
                ⟁ legado
              </span>
            )}
            {show.resultado_geral && !isEditing && (
              <span style={{
                fontSize: '0.75rem', fontWeight: 600,
                color: COR_RESULTADO[show.resultado_geral] ?? 'var(--text-dim)',
                border: `1px solid ${COR_RESULTADO[show.resultado_geral] ?? 'var(--border)'}`,
                padding: '0.2rem 0.6rem', borderRadius: 4,
              }}>
                {LABEL_RESULTADO[show.resultado_geral] ?? show.resultado_geral}
              </span>
            )}
            {!isEditing && (
              <button onClick={startEdit} style={editBtnStyle}>editar</button>
            )}
          </div>
        </div>

        {!isEditing && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 6 }}>
            {formatData(show.data)}
          </p>
        )}

        {singularidades.length > 0 && !isEditing && (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: 8 }}>
            {singularidades.map((tag: string) => (
              <span key={tag} style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: '#1a1a2a', border: '1px solid var(--blue)', borderRadius: 3, color: 'var(--blue)' }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── EDIT MODE ─────────────────────────────────────── */}
      {isEditing && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            <EField label="Nome do evento">
              <input value={eNome} onChange={e => setENome(e.target.value)}
                placeholder="opcional — se vazio, usa nomes dos artistas"
                style={{ ...inputStyle, fontSize: '0.8rem', color: eNome ? 'var(--text)' : 'var(--text-dim)' }} />
            </EField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <EField label="Data *">
                <input type="date" value={eData} onChange={e => setEData(e.target.value)} style={inputStyle} />
              </EField>
              <EField label="Status ingresso">
                <select value={eStatus} onChange={e => setEStatus(e.target.value)} style={inputStyle}>
                  <option value="">sem informação</option>
                  <option value="sold out">Sold Out</option>
                  <option value="bem vendido">Bem Vendido</option>
                  <option value="mal vendido">Mal Vendido</option>
                </select>
              </EField>
            </div>

            <EField label="local">
              {eVenueId ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ ...inputStyle, display: 'block' }}>{eVenueLabel}</span>
                  <button onClick={() => { setEVenueId(null); setEVenueLabel(''); setEVenueQuery('') }} style={clearBtnStyle}>✕</button>
                </div>
              ) : (
                <div>
                  <input value={eVenueQuery} onChange={e => onVenueSearch(e.target.value)} placeholder="buscar local..." style={inputStyle} />
                  {eVenueResults.length > 0 && (
                    <div style={dropdownStyle}>
                      {eVenueResults.map(v => (
                        <button key={v.id} onClick={() => { setEVenueId(v.id); setEVenueLabel(v.nome); setEVenueResults([]) }} style={dropdownItemStyle}>
                          {v.nome} <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>· {v.cidade}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </EField>

            <EField label="Lineup (ordem = headliner primeiro)">
              <ArtistPicker
                selectedArtists={pickerArtists}
                onArtistsChange={setPickerArtists}
              />
            </EField>

            <EField label="Concorrência">
              <select value={eConcorrencia} onChange={e => setEConcorrencia(e.target.value)} style={inputStyle}>
                <option value="">—</option>
                <option value="nenhuma">Nenhuma</option>
                <option value="baixa">Baixa</option>
                <option value="média">Média</option>
                <option value="alta">Alta</option>
              </select>
            </EField>

            <EField label="Observações">
              <textarea value={eObservacoes} onChange={e => setEObservacoes(e.target.value)}
                rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </EField>

            <EField label="Source URL">
              <input value={eSourceUrl} onChange={e => setESourceUrl(e.target.value)} style={inputStyle} placeholder="https://..." />
            </EField>

          </div>

          {editError && <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--red)' }}>{editError}</p>}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button onClick={submitEdit} disabled={saving} style={{ ...saveBtnStyle, opacity: saving ? 0.5 : 1 }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={cancelEdit} style={cancelBtnStyle}>Cancelar</button>
            </div>
            <button onClick={handleDelete} disabled={deleting}
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', background: 'none', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 4, cursor: 'pointer', opacity: deleting ? 0.5 : 1 }}>
              {deleting ? 'Excluindo...' : 'Excluir show'}
            </button>
          </div>

          {/* + adicionar data (show irmão) */}
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            {!showSiblingInput ? (
              <button onClick={() => { setShowSiblingInput(true); setSiblingDate(''); setSiblingError(null) }}
                style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                + adicionar data
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input type="date" value={siblingDate} onChange={e => setSiblingDate(e.target.value)}
                  style={{ ...inputStyle, width: 'auto' }} />
                <button onClick={handleCreateSibling} disabled={creatingSibling}
                  style={{ ...saveBtnStyle, fontSize: '0.8rem', opacity: creatingSibling ? 0.5 : 1 }}>
                  {creatingSibling ? 'Criando...' : 'Criar show'}
                </button>
                <button onClick={() => setShowSiblingInput(false)} style={cancelBtnStyle}>cancelar</button>
                {siblingError && <span style={{ fontSize: '0.75rem', color: 'var(--red)' }}>{siblingError}</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── READ MODE ─────────────────────────────────────── */}
      {!isEditing && (
        <>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {[
              {
                label: 'Status',
                value: show.status_ingresso ? (LABEL_STATUS[show.status_ingresso] ?? show.status_ingresso) : 'sem informação',
                color: show.status_ingresso ? undefined : 'var(--text-muted)',
              },
              { label: 'Público est.', value: show.publico_estimado ? show.publico_estimado.toLocaleString('pt-BR') : '—' },
              { label: 'Concorrência', value: show.concorrencia ?? '—' },
              { label: past ? 'Realizado' : 'Previsto', value: past ? (show.participou ? 'Sim' : 'Não') : '—' },
            ].map(({ label, value, color }) => (
              <div key={label} className="stat-card">
                <p className="stat-label">{label}</p>
                <div className="stat-value" style={color ? { color } : undefined}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <p className="section-label">Lineup</p>
            {initialLineup.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Sem artistas cadastrados.</p>
            ) : (
              <div>
                {initialLineup.map(l => (
                  <div key={l.artist_id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)', width: 16 }}>{l.ordem}</span>
                    <Link href={`/artistas/${l.artist_id}`} style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text)', textDecoration: 'none' }}>
                      {l.nome}
                    </Link>
                    {l.pais && <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{l.pais}</span>}
                    {l.lastfm_listeners && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                        {l.lastfm_listeners.toLocaleString('pt-BR')}
                      </span>
                    )}
                    {l.faz_estampa && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--cyan)', padding: '0.1rem 0.4rem', border: '1px solid var(--cyan)', borderRadius: 3 }}>
                        estampa
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {initialVenue && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="section-label">local</p>
              <Link href={`/locais/${initialVenue.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '0.75rem 1rem', background: 'var(--surface)' }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>{initialVenue.nome}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '2px 0 0' }}>
                    {initialVenue.bairro ? `${initialVenue.bairro} · ` : ''}{initialVenue.cidade}
                    {initialVenue.capacidade_praticavel && ` · cap. ${initialVenue.capacidade_praticavel.toLocaleString('pt-BR')}`}
                    {initialVenue.zona_risco && <span style={{ color: 'var(--red)', marginLeft: 6 }}>zona de risco</span>}
                  </p>
                </div>
              </Link>
            </div>
          )}

          {show.observacoes && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="section-label">Observações</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>{show.observacoes}</p>
            </div>
          )}

          {show.source_url && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p className="section-label">link do evento</p>
              <a href={show.source_url} target="_blank" rel="noopener noreferrer" style={{
                fontSize: '0.85rem', color: 'var(--cyan)', textDecoration: 'underline',
                wordBreak: 'break-all',
              }}>
                {show.source_url}
              </a>
            </div>
          )}
        </>
      )}

      {/* ── PARTICIPAÇÃO (sempre editável) ─────────────────── */}
      {!isEditing && (
        <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <p className="section-label">{past ? 'Participação' : 'Presença prevista'}</p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => toggleParticipou(true)}
              disabled={savingP}
              style={{
                padding: '0.3rem 0.9rem', fontSize: '0.8rem', borderRadius: 99, cursor: 'pointer',
                border: '1px solid var(--border)',
                background: pParticipou ? 'var(--text)' : 'var(--surface)',
                color: pParticipou ? 'var(--nav-bg)' : 'var(--text-dim)',
                opacity: savingP ? 0.5 : 1,
              }}
            >
              {past ? 'participei' : 'vou participar'}
            </button>
            <button
              onClick={() => toggleParticipou(false)}
              disabled={savingP}
              style={{
                padding: '0.3rem 0.9rem', fontSize: '0.8rem', borderRadius: 99, cursor: 'pointer',
                border: '1px solid var(--border)',
                background: !pParticipou ? 'var(--text)' : 'var(--surface)',
                color: !pParticipou ? 'var(--nav-bg)' : 'var(--text-dim)',
                opacity: savingP ? 0.5 : 1,
              }}
            >
              {past ? 'não participei' : 'não vou participar'}
            </button>
          </div>
        </div>
      )}

      {/* ── RESULTADO (sempre editável para shows passados) ── */}
      {past && (
        <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <p className="section-label">Resultado</p>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <EField label="Peças levadas">
                <input type="number" min={0} value={rPecasLevadas || ''}
                  onChange={e => setRPecasLevadas(parseInt(e.target.value) || 0)} style={inputStyle} />
              </EField>
              <EField label="Peças vendidas">
                <input type="number" min={0} max={rPecasLevadas || undefined}
                  value={rPecasVendidas || ''}
                  onChange={e => setRPecasVendidas(parseInt(e.target.value) || 0)} style={inputStyle} />
              </EField>
              <EField label="Resultado geral">
                <select value={rResultado} onChange={e => setRResultado(e.target.value)} style={inputStyle}>
                  <option value="">—</option>
                  <option value="sucesso_total">Sucesso Total</option>
                  <option value="sucesso">Sucesso</option>
                  <option value="medio">Médio</option>
                  <option value="fracasso">Fracasso</option>
                </select>
              </EField>
            </div>
            {taxa !== null && (
              <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                Taxa de conversão: <span style={{ fontWeight: 700, color: taxaColor }}>{taxa.toFixed(1)}%</span>
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button onClick={saveResultado} disabled={savingR} style={{ ...saveBtnStyle, opacity: savingR ? 0.5 : 1 }}>
                {savingR ? 'Salvando...' : 'Salvar resultado'}
              </button>
              {rSaved && <span style={{ fontSize: '0.8rem', color: 'var(--green)' }}>✓ salvo</span>}
              {rError && <span style={{ fontSize: '0.8rem', color: 'var(--red)' }}>{rError}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

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
const saveBtnStyle: React.CSSProperties = {
  padding: '0.45rem 1.25rem', fontSize: '0.875rem', background: 'var(--surface-2)',
  color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer',
}
const cancelBtnStyle: React.CSSProperties = {
  fontSize: '0.85rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
}
const editBtnStyle: React.CSSProperties = {
  fontSize: '0.75rem', color: 'var(--text-dim)', background: 'var(--surface-2)',
  border: '1px solid var(--border)', padding: '0.2rem 0.6rem', borderRadius: 4, cursor: 'pointer',
}
