import { createClient } from '@/utils/supabase/server'
import { NewDesignClient } from './new-design-client'

export default async function NewDesignPage() {
  const supabase = await createClient()
  const { data: artists } = await (supabase as any)
    .from('artists')
    .select('id, nome')
    .order('nome')
    .limit(500)

  return <NewDesignClient artists={(artists ?? []).map((a: any) => ({ id: a.id, nome: a.nome }))} />
}
