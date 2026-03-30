'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { updateDesign, addMovement, deleteMovement, deleteDesign } from './actions'

type Design = {
  id: string; nome: string; descricao: string | null; ativo: boolean
  artist_id: string; artista: string; created_at: string
}

type Saldo = {
  total_produzido: number; total_vendido: number
  total_perdido: number; saldo_atual: number
}

type Movement = {
  id: string; tipo: string; quantidade: number
  show_id: string | null; show_label: string | null
  observacoes: string | null; created_at: string
}

type ShowOption = { id: string; label: string }

type ShowItem = {
  id: string; data: string; nome_evento: string | null
  venue_nome: string | null; resultado_geral: string | null
}

const COR_RESULTADO: Record<string, string> = {
  sucesso_total: 'var(--status-pos)', sucesso: 'var(--status-pos)',
  medio: 'var(--status-neut)', fracasso: 'var(--status-neg)',
}
const LABEL_RESULTADO: Record<string, string> = {
  sucesso_total: 'sucesso total', sucesso: 'sucesso', medio: 'médio', fracasso: 'fracasso',
}

type Props = {
  design:      Design
  saldo:       Saldo
  movements:   Movement[]
  showOptions: ShowOption[]
  artistShows: ShowItem[]
}

const TIPO_COLOR: Record<string, string> = {
  produzido: 'var(--green)',
  levado:    'var(--amber)',
  vendido:   'var(--cyan)',
  perdido:   'var(--red)',
}

export function DesignDetailClient({ design, saldo, movements, showOptions, artistShows }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [eNome,     setENome]     = useState(design.nome)
  const [eDesc,     setEDesc]     = useState(design.descricao ?? '')
  const [eAtivo,    setEAtivo]    = useState(design.ativo)
  const [editError, setEditError] = useState<string | null>(null)
  const [saving,    startSave]    = useTransition()
  const [deleting,  startDelete]  = useTransition()

  // Movement form
  const [mTipo,    setMTipo]    = useState<'produzido' | 'levado' | 'vendido' | 'perdido'>('produzido')
  const [mQtd,     setMQtd]     = useState('')
  const [mShowId,  setMShowId]  = useState('')
  const [mObs,     setMObs]     = useState('')
  const [mError,   setMError]   = useState<string | null>(null)
  const [mSaved,   setMSaved]   = useState(false)
  const [savingM,  startSaveM]  = useTransition()

  function startEdit() { setENome(design.nome); setEDesc(design.descricao ?? ''); setEAtivo(design.ativo); setEditError(null); setIsEditing(true) }
  function cancelEdit() { setIsEditing(false) }

  function submitEdit() {
    if (!eNome.trim()) { setEditError('Nome obrigatório'); return }
    setEditError(null)
    startSave(async () => {
      const res = await updateDesign(design.id, { nome: eNome.trim(), descricao: eDesc || null, ativo: eAtivo })
      if (res.error) { setEditError(res.error) } else { setIsEditing(false) }
    })
  }

  function handleDelete() {
    if (!confirm('Excluir este design? Isso não pode ser desfeito. Apenas designs sem movimentações podem ser excluídos.')) return
    startDelete(async () => { await deleteDesign(design.id) })
  }

  function submitMovement() {
    const qtd = parseInt(mQtd)
    if (!qtd || qtd < 1) { setMError('Quantidade inválida'); return }
    if (['levado', 'vendido'].includes(mTipo) && !mShowId) { setMError('Show obrigatório para este tipo'); return }
    setMError(null); setMSaved(false)
    startSaveM(async () => {
      const res = await addMovement({
        design_id:   design.id,
        tipo:        mTipo,
        quantidade:  qtd,
        show_id:     mShowId || null,
        observacoes: mObs || null,
        saldo_atual: saldo.saldo_atual,
      })
      if (res.error) { setMError(res.error) } else {
        setMQtd(''); setMShowId(''); setMObs(''); setMSaved(true)
        setTimeout(() => setMSaved(false), 3000)
      }
    })
  }

  function handleDeleteMovement(m: Movement) {
    if (!confirm('Remover esta movimentação?')) return
    startSaveM(async () => { await deleteMovement(m.id, design.id, m.show_id) })
  }

  const needsShow = mTipo === 'levado' || mTipo === 'vendido'
  const showOptional = mTipo === 'perdido'

  return (
    <div className="page-container">
      <Link href="/estoque" className="breadcrumb">← Estoque</Link>

      {/* Header */}
      <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{design.nome}</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 4 }}>
              <Link href={`/artistas/${design.artist_id}`} style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>
                {design.artista}
              </Link>
              {!design.ativo && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '0.1rem 0.4rem', borderRadius: 3 }}>inativo</span>}
            </p>
          </div>
          {!isEditing && (
            <button onClick={startEdit} style={editBtnStyle}>editar</button>
          )}
        </div>
        {design.descricao && !isEditing && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.5 }}>{design.descricao}</p>
        )}
      </div>

      {/* Edit mode */}
      {isEditing && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <EField label="Nome *">
              <input value={eNome} onChange={e => setENome(e.target.value)} style={inputStyle} />
            </EField>
            <EField label="Descrição">
              <textarea value={eDesc} onChange={e => setEDesc(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </EField>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" id="eAtivo" checked={eAtivo} onChange={e => setEAtivo(e.target.checked)} style={{ width: 'auto', cursor: 'pointer' }} />
              <label htmlFor="eAtivo" style={{ fontSize: '0.875rem', color: 'var(--text)', cursor: 'pointer' }}>Ativo</label>
            </div>
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
              {deleting ? 'Excluindo...' : 'Excluir design'}
            </button>
          </div>
        </div>
      )}

      {/* Saldo */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p className="section-label">Saldo</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Produzido', value: saldo.total_produzido, color: 'var(--green)' },
            { label: 'Vendido',   value: saldo.total_vendido,   color: 'var(--cyan)' },
            { label: 'Perdido',   value: saldo.total_perdido,   color: 'var(--red)' },
            {
              label: 'Em estoque', value: saldo.saldo_atual,
              color: saldo.saldo_atual > 0 ? 'var(--green)' : saldo.saldo_atual < 0 ? 'var(--red)' : 'var(--text-muted)',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card">
              <p className="stat-label">{label}</p>
              <div className="stat-value" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Nova movimentação */}
      <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
        <p className="section-label">Registrar movimentação</p>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <EField label="Tipo">
              <select value={mTipo} onChange={e => { setMTipo(e.target.value as any); setMShowId('') }} style={inputStyle}>
                <option value="produzido">Produzido</option>
                <option value="levado">Levado (show)</option>
                <option value="vendido">Vendido (show)</option>
                <option value="perdido">Perdido</option>
              </select>
            </EField>
            <EField label="Quantidade">
              <input type="number" min={1} value={mQtd} onChange={e => setMQtd(e.target.value)} style={inputStyle} />
            </EField>
          </div>

          {(needsShow || showOptional) && (
            <div style={{ marginBottom: '1rem' }}>
              <EField label={`Show ${needsShow ? '*' : '(opcional)'}`}>
                <select value={mShowId} onChange={e => setMShowId(e.target.value)} style={inputStyle}>
                  <option value="">—</option>
                  {showOptions.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </EField>
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <EField label="Observações">
              <input value={mObs} onChange={e => setMObs(e.target.value)} placeholder="Opcional..." style={inputStyle} />
            </EField>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={submitMovement} disabled={savingM} style={{ ...saveBtnStyle, opacity: savingM ? 0.5 : 1 }}>
              {savingM ? 'Registrando...' : 'Registrar'}
            </button>
            {mSaved && <span style={{ fontSize: '0.8rem', color: 'var(--green)' }}>✓ registrado</span>}
            {mError && <span style={{ fontSize: '0.8rem', color: 'var(--red)' }}>{mError}</span>}
          </div>
        </div>
      </div>

      {/* Shows do artista */}
      {artistShows.length > 0 && (
        <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <p className="section-label">Shows — {design.artista} ({artistShows.length})</p>
          <div>
            {artistShows.map(s => {
              const titulo = s.nome_evento ?? s.venue_nome ?? s.data
              const resultado = s.resultado_geral
              return (
                <Link key={s.id} href={`/shows/${s.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', padding: '0.45rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '0.875rem', color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {titulo}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', flexShrink: 0 }}>
                      {s.venue_nome && s.nome_evento ? s.venue_nome : s.data}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', flexShrink: 0 }}>
                      {s.data}
                    </span>
                    {resultado && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: COR_RESULTADO[resultado] ?? 'var(--text-dim)', flexShrink: 0 }}>
                        {LABEL_RESULTADO[resultado] ?? resultado}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Histórico */}
      <div>
        <p className="section-label">Histórico ({movements.length})</p>
        {movements.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Nenhuma movimentação.</p>
        ) : (
          <div>
            {movements.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem',
                  border: `1px solid ${TIPO_COLOR[m.tipo] ?? 'var(--border)'}`,
                  borderRadius: 3, color: TIPO_COLOR[m.tipo] ?? 'var(--text-dim)',
                  flexShrink: 0,
                }}>
                  {m.tipo}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text)', width: 40, textAlign: 'right', flexShrink: 0 }}>
                  {m.quantidade}
                </span>
                <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.show_label ? (
                    <Link href={`/shows/${m.show_id}`} style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>{m.show_label}</Link>
                  ) : m.observacoes ?? '—'}
                </span>
                {m.show_label && m.observacoes && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.observacoes}
                  </span>
                )}
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                  {new Date(m.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                </span>
                <button onClick={() => handleDeleteMovement(m)}
                  style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '0 4px' }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
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
  border: '1px solid var(--border)', padding: '0.2rem 0.6rem', borderRadius: 4, cursor: 'pointer',
}
