'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { addShowMovement } from './actions'

type StockMovement = {
  id: string
  design_id: string
  design_nome: string
  tipo: string
  quantidade: number
  observacoes: string | null
  created_at: string
}

type DesignOption = {
  id: string
  nome: string
  artista: string
  saldo: number
}

type Props = {
  showId:         string
  movements:      StockMovement[]
  activeDesigns:  DesignOption[]
  levadosAqui:    string[] // design_ids que foram levados pro este show
}

const TIPO_COLOR: Record<string, string> = {
  levado:  'var(--amber)',
  vendido: 'var(--cyan)',
  perdido: 'var(--red)',
}

export function ShowStockSection({ showId, movements, activeDesigns, levadosAqui }: Props) {
  const [levarDesignId, setLevarDesignId] = useState('')
  const [levarQtd,      setLevarQtd]      = useState('')
  const [venderDesignId,setVenderDesignId]= useState('')
  const [venderQtd,     setVenderQtd]     = useState('')
  const [levarError,    setLevarError]    = useState<string | null>(null)
  const [venderError,   setVenderError]   = useState<string | null>(null)
  const [levarSaved,    setLevarSaved]    = useState(false)
  const [venderSaved,   setVenderSaved]   = useState(false)
  const [saving,        startSave]        = useTransition()

  const designsParaLevar  = activeDesigns.filter(d => d.saldo > 0)
  const designsParaVender = activeDesigns.filter(d => levadosAqui.includes(d.id))

  // Agrupar movimentos por design
  const byDesign: Record<string, { nome: string; levado: number; vendido: number }> = {}
  for (const m of movements) {
    if (!byDesign[m.design_id]) byDesign[m.design_id] = { nome: m.design_nome, levado: 0, vendido: 0 }
    if (m.tipo === 'levado')  byDesign[m.design_id].levado  += m.quantidade
    if (m.tipo === 'vendido') byDesign[m.design_id].vendido += m.quantidade
  }
  const designSummary = Object.entries(byDesign).map(([id, d]) => ({ id, ...d }))

  function submitLevar() {
    const qtd = parseInt(levarQtd)
    if (!levarDesignId) { setLevarError('Selecione um design'); return }
    if (!qtd || qtd < 1) { setLevarError('Quantidade inválida'); return }
    const design = activeDesigns.find(d => d.id === levarDesignId)
    if (design && qtd > design.saldo) { setLevarError(`Saldo insuficiente (${design.saldo})`); return }
    setLevarError(null); setLevarSaved(false)
    startSave(async () => {
      const res = await addShowMovement({ showId, designId: levarDesignId, tipo: 'levado', quantidade: qtd, observacoes: null })
      if (res.error) { setLevarError(res.error) } else {
        setLevarDesignId(''); setLevarQtd(''); setLevarSaved(true)
        setTimeout(() => setLevarSaved(false), 3000)
      }
    })
  }

  function submitVender() {
    const qtd = parseInt(venderQtd)
    if (!venderDesignId) { setVenderError('Selecione um design'); return }
    if (!qtd || qtd < 1) { setVenderError('Quantidade inválida'); return }
    setVenderError(null); setVenderSaved(false)
    startSave(async () => {
      const res = await addShowMovement({ showId, designId: venderDesignId, tipo: 'vendido', quantidade: qtd, observacoes: null })
      if (res.error) { setVenderError(res.error) } else {
        setVenderDesignId(''); setVenderQtd(''); setVenderSaved(true)
        setTimeout(() => setVenderSaved(false), 3000)
      }
    })
  }

  return (
    <div>
      <p className="section-label">peças por design</p>

      {/* Resumo por design */}
      {designSummary.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', padding: '0 0 0.4rem', borderBottom: '1px solid var(--border)', marginBottom: 2 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flex: 1 }}>Design</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 60, textAlign: 'right' }}>Levado</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 60, textAlign: 'right' }}>Vendido</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 50, textAlign: 'right' }}>Taxa</span>
          </div>
          {designSummary.map(d => {
            const taxa = d.levado > 0 ? Math.round((d.vendido / d.levado) * 100) : null
            const taxaColor = taxa === null ? 'var(--text-dim)' : taxa >= 70 ? 'var(--green)' : taxa >= 30 ? 'var(--amber)' : 'var(--red)'
            return (
              <div key={d.id} style={{ display: 'flex', gap: '1rem', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                <Link href={`/estoque/${d.id}`} style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text)', textDecoration: 'none' }}>
                  {d.nome}
                </Link>
                <span style={{ fontSize: '0.8rem', color: 'var(--amber)', fontFamily: 'var(--font-mono)', width: 60, textAlign: 'right' }}>{d.levado}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', width: 60, textAlign: 'right' }}>{d.vendido}</span>
                <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', width: 50, textAlign: 'right', color: taxaColor }}>
                  {taxa !== null ? `${taxa}%` : '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Lista de movimentos individuais */}
      {movements.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6 }}>movimentações</p>
          {movements.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.35rem',
                border: `1px solid ${TIPO_COLOR[m.tipo] ?? 'var(--border)'}`,
                borderRadius: 3, color: TIPO_COLOR[m.tipo] ?? 'var(--text-dim)', flexShrink: 0,
              }}>
                {m.tipo}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text)', width: 32, textAlign: 'right', flexShrink: 0 }}>{m.quantidade}</span>
              <Link href={`/estoque/${m.design_id}`} style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-dim)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.design_nome}
              </Link>
              {m.observacoes && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>{m.observacoes}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Forms rápidos — uma linha */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>

        {/* Levar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>levar</span>
          <select value={levarDesignId} onChange={e => setLevarDesignId(e.target.value)} style={inlineSelectStyle}>
            <option value="">design…</option>
            {designsParaLevar.map(d => <option key={d.id} value={d.id}>{d.nome} ({d.saldo})</option>)}
          </select>
          <input type="number" min={1} value={levarQtd} onChange={e => setLevarQtd(e.target.value)}
            placeholder="qtd" style={inlineQtdStyle} />
          <button onClick={submitLevar} disabled={saving} style={{ ...actionBtnStyle, borderColor: 'var(--amber)', color: 'var(--amber)', opacity: saving ? 0.5 : 1 }}>
            ok
          </button>
          {levarSaved && <span style={{ fontSize: '0.75rem', color: 'var(--status-pos)' }}>✓</span>}
          {levarError && <span style={{ fontSize: '0.75rem', color: 'var(--red)' }}>{levarError}</span>}
        </div>

        {/* Vender */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>vender</span>
          <select value={venderDesignId} onChange={e => setVenderDesignId(e.target.value)} style={inlineSelectStyle}>
            <option value="">design…</option>
            {designsParaVender.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
          <input type="number" min={1} value={venderQtd} onChange={e => setVenderQtd(e.target.value)}
            placeholder="qtd" style={inlineQtdStyle} />
          <button onClick={submitVender} disabled={saving} style={{ ...actionBtnStyle, borderColor: 'var(--cyan)', color: 'var(--cyan)', opacity: saving ? 0.5 : 1 }}>
            ok
          </button>
          {venderSaved && <span style={{ fontSize: '0.75rem', color: 'var(--status-pos)' }}>✓</span>}
          {venderError && <span style={{ fontSize: '0.75rem', color: 'var(--red)' }}>{venderError}</span>}
        </div>

      </div>
    </div>
  )
}

const inlineSelectStyle: React.CSSProperties = {
  fontSize: '0.8rem', background: 'var(--form-bg)', color: 'var(--text-primary)',
  border: '1px solid var(--form-border)', borderRadius: 'var(--form-radius)',
  padding: '4px 8px', outline: 'none',
}
const inlineQtdStyle: React.CSSProperties = {
  fontSize: '0.8rem', background: 'var(--form-bg)', color: 'var(--text-primary)',
  border: '1px solid var(--form-border)', borderRadius: 'var(--form-radius)',
  padding: '4px 8px', outline: 'none', width: 56,
}
const actionBtnStyle: React.CSSProperties = {
  fontSize: '0.75rem', background: 'none', border: '1px solid', borderRadius: 2,
  padding: '4px 10px', cursor: 'pointer',
}
