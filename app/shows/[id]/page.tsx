'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Artist = { id: string; nome: string }
type Venue = { id: string; nome: string; capacidade: number; lat: number; lng: number }

type Design = {
  id?: string
  nome: string
  abordagem: string
  cromatismo: string
  tamanho_estampa: string
  status: string
}

type Piece = {
  id?: string
  design_id?: string
  tipo: string
  cor_malha: string
  qualidade_malha: string
  tamanho: string
  quantidade: number
  vendidas: number
  preco_medio: number
}

export default function ShowPage() {
  const { id } = useParams()
  const isNew = id === 'novo'

  const [artists, setArtists] = useState<Artist[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [designs, setDesigns] = useState<Design[]>([])
  const [pieces, setPieces] = useState<Piece[]>([])

  const [form, setForm] = useState({
    artist_id: '',
    venue_id: '',
    data: '',
    status_ingresso: '',
    publico_estimado: 0,
    primeira_vez_brasil: false,
    fiscalizacao: false,
    risco_cancelamento: false,
    concorrentes: '',
    qualidade_concorrencia: 3,
    clima_estimado: '',
    resultado_geral: '',
    observacoes: '',
  })

  const [newDesign, setNewDesign] = useState<Design>({
    nome: '', abordagem: '', cromatismo: '', tamanho_estampa: '', status: ''
  })

  const [newPiece, setNewPiece] = useState<Piece>({
    tipo: '', cor_malha: '', qualidade_malha: '', tamanho: '',
    quantidade: 0, vendidas: 0, preco_medio: 0
  })

  const [clima, setClima] = useState<{
  descricao: string
  temp_min: number
  temp_max: number
  chuva: number
  vento: number
  icone: string
} | null>(null)

async function fetchClima() {
  const venue = venues.find(v => v.id === form.venue_id)
  if (!venue?.lat || !venue?.lng || !form.data) return
  const res = await fetch(`/api/weather?lat=${venue.lat}&lng=${venue.lng}&date=${form.data}`)
  const data = await res.json()
  if (!data.error) setClima(data)
}

  useEffect(() => {
    supabase.from('artists').select('id, nome').order('nome').then(({ data }) => { if (data) setArtists(data) })
    supabase.from('venues').select('id, nome, capacidade, lat, lng').order('nome').then(({ data }) => { if (data) setVenues(data as Venue[]) })
    if (!isNew) fetchShow()
  }, [id])

  async function fetchShow() {
    const { data: show } = await supabase.from('shows').select('*').eq('id', id).single()
    if (show) setForm(show)
    const { data: d } = await supabase.from('designs').select('*').eq('show_id', id)
    if (d) setDesigns(d)
    const { data: p } = await supabase.from('pieces').select('*').eq('show_id', id)
    if (p) setPieces(p)
  }

  // Calcula público estimado automaticamente ao selecionar venue e status
  useEffect(() => {
    const venue = venues.find(v => v.id === form.venue_id)
    if (!venue) return
    const taxas: Record<string, number> = {
      'sold out': 1,
      'último lote': 0.9,
      'lotes intermediários': 0.6,
      'mal vendido': 0.3,
    }
    const taxa = taxas[form.status_ingresso] ?? 0.5
    setForm(f => ({ ...f, publico_estimado: Math.round(venue.capacidade * taxa) }))
  }, [form.venue_id, form.status_ingresso])

  async function handleSaveShow(e: React.FormEvent) {
    e.preventDefault()
    if (isNew) {
      await supabase.from('shows').insert([form])
    } else {
      await supabase.from('shows').update(form).eq('id', id)
    }
    alert('Show salvo!')
  }

  async function handleAddDesign(e: React.FormEvent) {
    e.preventDefault()
    const { data } = await supabase.from('designs').insert([{ ...newDesign, show_id: id }]).select()
    if (data) setDesigns([...designs, data[0]])
    setNewDesign({ nome: '', abordagem: '', cromatismo: '', tamanho_estampa: '', status: '' })
  }

  async function handleAddPiece(e: React.FormEvent) {
    e.preventDefault()
    const { data } = await supabase.from('pieces').insert([{ ...newPiece, show_id: id }]).select()
    if (data) setPieces([...pieces, data[0]])
    setNewPiece({ tipo: '', cor_malha: '', qualidade_malha: '', tamanho: '', quantidade: 0, vendidas: 0, preco_medio: 0 })
  }

  const totalPecas = pieces.reduce((acc, p) => acc + p.quantidade, 0)
  const totalVendidas = pieces.reduce((acc, p) => acc + p.vendidas, 0)

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold">{isNew ? 'Novo Show' : 'Show'}</h1>

      {/* PAINEL DO EVENTO */}
      <form onSubmit={handleSaveShow} className="bg-zinc-900 rounded-xl p-6 space-y-6">
        <h2 className="text-lg font-semibold border-b border-zinc-800 pb-3">Painel do Evento</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Artista</label>
            <select className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
              value={form.artist_id}
              onChange={e => setForm({ ...form, artist_id: e.target.value })}>
              <option value="">Selecionar</option>
              {artists.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Data</label>
            <input type="date" className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
              value={form.data}
              onChange={e => setForm({ ...form, data: e.target.value })} />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Local</label>
            <select className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
              value={form.venue_id}
              onChange={e => setForm({ ...form, venue_id: e.target.value })}>
              <option value="">Selecionar</option>
              {venues.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Status dos Ingressos</label>
            <select className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
              value={form.status_ingresso}
              onChange={e => setForm({ ...form, status_ingresso: e.target.value })}>
              <option value="">Selecionar</option>
              <option>sold out</option>
              <option>último lote</option>
              <option>lotes intermediários</option>
              <option>mal vendido</option>
            </select>
          </div>
        </div>

        <div className="bg-zinc-800 rounded-lg px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-zinc-400">Público estimado</span>
          <span className="text-xl font-bold">{form.publico_estimado.toLocaleString()}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Concorrentes</label>
            <select className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
              value={form.concorrentes}
              onChange={e => setForm({ ...form, concorrentes: e.target.value })}>
              <option value="">Selecionar</option>
              <option>nenhum</option>
              <option>poucos</option>
              <option>moderado</option>
              <option>muitos</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Qualidade da concorrência: {form.qualidade_concorrencia}</label>
            <input type="range" min={1} max={5} value={form.qualidade_concorrencia}
              onChange={e => setForm({ ...form, qualidade_concorrencia: Number(e.target.value) })}
              className="w-full accent-white mt-2" />
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.primeira_vez_brasil}
              onChange={e => setForm({ ...form, primeira_vez_brasil: e.target.checked })}
              className="accent-white" />
            Primeira vez no Brasil
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.fiscalizacao}
              onChange={e => setForm({ ...form, fiscalizacao: e.target.checked })}
              className="accent-white" />
            Fiscalização
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.risco_cancelamento}
              onChange={e => setForm({ ...form, risco_cancelamento: e.target.checked })}
              className="accent-white" />
            Risco de cancelamento
          </label>
        </div>

        <div className="space-y-1 col-span-2">
  <div className="flex justify-between items-center">
    <label className="text-xs text-zinc-400">Clima estimado</label>
    {form.venue_id && form.data && (
      <button type="button" onClick={fetchClima}
        className="text-xs text-zinc-400 hover:text-white transition-colors underline">
        Buscar previsão
      </button>
    )}
  </div>
  {clima ? (
    <div className="bg-zinc-800 rounded-lg px-4 py-3 flex items-center gap-4">
      <img src={`https://openweathermap.org/img/wn/${clima.icone}.png`} className="w-10 h-10" alt="" />
      <div>
        <p className="text-sm font-medium capitalize">{clima.descricao}</p>
        <p className="text-xs text-zinc-400">{clima.temp_min}°C – {clima.temp_max}°C · Vento {clima.vento} km/h {clima.chuva > 0 ? `· Chuva ${clima.chuva}mm` : ''}</p>
      </div>
    </div>
  ) : (
    <input className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
      placeholder="Selecione local e data para buscar automaticamente"
      value={form.clima_estimado}
      onChange={e => setForm({ ...form, clima_estimado: e.target.value })} />
  )}
</div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Resultado geral</label>
            <select className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
              value={form.resultado_geral}
              onChange={e => setForm({ ...form, resultado_geral: e.target.value })}>
              <option value="">Selecionar</option>
              <option>Excelente</option>
              <option>Bom</option>
              <option>Razoável</option>
              <option>Ruim</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-zinc-400">Observações</label>
          <textarea className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm h-24 resize-none"
            placeholder="O que determinou o resultado..."
            value={form.observacoes}
            onChange={e => setForm({ ...form, observacoes: e.target.value })} />
        </div>

        <button type="submit"
          className="w-full bg-white text-black font-semibold rounded-lg py-2 text-sm hover:bg-zinc-200 transition-colors">
          Salvar Show
        </button>
      </form>

      {/* ESTAMPAS */}
      {!isNew && (
        <div className="bg-zinc-900 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b border-zinc-800 pb-3">Estampas</h2>

          <form onSubmit={handleAddDesign} className="grid grid-cols-2 gap-4">
            <input className="bg-zinc-800 rounded-lg px-4 py-2 text-sm"
              placeholder="Nome da estampa"
              value={newDesign.nome}
              onChange={e => setNewDesign({ ...newDesign, nome: e.target.value })} required />

            <select className="bg-zinc-800 rounded-lg px-4 py-2 text-sm"
              value={newDesign.abordagem}
              onChange={e => setNewDesign({ ...newDesign, abordagem: e.target.value })}>
              <option value="">Abordagem</option>
              <option>Canônica</option>
              <option>Reinterpretação</option>
              <option>Experimental</option>
            </select>

            <select className="bg-zinc-800 rounded-lg px-4 py-2 text-sm"
              value={newDesign.cromatismo}
              onChange={e => setNewDesign({ ...newDesign, cromatismo: e.target.value })}>
              <option value="">Cromatismo</option>
              <option>Monocromático</option>
              <option>Bicromático</option>
              <option>Tricromático</option>
              <option>Gradiente</option>
            </select>

            <select className="bg-zinc-800 rounded-lg px-4 py-2 text-sm"
              value={newDesign.tamanho_estampa}
              onChange={e => setNewDesign({ ...newDesign, tamanho_estampa: e.target.value })}>
              <option value="">Tamanho da estampa</option>
              <option>Pequena</option>
              <option>Média</option>
              <option>Grande</option>
            </select>

            <select className="bg-zinc-800 rounded-lg px-4 py-2 text-sm col-span-2"
              value={newDesign.status}
              onChange={e => setNewDesign({ ...newDesign, status: e.target.value })}>
              <option value="">Status</option>
              <option>Pesquisa</option>
              <option>Fotolito impresso</option>
              <option>Fotolito finalizado</option>
              <option>Tela gravada</option>
              <option>Pronto</option>
            </select>

            <button type="submit"
              className="col-span-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg py-2 text-sm font-medium transition-colors">
              Adicionar estampa
            </button>
          </form>

          <div className="space-y-2">
            {designs.map((d, i) => (
              <div key={i} className="bg-zinc-800 rounded-lg px-4 py-3 flex justify-between items-center">
                <p className="font-medium">{d.nome}</p>
                <div className="flex gap-3 text-xs text-zinc-400">
                  <span>{d.abordagem}</span>
                  <span>{d.cromatismo}</span>
                  <span>{d.tamanho_estampa}</span>
                  <span className="text-white">{d.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PEÇAS */}
      {!isNew && (
        <div className="bg-zinc-900 rounded-xl p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <h2 className="text-lg font-semibold">Peças</h2>
            <div className="text-sm text-zinc-400">
              Total: <span className="text-white font-bold">{totalPecas}</span> peças
              {totalVendidas > 0 && <span> · Vendidas: <span className="text-green-400 font-bold">{totalVendidas}</span></span>}
            </div>
          </div>

          <form onSubmit={handleAddPiece} className="grid grid-cols-3 gap-3">
            <select className="bg-zinc-800 rounded-lg px-4 py-2 text-sm"
              value={newPiece.tipo}
              onChange={e => setNewPiece({ ...newPiece, tipo: e.target.value })}>
              <option value="">Tipo</option>
              <option>Camiseta</option>
              <option>Manga longa</option>
              <option>Moletom</option>
            </select>

            <input className="bg-zinc-800 rounded-lg px-4 py-2 text-sm"
              placeholder="Cor da malha"
              value={newPiece.cor_malha}
              onChange={e => setNewPiece({ ...newPiece, cor_malha: e.target.value })} />

            <select className="bg-zinc-800 rounded-lg px-4 py-2 text-sm"
              value={newPiece.qualidade_malha}
              onChange={e => setNewPiece({ ...newPiece, qualidade_malha: e.target.value })}>
              <option value="">Malha</option>
              <option>Fina</option>
              <option>Média</option>
              <option>Grossa</option>
            </select>

            <select className="bg-zinc-800 rounded-lg px-4 py-2 text-sm"
              value={newPiece.tamanho}
              onChange={e => setNewPiece({ ...newPiece, tamanho: e.target.value })}>
              <option value="">Tamanho</option>
              <option>PP</option>
              <option>P</option>
              <option>M</option>
              <option>G</option>
              <option>GG</option>
            </select>

            <input className="bg-zinc-800 rounded-lg px-4 py-2 text-sm"
              placeholder="Quantidade"
              type="number"
              value={newPiece.quantidade || ''}
              onChange={e => setNewPiece({ ...newPiece, quantidade: Number(e.target.value) })} />

            <input className="bg-zinc-800 rounded-lg px-4 py-2 text-sm"
              placeholder="Preço médio (R$)"
              type="number"
              value={newPiece.preco_medio || ''}
              onChange={e => setNewPiece({ ...newPiece, preco_medio: Number(e.target.value) })} />

            <button type="submit"
              className="col-span-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg py-2 text-sm font-medium transition-colors">
              Adicionar peça
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-400 text-xs border-b border-zinc-800">
                  <th className="text-left py-2">Tipo</th>
                  <th className="text-left py-2">Cor</th>
                  <th className="text-left py-2">Malha</th>
                  <th className="text-left py-2">Tam</th>
                  <th className="text-right py-2">Qtd</th>
                  <th className="text-right py-2">Vendidas</th>
                  <th className="text-right py-2">Preço</th>
                </tr>
              </thead>
              <tbody>
                {pieces.map((p, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="py-2">{p.tipo}</td>
                    <td className="py-2">{p.cor_malha}</td>
                    <td className="py-2">{p.qualidade_malha}</td>
                    <td className="py-2">{p.tamanho}</td>
                    <td className="py-2 text-right">{p.quantidade}</td>
                    <td className="py-2 text-right text-green-400">{p.vendidas}</td>
                    <td className="py-2 text-right">R$ {p.preco_medio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}