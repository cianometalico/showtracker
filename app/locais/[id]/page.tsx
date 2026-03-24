import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const LABEL_RESULTADO: Record<string, string> = {
  sucesso_total: 'Sucesso Total',
  sucesso:       'Sucesso',
  medio:         'Médio',
  fracasso:      'Fracasso',
}

const COR_RESULTADO: Record<string, string> = {
  sucesso_total: 'var(--green)',
  sucesso:       'var(--green)',
  medio:         'var(--amber)',
  fracasso:      'var(--red)',
}

const LABEL_STATUS: Record<string, string> = {
  'sold out':    'Sold Out',
  'bem vendido': 'Bem Vendido',
  'mal vendido': 'Mal Vendido',
}

const RISCO_COR: Record<string, string> = {
  low:    'var(--green)',
  medium: 'var(--amber)',
  high:   'var(--red)',
}

export default async function VenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: venue, error } = await (supabase as any)
    .from('venues')
    .select('id, nome, cidade, lat, lng, capacidade_praticavel, tipo_default, zona_risco, risco_fiscalizacao')
    .eq('id', id)
    .single()

  if (error || !venue) notFound()

  const { data: showRows } = await (supabase as any)
    .from('shows')
    .select('id, data, nome_evento, status_ingresso, participou, resultado_geral')
    .eq('venue_id', id)
    .order('data', { ascending: false })

  const shows = (showRows ?? []) as any[]
  const showIds = shows.map((s: any) => s.id)

  let artistsByShow: Record<string, string[]> = {}
  if (showIds.length > 0) {
    const { data: saRows } = await (supabase as any)
      .from('show_artists')
      .select('show_id, artist_id')
      .in('show_id', showIds)

    const artistIds = [...new Set(((saRows ?? []) as any[]).map((sa: any) => sa.artist_id))]
    if (artistIds.length > 0) {
      const { data: artistRows } = await (supabase as any)
        .from('artists')
        .select('id, nome')
        .in('id', artistIds)

      const artistMap: Record<string, string> = {}
      for (const a of (artistRows ?? []) as any[]) artistMap[a.id] = a.nome

      for (const sa of (saRows ?? []) as any[]) {
        if (!artistsByShow[sa.show_id]) artistsByShow[sa.show_id] = []
        artistsByShow[sa.show_id].push(artistMap[sa.artist_id] ?? '?')
      }
    }
  }

  const showsEnriquecidos = shows.map((s: any) => ({
    ...s,
    artistas: artistsByShow[s.id] ?? [],
  }))

  const participados = showsEnriquecidos.filter((s: any) => s.participou)
  const sucessos     = participados.filter((s: any) => ['sucesso', 'sucesso_total'].includes(s.resultado_geral))
  const taxaSucesso  = participados.length > 0 ? Math.round((sucessos.length / participados.length) * 100) : null

  return (
    <div style={{ padding: '1.5rem', maxWidth: 680 }}>

      <Link href="/locais" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textDecoration: 'none' }}>
        ← Locais
      </Link>

      <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{venue.nome}</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 4 }}>{venue.cidade ?? '—'}</p>
      </div>

<div style={{ marginTop: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
<div>
  <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{venue.nome}</h1>
  <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 4 }}>{venue.cidade ?? '—'}</p>
</div>
<Link href={`/locais/${id}/editar`} style={{
  fontSize: '0.78rem', color: 'var(--text-dim)', textDecoration: 'none',
  border: '1px solid var(--border)', padding: '0.3rem 0.75rem',
  borderRadius: 4, background: 'var(--surface-2)', flexShrink: 0,
}}>
  Editar local
</Link>
</div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Shows',        value: String(shows.length) },
          { label: 'Participei',   value: String(participados.length) },
          { label: 'Taxa sucesso', value: taxaSucesso !== null ? `${taxaSucesso}%` : '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            border: '1px solid var(--border)', borderRadius: 6,
            padding: '0.6rem 0.9rem', background: 'var(--surface)', minWidth: 100,
          }}>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{label}</p>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', margin: '2px 0 0' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Info do venue */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '1rem', background: 'var(--surface)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Capacidade</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text)', margin: '2px 0 0' }}>
              {venue.capacidade_praticavel ? venue.capacidade_praticavel.toLocaleString('pt-BR') : '—'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Tipo</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text)', margin: '2px 0 0' }}>{venue.tipo_default ?? '—'}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Zona de risco</p>
            <p style={{ fontSize: '0.9rem', color: venue.zona_risco ? 'var(--red)' : 'var(--text-dim)', margin: '2px 0 0' }}>
              {venue.zona_risco ? 'Sim' : 'Não'}
            </p>
          </div>
          {venue.risco_fiscalizacao && (
            <div>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Fiscalização</p>
              <p style={{ fontSize: '0.9rem', color: RISCO_COR[venue.risco_fiscalizacao] ?? 'var(--text)', margin: '2px 0 0' }}>
                {venue.risco_fiscalizacao}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Histórico de shows */}
      <div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Histórico de shows
        </p>
        {showsEnriquecidos.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Nenhum show neste local.</p>
        ) : (
          <div>
            {showsEnriquecidos.map((s: any) => {
              const past = new Date(s.data + 'T23:59:59') < new Date()
              const nome = s.nome_evento ?? s.artistas.join(' / ') ?? '—'
              return (
                <Link key={s.id} href={`/shows/${s.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.5rem 0', borderBottom: '1px solid var(--border)',
                  textDecoration: 'none',
                  opacity: past && !s.participou ? 0.3 : past ? 0.6 : 1,
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: 90, flexShrink: 0, fontFamily: 'monospace' }}>
                    {new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nome}
                  </span>
                  <span style={{
                    fontSize: '0.75rem', flexShrink: 0,
                    color: s.resultado_geral ? COR_RESULTADO[s.resultado_geral] ?? 'var(--text-dim)' : 'var(--text-dim)',
                  }}>
                    {s.resultado_geral
                      ? LABEL_RESULTADO[s.resultado_geral] ?? s.resultado_geral
                      : LABEL_STATUS[s.status_ingresso] ?? s.status_ingresso ?? '—'}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
    
  )
}