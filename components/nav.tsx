'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { NAV_ITEMS } from './nav-items'
import type { NavItem } from './nav-items'
import {
  IconHome, IconShows, IconArtistas, IconEstoque,
  IconLocais, IconPublicos, IconAgenda, IconMais,
} from './nav-icons'

const ICONS: Record<string, React.FC> = {
  '/':         IconHome,
  '/shows':    IconShows,
  '/artistas': IconArtistas,
  '/estoque':  IconEstoque,
  '/locais':   IconLocais,
  '/publicos': IconPublicos,
  '/agenda':   IconAgenda,
}

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const pathname = usePathname()
  const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  const Icon = ICONS[item.href]

  return (
    <Link
      href={item.href}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: '6px 12px',
        textDecoration: 'none',
        color: active ? 'var(--cyan)' : 'var(--text-muted)',
        position: 'relative',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.65rem',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        transition: 'color 0.15s',
      }}
    >
      {Icon && <Icon />}
      {item.label}
      {active && (
        <span style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 12,
          height: 2,
          background: 'var(--cyan)',
          borderRadius: 1,
        }} />
      )}
    </Link>
  )
}

export function Nav() {
  const [maisOpen, setMaisOpen] = useState(false)
  const maisRef = useRef<HTMLDivElement>(null)

  const primary   = NAV_ITEMS.filter(i => i.priority === 'primary')
  const secondary = NAV_ITEMS.filter(i => i.priority === 'secondary')

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (maisRef.current && !maisRef.current.contains(e.target as Node)) {
        setMaisOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <>
      {/* DESKTOP: barra horizontal abaixo do header */}
      <nav className="nav-desktop">
        {NAV_ITEMS.map(item => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* MOBILE: bottom bar fixa */}
      <nav className="nav-mobile">
        {primary.map(item => (
          <NavLink key={item.href} item={item} />
        ))}

        <div ref={maisRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMaisOpen(v => !v)}
            className="nav-mais-btn"
            style={{
              color: maisOpen ? 'var(--cyan)' : 'var(--text-muted)',
            }}
          >
            <IconMais />
            MAIS
          </button>

          {maisOpen && (
            <div className="nav-popover">
              {secondary.map(item => {
                const Icon = ICONS[item.href]
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMaisOpen(false)}
                    className="nav-popover-link"
                  >
                    {Icon && <Icon />}
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </nav>
    </>
  )
}
