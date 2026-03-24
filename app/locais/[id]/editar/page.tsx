import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { EditVenueClient } from './edit_venue_client'

export default async function EditVenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: venue, error } = await (supabase as any)
    .from('venues')
    .select('id, nome, cidade, capacidade_praticavel, risco_fiscalizacao')
    .eq('id', id)
    .single()

  if (error || !venue) notFound()

  return <EditVenueClient venue={venue} />
}