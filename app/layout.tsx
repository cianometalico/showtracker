import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ShowTracker',
  description: 'Sistema de previsão de vendas em shows',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.className} bg-zinc-950 text-zinc-100 min-h-screen`}>
        <nav className="border-b border-zinc-800 px-6 py-4 flex gap-6 text-sm font-medium">
          <span className="text-white font-bold tracking-tight mr-4">ShowTracker</span>
          <Link href="/agenda" className="text-zinc-400 hover:text-white transition-colors">Agenda</Link>
          <Link href="/artists" className="text-zinc-400 hover:text-white transition-colors">Artistas</Link>
          <Link href="/venues" className="text-zinc-400 hover:text-white transition-colors">Locais</Link>
        </nav>
        <main className="px-6 py-8 max-w-6xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  )
}