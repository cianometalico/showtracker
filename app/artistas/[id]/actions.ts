'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function linkNicho(artistId: string, nichoId: string): Promise<void> {
  const supabase = await createClient()
  await (supabase as any)
    .from('artist_nichos')
    .upsert({ artist_id: artistId, nicho_id: nichoId, score: 1.0 }, { onConflict: 'artist_id,nicho_id' })
  revalidatePath(`/artistas/${artistId}`)
}

export async function unlinkNicho(artistId: string, nichoId: string): Promise<void> {
  const supabase = await createClient()
  await (supabase as any)
    .from('artist_nichos')
    .delete()
    .eq('artist_id', artistId)
    .eq('nicho_id', nichoId)
  revalidatePath(`/artistas/${artistId}`)
}