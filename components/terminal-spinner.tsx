'use client'

import { useEffect, useState } from 'react'

const FRAMES = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏']

export function TerminalSpinner({ size = 14 }: { size?: number }) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % FRAMES.length), 80)
    return () => clearInterval(id)
  }, [])

  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: size,
      color: 'var(--cyan)',
      display: 'inline-block',
      width: '1em',
      lineHeight: 1,
    }}>
      {FRAMES[frame]}
    </span>
  )
}
