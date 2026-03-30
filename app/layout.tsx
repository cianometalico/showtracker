import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { WeatherBar } from '@/components/weather-bar'
import type { WeatherData } from '@/components/weather-bar'
import { Nav } from '@/components/nav'
import { OharaSearch } from '@/components/ohara-search'

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* header: logo + OharaSearch + clima */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Suspense fallback={null}>
              <OharaSearch />
            </Suspense>
            {weather && <WeatherBar weather={weather} />}
          </div>
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
