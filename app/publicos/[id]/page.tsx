import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { nichoColor, nichoColorAlpha } from '@/lib/nicho-color'
import { NichoDeleteButton } from './delete-button-client'
import { NichoArtistasClient } from './nicho-artistas-client'
import { TooltipIcon } from '../tooltip-client'
import { getProximosShowsByNicho, getResultadoMedioByNicho } from '@/lib/db/intelligence'
import { getShowDisplayName } from '@/lib/show-utils'

const TOOLTIPS: Record<string, string> = {
  coesao:                 'existe público ou existem pessoas?',
  identidade_visual:      'dá pra saber o show pela fila?',
  underground_score:      'onde o cluster se posiciona? 1=underground, 10=mainstream',
  maturidade:             'quanto tempo o gênero sedimentou?',
  letramento:             'a estampa pode ser críptica ou precisa ser explícita?',
  receptividade_autoral:  'aceita recombinação na estampa ou quer reprodução fiel?',
  commodificacao:         'quanto merch oficial domina a cena?',
  energia:                'qual a intensidade típica do show?',
  abertura_experimental:  'o público aceita coisa nova ou só o clássico?',
}

export default async function NichoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: nicho, error } = await (supabase as any)
    .from('nichos')
    .select(`
      id, nome, underground_score, descricao, tags,
      coesao, identidade_visual, maturidade,
      letramento, receptividade_autoral, commodificacao, energia,
      geracao, faixa_etaria, estetica, cor_dominante,
      fator_compra, concorrencia_merch, abertura_experimental, tipo_nostalgia
    `)
    .eq('id', id)
    .single()

  if (error || !nicho) notFound()

  const score = nicho.underground_score ?? 5
  const cor   = nichoColor(nicho.nome, score)

  // ── Artistas vinculados (com override fields para agregação) ──
  const { data: artistNichos } = await (supabase as any)
    .from('artist_nichos')
    .select(`
      artist_id, score,
      artists(
        id, nome, mbid, lastfm_listeners, tags_editorial, pais,
        energia, receptividade_autoral, commodificacao, letramento
      )
    `)
    .eq('nicho_id', id)

  const artistas = (artistNichos ?? [])
    .map((an: any) => ({
      ...an,
      artist: Array.isArray(an.artists) ? an.artists[0] : an.artists,
    }))
    .sort((a: any, b: any) => (b.artist?.lastfm_listeners ?? 0) - (a.artist?.lastfm_listeners ?? 0))

  // ── Agregação ponderada dos defaults ─────────────────────────
  const DEFAULTS = ['energia', 'receptividade_autoral', 'commodificacao', 'letramento'] as const
  type DefaultKey = typeof DEFAULTS[number]

  const agregados: Record<DefaultKey, { media: number | null; n: number }> = {
    energia:               { media: null, n: 0 },
    receptividade_autoral: { media: null, n: 0 },
    commodificacao:        { media: null, n: 0 },
    letramento:            { media: null, n: 0 },
  }

  for (const key of DEFAULTS) {
    const com = artistas.filter((a: any) => a.artist?.[key] != null)
    if (com.length === 0) continue
    const totalPeso = com.reduce((s: number, a: any) => s + (a.score ?? 1), 0)
    if (totalPeso === 0) continue
    const soma = com.reduce((s: number, a: any) => s + (a.artist[key] ?? 0) * (a.score ?? 1), 0)
    agregados[key] = { media: Math.round((soma / totalPeso) * 10) / 10, n: com.length }
  }

  // ── Gêneros relacionados via tags ─────────────────────────────
  const tags = (Array.isArray(nicho.tags) ? nicho.tags : []) as string[]

  const { data: generos } = tags.length > 0
    ? await (supabase as any).from('genres').select('id, nome')
    : { data: [] }

  const generosRelacionados = (generos ?? []).filter((g: any) =>
    tags.map((t: string) => t.toLowerCase()).includes(g.nome.toLowerCase())
  )

  // ── Intelligence: próximos shows + resultado médio ───────────
  const [proximosShows, resultadosMedioAll] = await Promise.all([
    getProximosShowsByNicho(id),
    getResultadoMedioByNicho(),
  ])
  const resultadoNicho = resultadosMedioAll.find(r => r.id === id) ?? null

  // ── Dados serializados para o client ─────────────────────────
  const artistasParaClient = artistas.map((a: any) => ({
    artist_id: a.artist_id,
    score: a.score ?? 1,
    nome: a.artist?.nome ?? '—',
    mbid: a.artist?.mbid ?? null,
    lastfm_listeners: a.artist?.lastfm_listeners ?? null,
    topTag: (a.artist?.tags_editorial as string[] | null)?.[0] ?? null,
  }))

  function ScoreBar({ value, max = 5 }: { value: number | null; max?: number }) {
    if (!value) return <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
    return (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
        {value}<span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>/{max}</span>
      </span>
    )
  }

  function Chips({ items }: { items: string[] }) {
    if (!items || items.length === 0) return <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
        {items.map((item) => (
          <span key={item} style={{
            fontSize: '0.72rem', padding: '0.15rem 0.5rem',
            background: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            borderRadius: 2,
            color: 'var(--text-dim)',
          }}>{item}</span>
        ))}
      </div>
    )
  }

  function FieldLabel({ label, tooltipKey }: { label: string; tooltipKey: string }) {
    return (
      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        {label}
        {TOOLTIPS[tooltipKey] && <TooltipIcon text={TOOLTIPS[tooltipKey]} />}
      </span>
    )
  }

  function DefaultField({ label, fieldKey }: { label: string; fieldKey: DefaultKey }) {
    const nicho_val: number | null = nicho[fieldKey]
    const { media, n } = agregados[fieldKey]
    return (
      <div>
        <FieldLabel label={label} tooltipKey={fieldKey} />
        <ScoreBar value={nicho_val} />
        {media !== null && (
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
            artistas ({n}): <span style={{ color: 'var(--text-dim)' }}>{media}</span>
          </span>
        )}
      </div>
    )
  }

  return (
    <div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <Link href="/publicos" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textDecoration: 'none' }}>
          ← públicos
        </Link>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href={`/publicos/${id}/editar`} style={{
            fontSize: '0.75rem', color: 'var(--text-dim)',
            background: 'var(--surface)', border: '1px solid var(--border)',
            padding: '0.2rem 0.65rem', borderRadius: 4, textDecoration: 'none',
          }}>
            editar
          </Link>
          <NichoDeleteButton nichoId={id} />
        </div>
      </div>

      {/* HEADER */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 400, margin: '0 0 6px' }}>
          {nicho.nome}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-dim)', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            underground {score}/10
            <TooltipIcon text={TOOLTIPS.underground_score} />
          </span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span>{artistas.length} artistas</span>
        </div>
        {nicho.descricao && (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', margin: '0.75rem 0 0' }}>
            {nicho.descricao}
          </p>
        )}
      </div>

      {/* CORE */}
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <p style={sectionLabel}>core</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          <div>
            <FieldLabel label="coesão" tooltipKey="coesao" />
            <ScoreBar value={nicho.coesao} />
          </div>
          <div>
            <FieldLabel label="identidade visual" tooltipKey="identidade_visual" />
            <ScoreBar value={nicho.identidade_visual} />
          </div>
          <div>
            <FieldLabel label="maturidade" tooltipKey="maturidade" />
            <ScoreBar value={nicho.maturidade} />
          </div>
        </div>
      </section>

      {/* DEFAULTS */}
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <p style={sectionLabel}>defaults</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
          <DefaultField key="letramento"            label="letramento"            fieldKey="letramento" />
          <DefaultField key="receptividade_autoral" label="receptividade autoral" fieldKey="receptividade_autoral" />
          <DefaultField key="commodificacao"        label="commodificação"        fieldKey="commodificacao" />
          <DefaultField key="energia"               label="energia"               fieldKey="energia" />
        </div>
      </section>

      {/* CORPORALIDADE + MENTALIDADE */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: 'var(--space-lg)' }}>

        <section>
          <p style={sectionLabel}>corporalidade</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <FieldLabel label="geração" tooltipKey="" />
              <Chips items={nicho.geracao ?? []} />
            </div>
            <div>
              <FieldLabel label="faixa etária" tooltipKey="" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{nicho.faixa_etaria ?? '—'}</span>
            </div>
            <div>
              <FieldLabel label="estética" tooltipKey="" />
              <Chips items={nicho.estetica ?? []} />
            </div>
            <div>
              <FieldLabel label="cor dominante" tooltipKey="" />
              <Chips items={nicho.cor_dominante ?? []} />
            </div>
          </div>
        </section>

        <section>
          <p style={sectionLabel}>mentalidade</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <FieldLabel label="fator de compra" tooltipKey="" />
              <Chips items={nicho.fator_compra ?? []} />
            </div>
            <div>
              <FieldLabel label="concorrência merch" tooltipKey="" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{nicho.concorrencia_merch ?? '—'}</span>
            </div>
            <div>
              <FieldLabel label="abertura experimental" tooltipKey="abertura_experimental" />
              <ScoreBar value={nicho.abertura_experimental} />
            </div>
            <div>
              <FieldLabel label="tipo de nostalgia" tooltipKey="" />
              <Chips items={nicho.tipo_nostalgia ?? []} />
            </div>
          </div>
        </section>

      </div>

      {/* GÊNEROS */}
      {(tags.length > 0 || generosRelacionados.length > 0) && (
        <section style={{ marginBottom: 'var(--space-lg)' }}>
          <p style={sectionLabel}>gêneros associados</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {tags.map((t: string) => {
              const match = generosRelacionados.find((g: any) => g.nome.toLowerCase() === t.toLowerCase())
              return match ? (
                <Link key={t} href={`/publicos/generos/${match.id}`} style={{ textDecoration: 'none' }}>
                  <span style={{
                    fontSize: '0.75rem', padding: '0.15rem 0.55rem',
                    background: nichoColorAlpha(nicho.nome, score, 0.15),
                    border: `1px solid ${nichoColorAlpha(nicho.nome, score, 0.4)}`,
                    borderRadius: 4, color: cor,
                  }}>{t}</span>
                </Link>
              ) : (
                <span key={t} style={{
                  fontSize: '0.75rem', padding: '0.15rem 0.55rem',
                  background: nichoColorAlpha(nicho.nome, score, 0.08),
                  border: `1px solid ${nichoColorAlpha(nicho.nome, score, 0.2)}`,
                  borderRadius: 4, color: `${cor}99`,
                }}>{t}</span>
              )
            })}
          </div>
        </section>
      )}

      {/* ARTISTAS — client component com busca + vinculação */}
      <NichoArtistasClient nichoId={id} initialArtistas={artistasParaClient} />

      {/* PRÓXIMOS SHOWS */}
      {proximosShows.length > 0 && (
        <section style={{ marginTop: 'var(--space-xl)', marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-sm)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Próximos shows
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              {proximosShows.length} {proximosShows.length === 1 ? 'show' : 'shows'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {proximosShows.map(s => {
              const nomeShow = getShowDisplayName(s.nome_evento, s.artistas)
              const dataStr  = new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
              return (
                <div key={s.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', minWidth: 0 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', flexShrink: 0 }}>{dataStr}</span>
                      <Link href={`/shows/${s.id}`} style={{ fontFamily: 'var(--font-serif)', fontSize: '0.9rem', color: 'var(--text-primary)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nomeShow}
                      </Link>
                    </div>
                    {s.venue_nome && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', flexShrink: 0 }}>{s.venue_nome}</span>
                    )}
                  </div>
                  {s.artistas.length > 0 && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>
                      {s.artistas.join(' · ')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* HISTÓRICO / RESULTADO MÉDIO */}
      {resultadoNicho && resultadoNicho.total_shows > 0 && (
        <section style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-sm)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Histórico
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              {resultadoNicho.total_shows} {resultadoNicho.total_shows === 1 ? 'show' : 'shows'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {([
              { key: 'sucesso_total', label: 'sucesso total', cor: 'var(--status-pos)' },
              { key: 'sucesso',       label: 'sucesso',       cor: 'var(--status-neut-p)' },
              { key: 'medio',         label: 'médio',         cor: 'var(--status-neut)' },
              { key: 'fracasso',      label: 'fracasso',      cor: 'var(--status-neg)' },
            ] as { key: keyof typeof resultadoNicho.distribuicao; label: string; cor: string }[])
              .filter(r => resultadoNicho.distribuicao[r.key] > 0)
              .map(r => (
                <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: r.cor, minWidth: 100 }}>{r.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>{resultadoNicho.distribuicao[r.key]}</span>
                </div>
              ))
            }
          </div>
        </section>
      )}

    </div>
  )
}

const sectionLabel: React.CSSProperties = {
  fontSize: '0.62rem', color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.1em',
  margin: '0 0 0.75rem',
}
