'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'

type Show = {
  id: string
  data: string
  resultado_geral: string
  status_ingresso: string
  publico_estimado: number
  fiscalizacao: boolean
  risco_cancelamento: boolean
  artists: { nome: string; genero: string }
  venues: { nome: string; cidade: string }
  designs: { status: string }[]
  pieces: { quantidade: number }[]
}

export default function Agenda() {
  const [shows, setShows] = useState<Show[]>([])
  const [view, setView] = useState<'lista' | 'calendario'>('lista')

  useEffect(() => {
    fetchShows()
  }, [])

  async function fetchShows() {
    const { data } = await supabase
      .from('shows')
      .select(`
        id, data, resultado_geral, status_ingresso,
        publico_estimado, fiscalizacao, risco_cancelamento,
        artists ( nome, genero ),
        venues ( nome, cidade ),
        designs ( status ),
        pieces ( quantidade )
      `)
      .order('data', { ascending: true })
    if (data) setShows(data as unknown as Show[])
  }

  function statusColor(resultado: string) {
    if (resultado === 'Excelente') return 'text-green-400'
    if (resultado === 'Bom') return 'text-emerald-400'
    if (resultado === 'Razoável') return 'text-yellow-400'
    if (resultado === 'Ruim') return 'text-red-400'
    return 'text-zinc-500'
  }

  function designStatus(designs: { status: string }[]) {
    if (!designs || designs.length === 0) return { label: 'Sem estampa', color: 'text-zinc-600' }
    const pronto = designs.every(d => d.status === 'Pronto')
    const gravada = designs.some(d => d.status === 'Tela gravada')
    if (pronto) return { label: 'Pronto', color: 'text-green-400' }
    if (gravada) return { label: 'Tela gravada', color: 'text-yellow-400' }
    return { label: designs[0].status, color: 'text-zinc-400' }
  }

  function eventColor(show: Show) {
    if (show.resultado_geral === 'Excelente') return '#4ade80'
    if (show.resultado_geral === 'Bom') return '#34d399'
    if (show.resultado_geral === 'Razoável') return '#facc15'
    if (show.resultado_geral === 'Ruim') return '#f87171'
    if (show.fiscalizacao) return '#f87171'
    if (show.risco_cancelamento) return '#facc15'
    return '#6366f1'
  }

  const calendarEvents = shows.map(s => ({
    id: s.id,
    title: s.artists?.nome ?? 'Show',
    date: s.data,
    backgroundColor: eventColor(s),
    borderColor: eventColor(s),
    url: `/shows/${s.id}`,
    extendedProps: {
      venue: s.venues?.nome,
      cidade: s.venues?.cidade,
    }
  }))

  const hoje = new Date().toISOString().split('T')[0]
  const proximos = shows.filter(s => s.data >= hoje)
  const passados = shows.filter(s => s.data < hoje)

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-900 rounded-lg p-1 text-sm">
            <button
              onClick={() => setView('lista')}
              className={`px-4 py-1.5 rounded-md transition-colors ${view === 'lista' ? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:text-white'}`}>
              Lista
            </button>
            <button
              onClick={() => setView('calendario')}
              className={`px-4 py-1.5 rounded-md transition-colors ${view === 'calendario' ? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:text-white'}`}>
              Calendário
            </button>
          </div>
          <Link href="/shows/novo"
            className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors">
            + Novo show
          </Link>
        </div>
      </div>

      {/* CALENDÁRIO */}
      {view === 'calendario' && (
        <div className="bg-zinc-900 rounded-xl p-6 calendar-dark">
          <style>{`
            .calendar-dark .fc-theme-standard td,
            .calendar-dark .fc-theme-standard th,
            .calendar-dark .fc-theme-standard .fc-scrollgrid {
              border-color: #27272a;
            }
            .calendar-dark .fc-col-header-cell-cushion,
            .calendar-dark .fc-daygrid-day-number {
              color: #a1a1aa;
              text-decoration: none;
            }
            .calendar-dark .fc-day-today {
              background: #1f1f23 !important;
            }
            .calendar-dark .fc-button {
              background: #3f3f46 !important;
              border-color: #3f3f46 !important;
              color: white !important;
            }
            .calendar-dark .fc-button:hover {
              background: #52525b !important;
            }
            .calendar-dark .fc-button-active {
              background: #52525b !important;
            }
            .calendar-dark .fc-toolbar-title {
              color: white;
              font-size: 1rem;
              font-weight: 600;
            }
            .calendar-dark .fc-event {
              cursor: pointer;
              font-size: 0.75rem;
              padding: 2px 4px;
              border-radius: 4px;
            }
            .calendar-dark .fc-daygrid-day-frame {
              background: transparent;
            }
          `}</style>
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            events={calendarEvents}
            locale="pt-br"
            height="auto"
            eventClick={(info) => {
              info.jsEvent.preventDefault()
              window.location.href = info.event.url
            }}
            eventContent={(arg) => (
              <div className="truncate px-1">
                <span>{arg.event.title}</span>
                {arg.event.extendedProps.venue && (
                  <span className="opacity-70 ml-1 text-xs">{arg.event.extendedProps.venue}</span>
                )}
              </div>
            )}
          />
        </div>
      )}

      {/* LISTA */}
      {view === 'lista' && (
        <>
          {proximos.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Próximos</h2>
              {proximos.map(s => {
                const ds = designStatus(s.designs)
                const total = s.pieces?.reduce((acc, p) => acc + p.quantidade, 0) ?? 0
                return (
                  <Link key={s.id} href={`/shows/${s.id}`}>
                    <div className="bg-zinc-900 hover:bg-zinc-800 rounded-xl px-6 py-4 flex justify-between items-center transition-colors cursor-pointer">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <p className="font-semibold">{s.artists?.nome}</p>
                          <span className="text-xs text-zinc-500">{s.artists?.genero}</span>
                          {s.fiscalizacao && <span className="text-xs bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full">Fiscalização</span>}
                          {s.risco_cancelamento && <span className="text-xs bg-yellow-900/40 text-yellow-400 px-2 py-0.5 rounded-full">Risco cancelamento</span>}
                        </div>
                        <p className="text-sm text-zinc-400">{s.venues?.nome} · {s.venues?.cidade}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm font-medium">{new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                        <p className={`text-xs ${ds.color}`}>{ds.label}</p>
                        <p className="text-xs text-zinc-500">{total > 0 ? `${total} peças` : 'Sem peças'} · {s.publico_estimado?.toLocaleString()} pessoas</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {passados.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Histórico</h2>
              {[...passados].reverse().map(s => {
                const total = s.pieces?.reduce((acc, p) => acc + p.quantidade, 0) ?? 0
                return (
                  <Link key={s.id} href={`/shows/${s.id}`}>
                    <div className="bg-zinc-900/60 hover:bg-zinc-800 rounded-xl px-6 py-4 flex justify-between items-center transition-colors cursor-pointer">
                      <div className="space-y-1">
                        <p className="font-semibold">{s.artists?.nome}</p>
                        <p className="text-sm text-zinc-400">{s.venues?.nome} · {s.venues?.cidade}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm">{new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                        <p className={`text-sm font-semibold ${statusColor(s.resultado_geral)}`}>{s.resultado_geral || 'Sem resultado'}</p>
                        <p className="text-xs text-zinc-500">{total > 0 ? `${total} peças` : '—'}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {shows.length === 0 && (
            <div className="text-center py-20 text-zinc-600">
              <p className="text-lg">Nenhum show cadastrado ainda.</p>
              <p className="text-sm mt-2">Clica em + Novo show para começar.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}