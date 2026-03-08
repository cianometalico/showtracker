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
  participou: boolean
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
  publico_estimado, fiscalizacao, risco_cancelamento, participou,
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
  if (show.resultado_geral === 'Excelente') return '#8DB596'
  if (show.resultado_geral === 'Bom') return 'rgba(141,181,150,0.6)'
  if (show.resultado_geral === 'Razoável') return '#C9A84C'
  if (show.resultado_geral === 'Ruim') return '#CC2200'
  if (!show.participou) return 'rgba(106,96,85,0.5)'
  if (show.fiscalizacao) return 'rgba(204,34,0,0.5)'
  if (show.risco_cancelamento) return 'rgba(201,168,76,0.5)'
  return 'rgba(74,123,224,0.7)'
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
  <div className="win-window">
    <div className="win-titlebar">
      <span>📅 Agenda — Calendário</span>
    </div>
    <div style={{ padding: '8px', background: '#c0c0c0' }}>
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
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 2px' }}>
            <strong>{arg.event.title}</strong>
            {arg.event.extendedProps.venue && (
              <span style={{ opacity: 0.7, marginLeft: 4, fontSize: '10px' }}>{arg.event.extendedProps.venue}</span>
            )}
          </div>
        )}
      />
    </div>
  </div>
)}

      {/* LISTA */}
{view === 'lista' && (
  <div className="win-window">
    <div className="win-titlebar">
      <span>📅 Agenda — Lista</span>
    </div>
    <div style={{ padding: '4px' }}>
      {proximos.length > 0 && (
        <>
          <div style={{ background: '#000080', color: '#ffffff', padding: '2px 8px', fontSize: '11px', fontWeight: 'bold' }}>
            PRÓXIMOS
          </div>
          <table className="win-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Artista</th>
                <th>Local</th>
                <th>Estampa</th>
                <th>Peças</th>
                <th>Público</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {proximos.map(s => {
                const ds = designStatus(s.designs)
                const total = s.pieces?.reduce((acc, p) => acc + p.quantidade, 0) ?? 0
                return (
                  <tr key={s.id} style={{ cursor: 'pointer' }}
                    onClick={() => window.location.href = `/shows/${s.id}`}>
                    <td>{new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td><strong>{s.artists?.nome}</strong></td>
                    <td>{s.venues?.nome}</td>
                    <td className={ds.color === 'text-green-400' ? 'tag-success' : ds.color === 'text-yellow-400' ? 'tag-warning' : 'tag-neutral'}>{ds.label}</td>
                    <td>{total > 0 ? `${total} pç` : '—'}</td>
                    <td>{s.publico_estimado > 0 ? s.publico_estimado.toLocaleString() : '—'}</td>
                    <td>
                      {s.fiscalizacao && <span className="tag-danger">⚠ Fisc</span>}
                      {s.risco_cancelamento && <span className="tag-warning"> ⚠ Cancel</span>}
                      {!s.participou && <span className="tag-neutral"> ∅</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}

      {passados.length > 0 && (
        <>
          <div style={{ background: '#808080', color: '#ffffff', padding: '2px 8px', fontSize: '11px', fontWeight: 'bold', marginTop: '8px' }}>
            HISTÓRICO
          </div>
          <table className="win-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Artista</th>
                <th>Local</th>
                <th>Peças</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {[...passados].reverse().map(s => {
                const total = s.pieces?.reduce((acc, p) => acc + p.quantidade, 0) ?? 0
                return (
                  <tr key={s.id} style={{ cursor: 'pointer' }}
                    onClick={() => window.location.href = `/shows/${s.id}`}>
                    <td>{new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td><strong>{s.artists?.nome}</strong></td>
                    <td>{s.venues?.nome}</td>
                    <td>{total > 0 ? `${total} pç` : '—'}</td>
                    <td className={
                      s.resultado_geral === 'Excelente' ? 'tag-success' :
                      s.resultado_geral === 'Bom' ? 'tag-sage' :
                      s.resultado_geral === 'Razoável' ? 'tag-warning' :
                      s.resultado_geral === 'Ruim' ? 'tag-danger' : 'tag-neutral'
                    }>{s.resultado_geral || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}

      {shows.length === 0 && (
        <div style={{ padding: '32px', textAlign: 'center', color: '#808080' }}>
          Nenhum show cadastrado. Clique em + Novo Show para começar.
        </div>
      )}
    </div>
  </div>
)}
    </div>
  )
}