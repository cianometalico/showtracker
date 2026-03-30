import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

function riscoColor(risco: string): string {
  switch (risco) {
    case 'low':    return 'var(--status-pos)'
    case 'medium': return 'var(--status-neut)'
    case 'high':   return 'var(--status-neg)'
    default:       return 'var(--text-muted)'
  }
}

export default async function LocaisPage() {
  const supabase = await createClient()

  const { data: rows } = await (supabase as any)
    .from('venues')
    .select('id, nome, cidade, bairro, capacidade_praticavel, zona_risco, risco_fiscalizacao')
    .order('nome', { ascending: true })

  const { data: showRows } = await (supabase as any)
    .from('shows')
    .select('venue_id')

  const showCount: Record<string, number> = {}
  for (const s of (showRows ?? [])) {
    if (s.venue_id) showCount[s.venue_id] = (showCount[s.venue_id] ?? 0) + 1
  }

  const venues = (rows ?? []).map((v: any) => ({
    ...v,
    total_shows: showCount[v.id] ?? 0,
  }))

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--text)', margin: 0 }}>Locais</h1>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{venues.length} cadastrados</span>
      </div>

      <div>
        {venues.length === 0 && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', padding: '2rem 0' }}>
            Nenhum local cadastrado.
          </p>
        )}
        {venues.map((v: any) => (
          <Link key={v.id} href={`/locais/${v.id}`} style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
            padding: '0.6rem 0', borderBottom: '1px solid var(--border)',
            textDecoration: 'none',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: 'var(--font-serif)', fontSize: '0.95rem', color: 'var(--text)',
                margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {v.nome}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                <span>{v.bairro ? `${v.bairro} · ${v.cidade ?? ''}` : (v.cidade ?? '—')}</span>
                {v.capacidade_praticavel && (
                  <>
                    <span style={{ margin: '0 5px', opacity: 0.4 }}>|</span>
                    <span>cap. {v.capacidade_praticavel.toLocaleString('pt-BR')}</span>
                  </>
                )}
                {v.risco_fiscalizacao && (
                  <>
                    <span style={{ margin: '0 5px', opacity: 0.4 }}>|</span>
                    <span style={{ color: riscoColor(v.risco_fiscalizacao) }}>{v.risco_fiscalizacao}</span>
                  </>
                )}
              </div>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0, paddingTop: 2 }}>
              {v.total_shows > 0 ? `${v.total_shows} shows` : '—'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}