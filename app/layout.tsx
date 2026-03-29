import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { WeatherBar } from '@/components/weather-bar'
import type { WeatherData } from '@/components/weather-bar'
import { SidebarNav } from '@/components/sidebar-nav'
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
        <div className="app-shell">
          <aside className="sidebar">
            <div className="sidebar-logo">
              <div className="sidebar-logo-text">R̦adiant</div>
            </div>
            <SidebarNav />
            <div className="sidebar-version">v0.6.0</div>
          </aside>
          <main className="main-content">
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '0.5rem 1.5rem 0', gap: '1rem' }}>
              <Suspense fallback={null}>
                <OharaSearch />
              </Suspense>
              {weather && <WeatherBar weather={weather} />}
            </div>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
