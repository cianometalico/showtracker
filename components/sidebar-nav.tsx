'use client'

import Link from 'next/link'

export function SidebarNav() {
  return (
    <nav className="sidebar-nav">
      <Link href="/" className="nav-link">
        <span className="nav-glyph">☰</span> home
      </Link>
      <div className="sidebar-separator" />
      <Link href="/shows" className="nav-link">
        <span className="nav-glyph">☷</span> shows
      </Link>
      <div className="sidebar-separator" />
      <Link href="/artistas" className="nav-link">
        <span className="nav-glyph">☴</span> artistas
      </Link>
      <Link href="/publicos" className="nav-link">
        <span className="nav-glyph">☵</span> públicos
      </Link>
      <div className="sidebar-separator" />
      <Link href="/locais" className="nav-link">
        <span className="nav-glyph">☶</span> locais
      </Link>
      <Link href="/estoque" className="nav-link">
        <span className="nav-glyph">☱</span> estoque
      </Link>
      <div className="sidebar-separator" />
      <Link href="/dados" className="nav-link" style={{ opacity: 0.7 }}>
        <span className="nav-glyph">⊞</span> dados
      </Link>
    </nav>
  )
}
