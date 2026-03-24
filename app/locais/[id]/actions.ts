'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export type UpdateVenueInput = {
  nome:                  string
  cidade:                string
  capacidade_praticavel: number | null
  risco_fiscalizacao:    string | null
  lat:                   number | null
  lng:                   number | null
}

export async function updateVenue(id: string, input: UpdateVenueInput): Promise<void> {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('venues')
    .update({
      nome:                  input.nome,
      cidade:                input.cidade,
      capacidade_praticavel: input.capacidade_praticavel,
      risco_fiscalizacao:    input.risco_fiscalizacao || null,
      lat:                   input.lat,
      lng:                   input.lng,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  redirect(`/locais/${id}`)
}

export async function deleteVenue(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await (supabase as any).from('venues').delete().eq('id', id)
  if (error) throw new Error(error.message)
  redirect('/locais')
}