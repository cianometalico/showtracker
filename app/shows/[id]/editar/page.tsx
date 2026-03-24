import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { EditShowClient } from './edit-show-client'

export default async function EditShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: show, error } = await (supabase as any)
    .from('shows')
    .select('id, data, nome_evento, status_ingresso, concorrencia, clima_estimado, resultado_geral, participou, observacoes, venue_id')
    .eq('id', id)
    .single()

  if (error || !show) notFound()

  let venue = null
  if (show.venue_id) {
    const { data: v } = await (supabase as any)
      .from('venues').select('id, nome, cidade').eq('id', show.venue_id).single()
    venue = v ?? null
  }

  const { data: saRows } = await (supabase as any)
    .from('show_artists')
    .select('artist_id, ordem, artists(id, nome)')
    .eq('show_id', id)
    .order('ordem', { ascending: true })

  const lineup = (saRows ?? []).map((sa: any) => ({
    artist_id: sa.artist_id,
    nome:      (Array.isArray(sa.artists) ? sa.artists[0] : sa.artists)?.nome ?? '—',
    ordem:     sa.ordem,
  }))

  return <EditShowClient show={show} venue={venue} lineup={lineup} />
}