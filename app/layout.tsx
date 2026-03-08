import type { Metadata } from 'next'
import { Playfair_Display, Inter, Public_Sans } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import { cn } from "@/lib/utils";

const publicSans = Public_Sans({subsets:['latin'],variable:'--font-sans'});

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'ShowTracker',
  description: 'Sistema de previsão de vendas em shows',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={cn("font-sans", publicSans.variable)}>
      <body className={`${playfair.variable} ${inter.variable}`}>
        <nav style={{
          background: 'rgba(17,16,16,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }} className="sticky top-0 z-50 px-6 py-3 flex items-center gap-2">
          <span style={{ fontFamily: 'var(--font-playfair)', color: '#F0EBE0' }}
            className="font-bold text-lg mr-8">ShowTracker</span>
          <NavLink href="/agenda"  color="#C9A84C">Agenda</NavLink>
          <NavLink href="/artists" color="#C9A84C">Artistas</NavLink>
          <NavLink href="/venues"  color="#8DB596">Locais</NavLink>
          <NavLink href="/dados"   color="#6A6055">Dados</NavLink>
          <div className="ml-auto">
            <Link href="/shows/novo" style={{
              background: 'rgba(201,168,76,0.12)',
              border: '1px solid rgba(201,168,76,0.25)',
              color: '#C9A84C',
              borderRadius: '8px',
              padding: '5px 14px',
              fontSize: '0.78rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }} className="hover:opacity-75 transition-opacity">
              + NOVO SHOW
            </Link>
          </div>
        </nav>
        <main className="px-4 md:px-8 py-8 max-w-6xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  )
}

function NavLink({ href, color, children }: { href: string; color: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{ color }}
      className="text-sm font-medium px-3 py-1.5 rounded-lg hover:opacity-70 transition-opacity">
      {children}
    </Link>
  )
}