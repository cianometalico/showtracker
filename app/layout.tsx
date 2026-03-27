import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import { WeatherBar } from '@/components/weather-bar'
import type { WeatherData } from '@/components/weather-bar'

export const metadata: Metadata = {
  title: 'Radiant',
  description: 'Sistema operacional para vendas em shows',
}

async function fetchCurrentWeather(): Promise<WeatherData | null> {
  try {
    const origin = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    const res = await fetch(
      `${origin}/api/weather?mode=current&lat=-23.5505&lng=-46.6333`,
      { next: { revalidate: 1800 } }
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const weather = await fetchCurrentWeather()

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
            <div className="sidebar-version">v0.3.1</div>
          </aside>
          <main className="main-content">
            {weather && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem 1.5rem 0' }}>
                <WeatherBar weather={weather} />
              </div>
            )}
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
