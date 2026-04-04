import type { Metadata } from 'next'
import './globals.css'
import { Nav } from '@/components/nav'

export const metadata: Metadata = {
  title: 'Radiant',
  description: 'Sistema operacional para vendas em shows',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* header: logo */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          height: 48,
          borderBottom: '1px solid var(--border)',
          background: 'var(--nav-bg)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 500,
            fontSize: '0.75rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-primary)',
          }}>
            Radiant
          </span>
        </header>

        {/* nav: horizontal (desktop) ou bottom bar (mobile) */}
        <Nav />

        {/* conteúdo */}
        <main style={{
          width: '100%',
          maxWidth: 960,
          margin: '0 auto',
          padding: '24px 16px',
          boxSizing: 'border-box',
        }}>
          {children}
        </main>
      </body>
    </html>
  )
}
