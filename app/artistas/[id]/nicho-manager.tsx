'use client'

import { useState, useTransition } from 'react'
import { linkNicho, unlinkNicho } from './actions'

type Nicho = {
  id: string
  nome: string
  cor: string
  underground_score: number
}

type Props = {
  artistId: string
  allNichos: Nicho[]
  linkedNichoIds: string[]
}

export function NichoManager({ artistId, allNichos, linkedNichoIds }: Props) {
  const [linked, setLinked] = useState(new Set(linkedNichoIds))
  const [pending, startT] = useTransition()

  function toggle(nichoId: string) {
    const isLinked = linked.has(nichoId)
    startT(async () => {
      if (isLinked) {
        await unlinkNicho(artistId, nichoId)
        setLinked(prev => { const s = new Set(prev); s.delete(nichoId); return s })
      } else {
        await linkNicho(artistId, nichoId)
        setLinked(prev => new Set([...prev, nichoId]))
      }
    })
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <p className="section-label">Nichos</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {allNichos.map(n => {
          const isLinked = linked.has(n.id)
          return isLinked ? (
  <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    <a href={`/publicos/${n.id}`} style={{
      padding: '0.25rem 0.6rem',
      fontSize: '0.78rem', borderRadius: '4px 0 0 4px',
      border: `1px solid ${n.cor}`, borderRight: 'none',
      background: `${n.cor}22`, color: n.cor,
      textDecoration: 'none',
    }}>
      {n.nome}
    </a>
    <button onClick={() => toggle(n.id)} disabled={pending} style={{
      fontSize: '0.78rem',
      padding: '0.25rem 0.5rem',
      borderRadius: '0 4px 4px 0', cursor: 'pointer',
      border: `1px solid ${n.cor}`,
      background: `${n.cor}22`, color: n.cor,
      opacity: pending ? 0.5 : 1,
      
    }}>✕</button>
  </div>
) : (
  <button key={n.id} onClick={() => toggle(n.id)} disabled={pending} style={{
    padding: '0.25rem 0.75rem', fontSize: '0.78rem',
    borderRadius: 4, cursor: 'pointer',
    border: `1px solid ${n.cor}88`, background: 'transparent',
    color: `${n.cor}66`, opacity: pending ? 0.5 : 1,
    transition: 'all 0.15s',
    
  }}>
    + {n.nome}
  </button>
)
        })}
      </div>
    </div>
  )
}