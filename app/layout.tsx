'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import './globals.css'

const TREE = [
  { id: 'home', label: '🏠 Home', path: '/' },
  {
    id: 'database', label: '🗄️ Database', path: null,
    children: [
      { id: 'artists', label: '🎸 Artistas', path: '/artists' },
      { id: 'venues', label: '📍 Locais', path: '/venues' },
      { id: 'imports', label: '📥 Importações', path: '/dados' },
      { id: 'exports', label: '📤 Exportações', path: '/exportacoes' },
    ]
  },
  { id: 'eventos', label: '📅 Eventos', path: '/agenda' },
  { id: 'estoque', label: '🧾 Estoque', path: '/estoque' },
  { id: 'inventario', label: '⚔️ Inventário', path: '/inventario' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [expanded, setExpanded] = useState<string[]>(['database'])
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  function isActive(path: string | null) {
    if (!path) return false
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  function getBreadcrumb() {
    for (const item of TREE) {
      if (item.path && isActive(item.path)) return item.label.replace(/\p{Emoji}/gu, '').trim()
      if ('children' in item && item.children) {
        for (const child of item.children) {
          if (child.path && isActive(child.path)) {
            return `${item.label.replace(/\p{Emoji}/gu, '').trim()} › ${child.label.replace(/\p{Emoji}/gu, '').trim()}`
          }
        }
      }
    }
    if (pathname.startsWith('/shows/')) return 'Eventos › Detalhe'
    return 'ShowTracker'
  }

  function getStatusLeft() {
    if (pathname === '/artists') return '🎸 Artistas cadastrados'
    if (pathname === '/venues') return '📍 Locais cadastrados'
    if (pathname === '/agenda') return '📅 Agenda de eventos'
    if (pathname === '/estoque') return '🧾 Controle de estoque'
    if (pathname === '/inventario') return '⚔️ Inventário de produção'
    if (pathname === '/dados') return '💾 Importações e exportações'
    if (pathname === '/') return '🏠 Painel principal'
    if (pathname.startsWith('/shows/')) return '🎵 Detalhes do evento'
    return 'ShowTracker'
  }

  return (
    <html lang="pt-BR">
      <body style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#c0c0c0' }}>

        {/* HEADER */}
        <div className="raised" style={{ background: '#c0c0c0', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontWeight: 'bold', fontSize: '13px', letterSpacing: '-0.02em' }}>🎵 ShowTracker</span>
          <div style={{ width: '1px', height: '20px', borderLeft: '1px solid #808080', borderRight: '1px solid #fff', margin: '0 4px' }} />
          <button className="win-btn" onClick={() => router.back()} style={{ minWidth: 'auto', padding: '2px 8px' }}>◀</button>
          <button className="win-btn" onClick={() => router.forward()} style={{ minWidth: 'auto', padding: '2px 8px' }}>▶</button>
          <button className="win-btn" onClick={() => router.refresh()} style={{ minWidth: 'auto', padding: '2px 8px' }}>↻</button>
          <div style={{ width: '1px', height: '20px', borderLeft: '1px solid #808080', borderRight: '1px solid #fff', margin: '0 4px' }} />
          <div className="sunken" style={{ flex: 1, padding: '2px 6px', fontSize: '11px', background: '#fff' }}>
            📁 ShowTracker › {getBreadcrumb()}
          </div>
          <div style={{ width: '1px', height: '20px', borderLeft: '1px solid #808080', borderRight: '1px solid #fff', margin: '0 4px' }} />
          <button className="win-btn win-btn-primary" onClick={() => router.push('/shows/novo')} style={{ whiteSpace: 'nowrap' }}>
            + Novo Evento
          </button>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* SIDEBAR */}
          <div className="sunken" style={{ width: '190px', flexShrink: 0, background: '#fff', overflowY: 'auto', borderRight: 'none' }}>
            {TREE.map(item => (
              <div key={item.id}>
                <div
                  className={`win-tree-item ${item.path && isActive(item.path) ? 'active' : ''}`}
                  onClick={() => {
                    if ('children' in item && item.children) {
                      setExpanded(prev => prev.includes(item.id) ? prev.filter(x => x !== item.id) : [...prev, item.id])
                    }
                    if (item.path) router.push(item.path)
                  }}
                >
                  {'children' in item && item.children ? (
                    <span style={{ fontSize: '9px', width: '12px', display: 'inline-block', flexShrink: 0 }}>
                      {expanded.includes(item.id) ? '▼' : '▶'}
                    </span>
                  ) : (
                    <span style={{ width: '12px', display: 'inline-block', flexShrink: 0 }} />
                  )}
                  <span>{item.label}</span>
                </div>
                {'children' in item && item.children && expanded.includes(item.id) && item.children.map(child => (
                  <div
                    key={child.id}
                    className={`win-tree-item win-tree-child ${child.path && isActive(child.path) ? 'active' : ''}`}
                    onClick={() => child.path && router.push(child.path)}
                  >
                    <span style={{ width: '12px', display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ width: '12px', display: 'inline-block', flexShrink: 0 }} />
                    <span>{child.label}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* CONTENT */}
          <div className="sunken" style={{ flex: 1, background: '#fff', overflowY: 'auto', padding: '12px' }}>
            {children}
          </div>
        </div>

        {/* STATUSBAR */}
        <div className="raised" style={{ background: '#c0c0c0', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '0', fontSize: '11px', flexShrink: 0 }}>
          <div className="sunken" style={{ padding: '1px 8px', marginRight: '4px', minWidth: '200px' }}>
            {getStatusLeft()}
          </div>
          <div className="sunken" style={{ padding: '1px 8px', marginRight: '4px' }}>
            <span style={{ color: '#2B5BE0', fontWeight: 'bold' }}>● Supabase Connected</span>
          </div>
          <div className="sunken" style={{ padding: '1px 8px', marginRight: '4px' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
          <div className="sunken" style={{ padding: '1px 8px', marginLeft: 'auto' }}>
            {time}
          </div>
        </div>

      </body>
    </html>
  )
}