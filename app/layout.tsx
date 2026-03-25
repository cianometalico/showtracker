import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Radiant',
  description: 'Sistema operacional para vendas em shows',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="app-shell">
          <aside className="sidebar">
            <div className="sidebar-logo">
              <div className="sidebar-logo-text">R̦adiant</div>
            </div>
            <nav className="sidebar-nav">
              <Link href="/" className="nav-link">
                <span className="nav-glyph">☰</span> home
              </Link>
              <div className="sidebar-separator" />
              <Link href="/agenda" className="nav-link">
                <span className="nav-glyph">☲</span> calendário
              </Link>
              <Link href="/shows" className="nav-link">
                <span className="nav-glyph">☷</span> agenda
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
              <div className="sidebar-separator" />
              <Link href="/ohara" className="nav-link" style={{ opacity: 0.5, fontStyle: 'italic' }}>
                <span className="nav-glyph">⚗̧</span> ohara
              </Link>
            </nav>
            <div className="sidebar-version">v0.2.0</div>
          </aside>
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  )
}