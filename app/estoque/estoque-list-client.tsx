'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { removeAccents } from '@/lib/text-utils'

type Design = {
  id: string
  nome: string
  artista: string
  ativo: boolean
  total_produzido: number
  total_vendido: number
  saldo_atual: number
}

type FilterKey = 'todos' | 'ativos' | 'inativos'

export function EstoqueListClient({ designs }: { designs: Design[] }) {
  const [busca,  setBusca]  = useState('')
  const [filtro, setFiltro] = useState<FilterKey>('ativos')

  const filtered = useMemo(() => {
    let list = [...designs]

    if (filtro === 'ativos')   list = list.filter(d => d.ativo)
    if (filtro === 'inativos') list = list.filter(d => !d.ativo)

    if (busca.trim()) {
      const q = removeAccents(busca.toLowerCase())
      list = list.filter(d =>
        removeAccents(d.nome.toLowerCase()).includes(q) ||
        removeAccents(d.artista.toLowerCase()).includes(q)
      )
    }

    return list
  }, [designs, filtro, busca])

  return (
    <div style={{ padding: '1.5rem', maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Estoque</h1>
        <Link href="/estoque/new" style={{
          padding: '0.4rem 1rem', fontSize: '0.8rem',
          background: 'var(--surface-2)', color: 'var(--text)',
          border: '1px solid var(--border)', borderRadius: 4, textDecoration: 'none',
        }}>
          + Novo design
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {(['todos', 'ativos', 'inativos'] as FilterKey[]).map(f => (
            <button key={f} onClick={() => setFiltro(f)} style={{
              padding: '0.3rem 0.75rem', fontSize: '0.75rem', borderRadius: 99,
              cursor: 'pointer', border: '1px solid var(--border)',
              background: filtro === f ? 'var(--text)' : 'var(--surface)',
              color: filtro === f ? 'var(--nav-bg)' : 'var(--text-dim)',
            }}>
              {f}
            </button>
          ))}
        </div>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..."
          style={{
            marginLeft: 'auto', fontSize: '0.8rem', background: 'none',
            border: 'none', borderBottom: '1px solid var(--border)',
            color: 'var(--text)', outline: 'none', padding: '0.2rem 0.25rem', width: 140,
          }} />
      </div>

      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>
        {filtered.length} design{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Header */}
      <div style={{ display: 'flex', gap: '1rem', padding: '0 0.5rem 0.5rem', borderBottom: '1px solid var(--border)', marginBottom: 2 }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flex: 1 }}>Design</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 120, flexShrink: 0 }}>Artista</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 70, flexShrink: 0, textAlign: 'right' }}>Produzido</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 70, flexShrink: 0, textAlign: 'right' }}>Vendido</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 70, flexShrink: 0, textAlign: 'right' }}>Saldo</span>
      </div>

      {filtered.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', padding: '2rem 0.5rem' }}>Nenhum design encontrado.</p>
      ) : (
        filtered.map(d => (
          <Link key={d.id} href={`/estoque/${d.id}`} style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            padding: '0.55rem 0.5rem', borderBottom: '1px solid var(--border)',
            textDecoration: 'none', opacity: d.ativo ? 1 : 0.45,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.nome}
              </span>
              {!d.ativo && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>inativo</span>
              )}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', width: 120, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.artista}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', width: 70, flexShrink: 0, textAlign: 'right', fontFamily: 'monospace' }}>
              {d.total_produzido}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--cyan)', width: 70, flexShrink: 0, textAlign: 'right', fontFamily: 'monospace' }}>
              {d.total_vendido}
            </span>
            <span style={{
              fontSize: '0.8rem', fontFamily: 'monospace',
              width: 70, flexShrink: 0, textAlign: 'right',
              color: d.saldo_atual > 0 ? 'var(--green)' : d.saldo_atual < 0 ? 'var(--red)' : 'var(--text-muted)',
            }}>
              {d.saldo_atual}
            </span>
          </Link>
        ))
      )}
    </div>
  )
}
