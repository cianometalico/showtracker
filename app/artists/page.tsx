'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Artist = {
  id: string
  nome: string
  genero: string
  geracao_predominante: string
  porte_fisico: string
  energia: number
  perfil_estetico: number
  historico: string
  propensao_compra: number
}

export default function Artists() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [form, setForm] = useState({
    nome: '',
    genero: '',
    geracao_predominante: '',
    porte_fisico: '',
    energia: 3,
    perfil_estetico: 3,
    historico: '',
    propensao_compra: 3,
  })

  useEffect(() => {
    fetchArtists()
  }, [])

  async function fetchArtists() {
    const { data } = await supabase.from('artists').select('*').order('nome')
    if (data) setArtists(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('artists').insert([form])
    setForm({
      nome: '',
      genero: '',
      geracao_predominante: '',
      porte_fisico: '',
      energia: 3,
      perfil_estetico: 3,
      historico: '',
      propensao_compra: 3,
    })
    fetchArtists()
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Artistas</h1>

      <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-xl p-6 space-y-4 max-w-xl">
        <h2 className="text-lg font-semibold">Novo Artista</h2>

        <input
          className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
          placeholder="Nome"
          value={form.nome}
          onChange={e => setForm({ ...form, nome: e.target.value })}
          required
        />

        <select
          className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
          value={form.genero}
          onChange={e => setForm({ ...form, genero: e.target.value })}
        >
          <option value="">Gênero</option>
          <option>Rock</option>
          <option>Metal</option>
          <option>HC</option>
          <option>Emo</option>
          <option>Pop</option>
          <option>Eletrônico</option>
          <option>MPB</option>
          <option>Jazz</option>
          <option>Outro</option>
        </select>

        <select
          className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
          value={form.geracao_predominante}
          onChange={e => setForm({ ...form, geracao_predominante: e.target.value })}
        >
          <option value="">Geração predominante</option>
          <option>até 20</option>
          <option>20-30</option>
          <option>30-40</option>
          <option>40+</option>
        </select>

        <select
          className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
          value={form.porte_fisico}
          onChange={e => setForm({ ...form, porte_fisico: e.target.value })}
        >
          <option value="">Porte físico predominante</option>
          <option>Miúdo</option>
          <option>Médio</option>
          <option>Grande</option>
        </select>

        <div className="space-y-2">
          <label className="text-sm text-zinc-400">Energia do público: {form.energia}</label>
          <input type="range" min={1} max={5} value={form.energia}
            onChange={e => setForm({ ...form, energia: Number(e.target.value) })}
            className="w-full accent-white"
          />
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Frio</span><span>Quente</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-zinc-400">Perfil estético: {form.perfil_estetico}</label>
          <input type="range" min={1} max={5} value={form.perfil_estetico}
            onChange={e => setForm({ ...form, perfil_estetico: Number(e.target.value) })}
            className="w-full accent-white"
          />
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Conservador</span><span>Aberto</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-zinc-400">Propensão de compra: {form.propensao_compra}</label>
          <input type="range" min={1} max={5} value={form.propensao_compra}
            onChange={e => setForm({ ...form, propensao_compra: Number(e.target.value) })}
            className="w-full accent-white"
          />
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Baixa</span><span>Alta</span>
          </div>
        </div>

        <select
          className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
          value={form.historico}
          onChange={e => setForm({ ...form, historico: e.target.value })}
        >
          <option value="">Histórico</option>
          <option>Excelente</option>
          <option>Bom</option>
          <option>Fraco</option>
          <option>Sem histórico</option>
        </select>

        <button type="submit"
          className="w-full bg-white text-black font-semibold rounded-lg py-2 text-sm hover:bg-zinc-200 transition-colors">
          Salvar
        </button>
      </form>

      <div className="space-y-3">
        {artists.map(a => (
          <div key={a.id} className="bg-zinc-900 rounded-xl px-6 py-4 flex justify-between items-center">
            <div>
              <p className="font-semibold">{a.nome}</p>
              <p className="text-sm text-zinc-400">{a.genero} · {a.geracao_predominante} · {a.porte_fisico}</p>
            </div>
            <div className="text-sm text-zinc-400 text-right">
              <p>Energia: {a.energia}/5</p>
              <p>Estética: {a.perfil_estetico}/5</p>
              <p>Propensão: {a.propensao_compra}/5</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}