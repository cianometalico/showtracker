'use client'

import { useState } from 'react'
import Link from 'next/link'

type Show = {
  id: string
  data: string
  nome: string
  nome_evento: string | null
  artistas: string[]
  venue: { id: string; nome: string } | null
  status_ingresso: string
  participou: boolean
  resultado_geral: string | null
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function corShow(show: Show) {
  if (show.resultado_geral) {
    switch (show.resultado_geral) {
      case 'sucesso_total': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'sucesso':       return 'bg-green-100 text-green-800 border-green-200'
      case 'medio':         return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'fracasso':      return 'bg-red-100 text-red-800 border-red-200'
    }
  }
  if (!show.participou) return 'bg-gray-100 text-gray-400 border-gray-200'
  switch (show.status_ingresso) {
    case 'sold_out':    return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'ultimo_lote': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'mal_vendido': return 'bg-red-50 text-red-400 border-red-100'
    default:            return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

export function AgendaClient({ shows }: { shows: Show[] }) {
  const hoje     = new Date()
  const [ano,    setAno]   = useState(hoje.getFullYear())
  const [mes,    setMes]   = useState(hoje.getMonth()) // 0-indexed

  const showsByData: Record<string, Show[]> = {}
  for (const s of shows) {
    if (!showsByData[s.data]) showsByData[s.data] = []
    showsByData[s.data].push(s)
  }

  // Grade do mês
  const primeiroDia   = new Date(ano, mes, 1)
  const ultimoDia     = new Date(ano, mes + 1, 0)
  const inicioDaSemana = primeiroDia.getDay() // 0=Dom
  const totalDias     = ultimoDia.getDate()

  // Células: nulls para padding + dias do mês
  const celulas: (number | null)[] = [
    ...Array(inicioDaSemana).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ]
  // Completar até múltiplo de 7
  while (celulas.length % 7 !== 0) celulas.push(null)

  const labelMes = primeiroDia.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const hojeStr  = hoje.toISOString().slice(0, 10)

  function navMes(delta: number) {
    const d = new Date(ano, mes + delta, 1)
    setAno(d.getFullYear())
    setMes(d.getMonth())
  }

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 capitalize">{labelMes}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => { setAno(hoje.getFullYear()); setMes(hoje.getMonth()) }}
            className="px-3 py-1 text-xs text-gray-500 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer">
            Hoje
          </button>
          <button onClick={() => navMes(-1)}
            className="px-2 py-1 text-gray-500 hover:text-gray-900 cursor-pointer text-lg leading-none">‹</button>
          <button onClick={() => navMes(1)}
            className="px-2 py-1 text-gray-500 hover:text-gray-900 cursor-pointer text-lg leading-none">›</button>
          <Link href="/shows/new"
            className="ml-2 px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700">
            + Novo show
          </Link>
        </div>
      </div>

      {/* Cabeçalho dias da semana */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="text-xs text-gray-400 text-center py-1 font-medium">{d}</div>
        ))}
      </div>

      {/* Grade */}
      <div className="grid grid-cols-7 border-l border-t border-gray-200">
        {celulas.map((dia, i) => {
          if (dia === null) {
            return <div key={`pad-${i}`} className="border-r border-b border-gray-200 bg-gray-50 min-h-24" />
          }

          const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
          const isHoje  = dataStr === hojeStr
          const isPast  = dataStr < hojeStr
          const eventos = showsByData[dataStr] ?? []

          return (
            <div key={dataStr}
              className={`border-r border-b border-gray-200 min-h-24 p-1.5 ${isPast && eventos.length === 0 ? 'bg-gray-50' : 'bg-white'}`}>

              {/* Número do dia */}
              <div className={`text-xs font-mono mb-1 w-6 h-6 flex items-center justify-center rounded-full
                ${isHoje ? 'bg-gray-900 text-white font-bold' : isPast ? 'text-gray-300' : 'text-gray-500'}`}>
                {dia}
              </div>

              {/* Shows do dia */}
              <div className="space-y-0.5">
                {eventos.map(show => (
                  <Link key={show.id} href={`/shows/${show.id}`}
                    className={`block text-xs px-1.5 py-0.5 rounded border truncate leading-relaxed hover:opacity-80 transition-opacity ${corShow(show)}`}
                    title={show.nome + (show.venue ? ` · ${show.venue.nome}` : '')}>
                    {show.nome}
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-400 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-50 border border-gray-200 inline-block"/>Não participei</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200 inline-block"/>esgotado</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-50 border border-gray-200 inline-block"/>Intermediário</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200 inline-block"/>Sucesso Total</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-200 inline-block"/>Sucesso</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200 inline-block"/>Médio</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block"/>Fracasso</span>
      </div>
    </div>
  )
}