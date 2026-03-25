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
      <body>
        <div className="app-shell">
          <aside className="sidebar">
            <div className="sidebar-logo">Radiant</div>
            <nav className="sidebar-nav">
              <Link href="/" className="nav-link">
                <span aria-hidden="true" style={{ marginRight: '0.5rem', fontWeight: 600 }}>☰</span>
                home
              </Link>
              <div className="sidebar-separator" />
              <Link href="/agenda" className="nav-link">calendário</Link>
              <Link href="/shows" className="nav-link">agenda</Link>
              <div className="sidebar-separator" />
              <Link href="/artistas" className="nav-link">artistas</Link>
              <Link href="/publicos" className="nav-link">públicos</Link>
              <div className="sidebar-separator" />
              <Link href="/locais" className="nav-link">locais</Link>
              <div className="sidebar-separator" />
              <Link href="/ohara" className="nav-link" style={{ opacity: 0.6, fontStyle: 'italic' }}>⟳ ohara</Link>
            </nav>
            <div className="sidebar-version">v0.1.0</div>
          </aside>
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  )
}