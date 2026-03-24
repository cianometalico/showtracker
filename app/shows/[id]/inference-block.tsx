// app/shows/[id]/inference-block.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getInferenceForShow } from '@/app/actions/inference_actions'
import { calculateReadinessScore } from '@/lib/readiness'
import type { InferenceResult } from '@/lib/inference'
import type { ReadinessResult } from '@/lib/readiness'

type Props = { showId: string }

const GO_COLOR: Record<string, string> = {
  'GO':      'text-green-600 bg-green-50 border-green-200',
  'CUIDADO': 'text-yellow-600 bg-yellow-50 border-yellow-200',
  'NO-GO':   'text-red-500 bg-red-50 border-red-200',
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-800 tabular-nums">
        {value}
        {sub && <span className="text-gray-400 font-normal ml-1">{sub}</span>}
      </span>
    </div>
  )
}

function LowConfidenceAlert({ readiness, artistId, artistNome }: {
  readiness:  ReadinessResult
  artistId:   string
  artistNome: string
}) {
  const [open, setOpen] = useState(true)
  if (!open) return null

  return (
    <div className="rounded border border-yellow-200 bg-yellow-50 px-4 py-3 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="text-yellow-500 text-sm mt-0.5">⚠</span>
          <div>
            <p className="text-xs font-semibold text-yellow-800 mb-1">
              Dados incompletos — resultado pode ser impreciso
            </p>
            <p className="text-xs text-yellow-700 mb-2">
              Prontidão de <strong>{artistNome}</strong>: {readiness.score}/100
            </p>
            {readiness.blockers.length > 0 && (
              <ul className="space-y-1 mb-2">
                {readiness.blockers.map((b, i) => (
                  <li key={i} className="text-xs text-yellow-700 flex gap-1.5">
                    <span className="text-yellow-400 shrink-0">·</span>
                    <span>
                      <strong>{b.label}</strong>
                      {b.motivo ? ` — ${b.motivo}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/database/artistas/${artistId}`}
              className="text-xs text-yellow-700 underline hover:text-yellow-900">
              Completar dados do artista →
            </Link>
          </div>
        </div>
        <button onClick={() => setOpen(false)}
          className="text-yellow-400 hover:text-yellow-600 text-xs shrink-0 cursor-pointer">
          ✕
        </button>
      </div>
    </div>
  )
}

export function InferenceBlock({ showId }: Props) {
  const [result,    setResult]    = useState<InferenceResult | null>(null)
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null)
  const [artistId,  setArtistId]  = useState('')
  const [artista,   setArtista]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [ran,       setRan]       = useState(false)

  async function rodar() {
    setLoading(true)
    setError(null)
    const res = await getInferenceForShow(showId)
    if (res.ok) {
      setResult(res.data.resultado)
      setArtista(res.data.artista)
      setArtistId(res.data.artist_id)
      if (res.data.artist_readiness_input) {
        setReadiness(calculateReadinessScore(res.data.artist_readiness_input))
      }
    } else {
      setError(res.error)
    }
    setLoading(false)
    setRan(true)
  }

  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Inferência
      </h2>

      {!ran && (
        <button onClick={rodar} disabled={loading}
          className="px-4 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50 cursor-pointer transition-colors">
          {loading ? 'Calculando…' : 'Calcular volume sugerido'}
        </button>
      )}

      {ran && !loading && (
        <button onClick={rodar}
          className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer mb-4 inline-block">
          ↻ Recalcular
        </button>
      )}

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

      {result && (
        <div className="mt-4 space-y-5">

          {readiness?.low_confidence && (
            <LowConfidenceAlert
              readiness={readiness}
              artistId={artistId}
              artistNome={artista}
            />
          )}

          <div className="flex items-center gap-4">
            <div className={`px-3 py-1 rounded border text-sm font-bold ${GO_COLOR[result.go_no_go]}`}>
              {result.go_no_go}
            </div>
            <div>
              <span className="text-3xl font-bold text-gray-900 tabular-nums">
                {result.quantidade_sugerida}
              </span>
              <span className="text-sm text-gray-400 ml-1">peças</span>
            </div>
            <div className="ml-auto text-right">
              <div className="text-xs text-gray-400">Score</div>
              <div className="text-lg font-semibold text-gray-700">{result.score_viabilidade}/100</div>
            </div>
          </div>

          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                result.score_viabilidade >= 60 ? 'bg-green-500' :
                result.score_viabilidade >= 35 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${result.score_viabilidade}%` }}
            />
          </div>

          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Breakdown</p>
            <Row label="Público estimado"    value={`${result.base_publico.toLocaleString('pt-BR')} pessoas`} />
            <Row label="Mult. propensão" value={`×${result.base_propensao.toFixed(2)}`} />
            <Row label="Mult. gênero"        value={`×${result.mult_genero.toFixed(2)}`} />
            <Row label="Mult. ingresso"      value={`×${result.mult_ingresso.toFixed(2)}`} />
            <Row label="Mult. concorrência"  value={`×${result.mult_concorrencia.toFixed(2)}`} />
            {result.penalidade_zona > 0 && (
              <Row label="Penalidade zona vermelha" value={`−${result.penalidade_zona} peças`} />
            )}
            {result.penalidade_chuva > 0 && (
              <Row label="Penalidade chuva"         value={`−${result.penalidade_chuva} peças`} />
            )}
            {result.penalidade_fisc > 0 && (
              <Row label="Penalidade fiscalização"  value={`−${result.penalidade_fisc} peças`} />
            )}
          </div>

          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Financeiro</p>
            <Row label="Receita estimada" value={fmt(result.receita_estimada)} />
            <Row label="Lucro estimado"   value={fmt(result.lucro_estimado)} />
            <Row label="Break-even"       value={`${result.break_even_pecas} peças`} sub="para cobrir custo" />
          </div>

          {result.notas.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Observações</p>
              <ul className="space-y-1">
                {result.notas.map((n, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-2">
                    <span className="text-gray-300 shrink-0">·</span>
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}
    </div>
  )
}