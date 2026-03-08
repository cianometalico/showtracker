import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'ShowTracker',
  description: 'Sistema de previsão de vendas em shows',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {/* TASKBAR */}
        <div style={{
          background: '#c0c0c0',
          borderTop: '2px solid #ffffff',
          borderBottom: '2px solid #808080',
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          position: 'sticky',
          top: 0,
          zIndex: 9999,
        }}>
          {/* START BUTTON */}
          <button className="win-btn" style={{
            background: '#c0c0c0',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
          }}>
            <span style={{ fontSize: '14px' }}>⊞</span> ShowTracker
          </button>

          <div style={{ width: '2px', background: '#808080', height: '28px', margin: '0 4px' }} />

          <NavBtn href="/agenda">📅 Agenda</NavBtn>
          <NavBtn href="/artists">🎸 Artistas</NavBtn>
          <NavBtn href="/venues">📍 Locais</NavBtn>
          <NavBtn href="/dados">💾 Dados</NavBtn>

          <div style={{ marginLeft: 'auto' }}>
            <Link href="/shows/novo" className="win-btn win-btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
              + Novo Show
            </Link>
          </div>
        </div>

        {/* DESKTOP */}
        <div style={{ padding: '16px', minHeight: 'calc(100vh - 36px)' }}>
          {children}
        </div>
      </body>
    </html>
  )
}

function NavBtn({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="win-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
      {children}
    </Link>
  )
}