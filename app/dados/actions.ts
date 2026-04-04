'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteArtistOrfao(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  // 1. Verificar que realmente não tem show_artists
  const { data: shows, error: e1 } = await (supabase as any)
    .from('show_artists')
    .select('artist_id')
    .eq('artist_id', id)
    .limit(1)
  if (e1) return { error: e1.message }
  if (shows && shows.length > 0) return { error: 'Artista tem shows vinculados — não é órfão.' }

  // 2. Verificar que não tem designs vinculados
  const { data: designs, error: e2 } = await (supabase as any)
    .from('designs')
    .select('id')
    .eq('artist_id', id)
    .limit(1)
  if (e2) return { error: e2.message }
  if (designs && designs.length > 0) return { error: 'Artista tem designs vinculados — remova os designs primeiro.' }

  // 3. Remover artist_nichos antes de deletar
  await (supabase as any).from('artist_nichos').delete().eq('artist_id', id)
  await (supabase as any).from('artist_similar').delete().eq('artist_id', id)

  // 4. Deletar o artista
  const { error: e3 } = await (supabase as any)
    .from('artists')
    .delete()
    .eq('id', id)
  if (e3) return { error: e3.message }

  revalidatePath('/ohara')
  revalidatePath('/artistas')
  return {}
}
