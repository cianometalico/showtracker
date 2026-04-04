// deprecated v0.9.0 — substituído por components/nav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function SidebarNav() {
  const pathname = usePathname()

  function navClass(href: string) {
    const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
    return `nav-link${active ? ' active' : ''}`
  }

  return (
    <nav className="sidebar-nav">
      <Link href="/" className={navClass('/')}>
        <span className="nav-indicator" aria-hidden="true" /> home
      </Link>
      <div className="sidebar-separator" />
      <Link href="/shows" className={navClass('/shows')}>
        <span className="nav-indicator" aria-hidden="true" /> shows
      </Link>
      <div className="sidebar-separator" />
      <Link href="/artistas" className={navClass('/artistas')}>
        <span className="nav-indicator" aria-hidden="true" /> artistas
      </Link>
      <Link href="/publicos" className={navClass('/publicos')}>
        <span className="nav-indicator" aria-hidden="true" /> públicos
      </Link>
      <div className="sidebar-separator" />
      <Link href="/locais" className={navClass('/locais')}>
        <span className="nav-indicator" aria-hidden="true" /> locais
      </Link>
      <Link href="/estoque" className={navClass('/estoque')}>
        <span className="nav-indicator" aria-hidden="true" /> estoque
      </Link>
      <div className="sidebar-separator" />
      <Link href="/ohara" className={navClass('/ohara')} style={{ opacity: 0.7 }}>
        <span className="nav-indicator" aria-hidden="true" /> ohara
      </Link>
    </nav>
  )
}
