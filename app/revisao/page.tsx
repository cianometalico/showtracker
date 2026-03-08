'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Venue = {
  id: string
  nome: string
  cidade: string
  capacidade: number
  lat: number | null
  lng: number | null
}

export default function Revisao() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [editando, setEditando] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Venue>>({})
  const [buscando, setBuscando] = useState<string | null>(null)
  const [salvo, setSalvo] = useState<string | null>(null)

  useEffect(() => {
    fetchVenues()
  }, [])

  async function fetchVenues() {
    const { data } = await supabase
      .from('venues')
      .select('*')
      .order('nome')
    if (data) setVenues(data)
  }

  function iniciarEdicao(venue: Venue) {
    setEditando(venue.id)
    setForm({ ...venue })
  }

  async function salvarVenue(id: string) {
    await supabase.from('venues').update(form).eq('id', id)
    setSalvo(id)
    setTimeout(() => setSalvo(null), 2000)
    setEditando(null)
    fetchVenues()
  }

  async function reprocessarGeo(id: string, nome: string) {
    setBuscando(id)
    try {
      const query = encodeURIComponent(`${nome}, Brasil`)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`)
      const data = await res.json()
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat)
        const lng = parseFloat(data[0].lon)
        await supabase.from('venues').update({ lat, lng }).eq('id', id)
        fetchVenues()
      }
    } finally {
      setBuscando(null)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Revisão de Locais</h1>
        <p className="text-sm text-zinc-400 mt-1">Corrija nomes e coordenadas dos locais importados.</p>
      </div>

      <div className="space-y-2">
        {venues.map(v => (
          <div key={v.id} className={`bg-zinc-900 rounded-xl px-6 py-4 space-y-3 transition-all ${salvo === v.id ? 'ring-1 ring-green-500' : ''}`}>

            {editando === v.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400">Nome do local</label>
                    <input
                      className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
                      value={form.nome ?? ''}
                      onChange={e => setForm({ ...form, nome: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400">Cidade</label>
                    <input
                      className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
                      value={form.cidade ?? ''}
                      onChange={e => setForm({ ...form, cidade: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400">Latitude</label>
                    <input
                      className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
                      type="number"
                      step="any"
                      value={form.lat ?? ''}
                      onChange={e => setForm({ ...form, lat: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400">Longitude</label>
                    <input
                      className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
                      type="number"
                      step="any"
                      value={form.lng ?? ''}
                      onChange={e => setForm({ ...form, lng: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => salvarVenue(v.id)}
                    className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors">
                    Salvar
                  </button>
                  <button
                    onClick={() => reprocessarGeo(v.id, form.nome ?? v.nome)}
                    disabled={buscando === v.id}
                    className="bg-zinc-700 hover:bg-zinc-600 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                    {buscando === v.id ? 'Buscando...' : 'Reprocessar geo'}
                  </button>
                  <button
                    onClick={() => setEditando(null)}
                    className="text-zinc-400 hover:text-white text-sm px-4 py-2 transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{v.nome}</p>
                  <p className="text-sm text-zinc-400">{v.cidade}</p>
                  {v.lat && v.lng
                    ? <p className="text-xs text-green-500 mt-1">✓ {v.lat.toFixed(4)}, {v.lng.toFixed(4)}</p>
                    : <p className="text-xs text-red-400 mt-1">✗ Sem coordenadas</p>
                  }
                </div>
                <button
                  onClick={() => iniciarEdicao(v)}
                  className="text-xs text-zinc-400 hover:text-white transition-colors underline">
                  Editar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}