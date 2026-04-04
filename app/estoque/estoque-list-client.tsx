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

  function handleFiltro(f: FilterKey) {
    setFiltro(f)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--text)', margin: 0 }}>Estoque</h1>
        <Link href="/estoque/new" style={{
          padding: '0.4rem 1rem', fontSize: '0.8rem',
          background: 'var(--surface-raised)', color: 'var(--text)',
          border: '1px solid var(--border)', borderRadius: 4, textDecoration: 'none',
        }}>
          + Novo design
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {(['todos', 'ativos', 'inativos'] as FilterKey[]).map(f => (
            <button key={f} onClick={() => handleFiltro(f)} style={{
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

      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
        {filtered.length} design{filtered.length !== 1 ? 's' : ''}
      </p>

      {filtered.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', padding: '2rem 0' }}>Nenhum design encontrado.</p>
      ) : (
        filtered.map(d => (
          <Link key={d.id} href={`/estoque/${d.id}`} style={{
            display: 'block',
            padding: '0.55rem 0',
            borderBottom: '1px solid var(--border)',
            textDecoration: 'none',
            opacity: d.ativo ? 1 : 0.45,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '0.95rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.nome}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.75rem', flexShrink: 0,
                color: d.saldo_atual <= 0 ? 'var(--status-neg)' : 'var(--status-pos)',
              }}>
                saldo {d.saldo_atual}
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>
              {d.artista} | prod. {d.total_produzido} | vend. {d.total_vendido}
            </div>
          </Link>
        ))
      )}
    </div>
  )
}
