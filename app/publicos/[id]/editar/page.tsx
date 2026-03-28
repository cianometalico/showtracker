import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { NichoFormClient } from '../../nicho-form-client'
import { updateNicho } from '../actions'

export default async function EditarNichoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: nicho, error } = await (supabase as any)
    .from('nichos')
    .select(`
      id, nome, underground_score,
      coesao, identidade_visual, maturidade,
      letramento, receptividade_autoral, commodificacao, energia,
      geracao, faixa_etaria, estetica, cor_dominante,
      fator_compra, concorrencia_merch, abertura_experimental, tipo_nostalgia,
      descricao, tags
    `)
    .eq('id', id)
    .single()

  if (error || !nicho) notFound()

  const action = updateNicho.bind(null, id)

  return (
    <div style={{ padding: '1.5rem', maxWidth: 700 }}>
      <Link href={`/publicos/${id}`} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
        ← {nicho.nome}
      </Link>

      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', margin: '1.25rem 0 2rem', letterSpacing: '-0.01em' }}>
        editar nicho
      </h1>

      <NichoFormClient
        initialData={{
          nome: nicho.nome,
          underground_score: nicho.underground_score ?? 5,
          coesao: nicho.coesao,
          identidade_visual: nicho.identidade_visual,
          maturidade: nicho.maturidade,
          letramento: nicho.letramento,
          receptividade_autoral: nicho.receptividade_autoral,
          commodificacao: nicho.commodificacao,
          energia: nicho.energia,
          geracao: nicho.geracao ?? [],
          faixa_etaria: nicho.faixa_etaria,
          estetica: nicho.estetica ?? [],
          cor_dominante: nicho.cor_dominante ?? [],
          fator_compra: nicho.fator_compra ?? [],
          concorrencia_merch: nicho.concorrencia_merch,
          abertura_experimental: nicho.abertura_experimental,
          tipo_nostalgia: nicho.tipo_nostalgia ?? [],
          descricao: nicho.descricao,
          tags: Array.isArray(nicho.tags) ? nicho.tags : [],
        }}
        action={action}
      />
    </div>
  )
}
