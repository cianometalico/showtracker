'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Venue = {
  id: string
  nome: string
  cidade: string
  capacidade: number
  lat: number
  lng: number
}

export default function Venues() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [form, setForm] = useState({
    nome: '',
    cidade: '',
    capacidade: 0,
    lat: 0,
    lng: 0,
  })

  useEffect(() => {
    fetchVenues()
  }, [])

  async function fetchVenues() {
    const { data } = await supabase.from('venues').select('*').order('nome')
    if (data) setVenues(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('venues').insert([form])
    setForm({ nome: '', cidade: '', capacidade: 0, lat: 0, lng: 0 })
    fetchVenues()
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Locais</h1>

      <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-xl p-6 space-y-4 max-w-xl">
        <h2 className="text-lg font-semibold">Novo Local</h2>

        <input
          className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
          placeholder="Nome do local"
          value={form.nome}
          onChange={e => setForm({ ...form, nome: e.target.value })}
          required
        />

        <input
          className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
          placeholder="Cidade"
          value={form.cidade}
          onChange={e => setForm({ ...form, cidade: e.target.value })}
        />

        <input
          className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
          placeholder="Capacidade (número de pessoas)"
          type="number"
          value={form.capacidade || ''}
          onChange={e => setForm({ ...form, capacidade: Number(e.target.value) })}
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
            placeholder="Latitude"
            type="number"
            step="any"
            value={form.lat || ''}
            onChange={e => setForm({ ...form, lat: Number(e.target.value) })}
          />
          <input
            className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
            placeholder="Longitude"
            type="number"
            step="any"
            value={form.lng || ''}
            onChange={e => setForm({ ...form, lng: Number(e.target.value) })}
          />
        </div>

        <p className="text-xs text-zinc-500">Lat/Lng são usados para puxar o clima automaticamente. Você pode buscar no Google Maps clicando com botão direito no local.</p>

        <button type="submit"
          className="w-full bg-white text-black font-semibold rounded-lg py-2 text-sm hover:bg-zinc-200 transition-colors">
          Salvar
        </button>
      </form>

      <div className="space-y-3">
        {venues.map(v => (
          <div key={v.id} className="bg-zinc-900 rounded-xl px-6 py-4 flex justify-between items-center">
            <div>
              <p className="font-semibold">{v.nome}</p>
              <p className="text-sm text-zinc-400">{v.cidade}</p>
            </div>
            <div className="text-sm text-zinc-400 text-right">
              <p>{v.capacidade.toLocaleString()} pessoas</p>
              {v.lat && v.lng && <p className="text-xs">{v.lat}, {v.lng}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}