'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type UpdateVenueInput = {
  nome:                  string
  cidade:                string
  bairro:                string | null
  capacidade_praticavel: number | null
  tipo_default:          string | null
  risco_fiscalizacao:    string | null
  lat:                   number | null
  lng:                   number | null
  subprefeitura_id:      string | null
}

export async function updateVenue(id: string, input: UpdateVenueInput): Promise<void> {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('venues')
    .update({
      nome:                  input.nome,
      cidade:                input.cidade,
      bairro:                input.bairro || null,
      capacidade_praticavel: input.capacidade_praticavel,
      tipo_default:          input.tipo_default || null,
      risco_fiscalizacao:    input.risco_fiscalizacao || null,
      lat:                   input.lat,
      lng:                   input.lng,
      subprefeitura_id:      input.subprefeitura_id || null,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  redirect(`/locais/${id}`)
}

export async function updateVenueInline(id: string, input: UpdateVenueInput): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('venues')
    .update({
      nome:                  input.nome,
      cidade:                input.cidade,
      bairro:                input.bairro || null,
      capacidade_praticavel: input.capacidade_praticavel,
      tipo_default:          input.tipo_default || null,
      risco_fiscalizacao:    input.risco_fiscalizacao || null,
      lat:                   input.lat,
      lng:                   input.lng,
      subprefeitura_id:      input.subprefeitura_id || null,
    })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/locais/${id}`)
  revalidatePath('/locais')
  return {}
}

export async function deleteVenue(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await (supabase as any).from('venues').delete().eq('id', id)
  if (error) throw new Error(error.message)
  redirect('/locais')
}