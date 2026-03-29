import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

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
    <div style={{ padding: '1.5rem', maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Locais</h1>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{venues.length} cadastrados</span>
      </div>

      <div style={{ display: 'flex', gap: '1rem', padding: '0 0.5rem 0.5rem', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flex: 1 }}>Nome</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 130, flexShrink: 0 }}>Bairro · Cidade</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 80, flexShrink: 0, textAlign: 'right' }}>Cap.</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 60, flexShrink: 0, textAlign: 'center' }}>Risco</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 50, flexShrink: 0, textAlign: 'right' }}>Shows</span>
      </div>

      <div>
        {venues.length === 0 && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', padding: '2rem 0.5rem' }}>
            Nenhum local cadastrado.
          </p>
        )}
        {venues.map((v: any) => (
          <Link key={v.id} href={`/locais/${v.id}`} style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            padding: '0.6rem 0.5rem', borderBottom: '1px solid var(--border)',
            textDecoration: 'none',
          }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v.nome}
              </span>
              {v.zona_risco && (
                <span style={{ fontSize: '0.65rem', color: 'var(--red)', border: '1px solid var(--red)', padding: '0 0.3rem', borderRadius: 3, flexShrink: 0 }}>
                  risco
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 130, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {v.bairro ? `${v.bairro} · ${v.cidade ?? ''}` : (v.cidade ?? '—')}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 80, flexShrink: 0, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
              {v.capacidade_praticavel ? v.capacidade_praticavel.toLocaleString('pt-BR') : '—'}
            </span>
            <span style={{ fontSize: '0.75rem', width: 60, flexShrink: 0, textAlign: 'center',
              color: v.risco_fiscalizacao === 'high' ? 'var(--red)' : v.risco_fiscalizacao === 'medium' ? 'var(--amber)' : v.risco_fiscalizacao === 'low' ? 'var(--green)' : 'var(--text-muted)',
            }}>
              {v.risco_fiscalizacao === 'high' ? 'Alto' : v.risco_fiscalizacao === 'medium' ? 'Médio' : v.risco_fiscalizacao === 'low' ? 'Baixo' : '—'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 50, flexShrink: 0, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
              {v.total_shows > 0 ? v.total_shows : '—'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}