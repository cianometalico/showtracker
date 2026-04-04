'use client'

import { useState } from 'react'

type Aba = 'brasil' | 'historico' | 'proximos'

type Props = {
  brasilContent:    React.ReactNode | null
  historicoContent: React.ReactNode | null
  proximosContent:  React.ReactNode | null
}

const tabBtn = (active: boolean): React.CSSProperties => ({
  fontFamily:      'var(--font-mono)',
  fontSize:        '0.65rem',
  fontWeight:      500,
  letterSpacing:   '0.1em',
  textTransform:   'uppercase',
  color:           active ? 'var(--accent-structure)' : 'var(--text-muted)',
  background:      'none',
  outline:         'none',
  borderTop:       'none',
  borderLeft:      'none',
  borderRight:     'none',
  borderBottom:    active ? '2px solid var(--accent-structure)' : '2px solid transparent',
  cursor:          'pointer',
  padding:         '0 0 4px 0',
})

export function ArtistTabsClient({ brasilContent, historicoContent, proximosContent }: Props) {
  const defaultAba: Aba = brasilContent ? 'brasil' : 'historico'
  const [aba, setAba] = useState<Aba>(defaultAba)

  return (
    <div>
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem' }}>
        {brasilContent && (
          <button onClick={() => setAba('brasil')} style={tabBtn(aba === 'brasil')}>
            BRASIL
          </button>
        )}
        {historicoContent && (
          <button onClick={() => setAba('historico')} style={tabBtn(aba === 'historico')}>
            HISTÓRICO
          </button>
        )}
        {proximosContent && (
          <button onClick={() => setAba('proximos')} style={tabBtn(aba === 'proximos')}>
            PRÓXIMOS
          </button>
        )}
      </div>
      <div>
        {aba === 'brasil'   && brasilContent}
        {aba === 'historico' && historicoContent}
        {aba === 'proximos' && proximosContent}
      </div>
    </div>
  )
}
