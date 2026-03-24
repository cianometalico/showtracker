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
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <aside style={{
            width: 164,
            flexShrink: 0,
            background: 'var(--nav-bg)',
            borderRight: '1px solid var(--nav-border)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Logo */}
            <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--nav-border)' }}>
              <span style={{
                fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 700,
                letterSpacing: '0.15em', textTransform: 'uppercase' as const,
                color: 'var(--text)',
              }}>
                Radiant
              </span>
            </div>

            <nav style={{ padding: '0.5rem 0', flex: 1 }}>

              {/* Home */}
              <Link href="/" className="nav-link" aria-label="Página inicial">
                <span aria-hidden="true" style={{ marginRight: '0.5rem', fontWeight: 600 }}>☰</span>
                home
              </Link>

              {/* Separador */}
              <div style={{ margin: '0.4rem 1rem', borderTop: '1px solid var(--nav-border)', opacity: 0.5 }} />

              {/* Calendário + Agenda */}
              <Link href="/agenda" className="nav-link">calendário</Link>
              <Link href="/shows" className="nav-link">agenda</Link>

              {/* Separador */}
              <div style={{ margin: '0.4rem 1rem', borderTop: '1px solid var(--nav-border)', opacity: 0.5 }} />

              {/* Artistas/Bandas + Públicos */}
              <Link href="/artistas" className="nav-link">artistas</Link>
              <Link href="/publicos" className="nav-link">públicos</Link>

              {/* Separador */}
              <div style={{ margin: '0.4rem 1rem', borderTop: '1px solid var(--nav-border)', opacity: 0.5 }} />

              {/* Locais */}
              <Link href="/locais" className="nav-link">locais</Link>

              {/* Separador */}
              <div style={{ margin: '0.4rem 1rem', borderTop: '1px solid var(--nav-border)', opacity: 0.5 }} />

              {/* Ohara — destaque visual diferente */}
              <Link href="/ohara" className="nav-link" style={{ opacity: 0.6, fontStyle: 'italic' }}>
                ⟳ ohara
              </Link>

            </nav>

            <div style={{
              padding: '1rem',
              borderTop: '1px solid var(--nav-border)',
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
              fontFamily: 'monospace',
              letterSpacing: '0.05em',
            }}>
              v0.1.0
            </div>
          </aside>

          <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}