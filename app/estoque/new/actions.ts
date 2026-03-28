'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export type CreateDesignInput = {
  nome:      string
  artist_id: string
  descricao: string | null
  ativo:     boolean
}

export async function createDesign(input: CreateDesignInput): Promise<void> {
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('designs')
    .insert({
      nome:      input.nome,
      artist_id: input.artist_id,
      descricao: input.descricao,
      ativo:     input.ativo,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Erro ao criar design')
  redirect(`/estoque/${(data as any).id}`)
}
