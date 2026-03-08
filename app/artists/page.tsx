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

const emptyForm = {
  nome: '',
  genero: '',
  geracao_predominante: '',
  porte_fisico: '',
  energia: 3,
  perfil_estetico: 3,
  historico: '',
  propensao_compra: 3,
}

export default function Artists() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editando, setEditando] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Artist>>({})

  useEffect(() => { fetchArtists() }, [])

  async function fetchArtists() {
    const { data } = await supabase.from('artists').select('*').order('nome')
    if (data) setArtists(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('artists').insert([form])
    setForm(emptyForm)
    fetchArtists()
  }

  async function handleUpdate(id: string) {
    await supabase.from('artists').update(editForm).eq('id', id)
    setEditando(null)
    fetchArtists()
  }

  async function handleDelete(id: string) {
    if (!confirm('Deletar este artista?')) return
    await supabase.from('artists').delete().eq('id', id)
    fetchArtists()
  }

  function iniciarEdicao(a: Artist) {
    setEditando(a.id)
    setEditForm({ ...a })
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Artistas</h1>

      {/* FORM NOVO */}
      <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-xl p-6 space-y-4 max-w-xl">
        <h2 className="text-lg font-semibold">Novo Artista</h2>

        <input className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
          placeholder="Nome" value={form.nome}
          onChange={e => setForm({ ...form, nome: e.target.value })} required />

        <select className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
          value={form.genero} onChange={e => setForm({ ...form, genero: e.target.value })}>
          <option value="">Gênero</option>
          <option>Rock</option><option>Metal</option><option>HC</option>
          <option>Emo</option><option>Pop</option><option>Eletrônico</option>
          <option>MPB</option><option>Jazz</option><option>Outro</option>
        </select>

        <select className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
          value={form.geracao_predominante} onChange={e => setForm({ ...form, geracao_predominante: e.target.value })}>
          <option value="">Geração predominante</option>
          <option>até 20</option><option>20-30</option><option>30-40</option><option>40+</option>
        </select>

        <select className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
          value={form.porte_fisico} onChange={e => setForm({ ...form, porte_fisico: e.target.value })}>
          <option value="">Porte físico predominante</option>
          <option>Miúdo</option><option>Médio</option><option>Grande</option>
        </select>

        {[
          { label: 'Energia do público', key: 'energia', left: 'Frio', right: 'Quente' },
          { label: 'Perfil estético', key: 'perfil_estetico', left: 'Conservador', right: 'Aberto' },
          { label: 'Propensão de compra', key: 'propensao_compra', left: 'Baixa', right: 'Alta' },
        ].map(({ label, key, left, right }) => (
          <div key={key} className="space-y-1">
            <label className="text-sm text-zinc-400">{label}: {form[key as keyof typeof form]}</label>
            <input type="range" min={1} max={5}
              value={form[key as keyof typeof form] as number}
              onChange={e => setForm({ ...form, [key]: Number(e.target.value) })}
              className="w-full accent-white" />
            <div className="flex justify-between text-xs text-zinc-500">
              <span>{left}</span><span>{right}</span>
            </div>
          </div>
        ))}

        <select className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
          value={form.historico} onChange={e => setForm({ ...form, historico: e.target.value })}>
          <option value="">Histórico</option>
          <option>Excelente</option><option>Bom</option>
          <option>Fraco</option><option>Sem histórico</option>
        </select>

        <button type="submit" className="w-full bg-white text-black font-semibold rounded-lg py-2 text-sm hover:bg-zinc-200 transition-colors">
          Salvar
        </button>
      </form>

      {/* LISTA */}
      <div className="space-y-2">
        {artists.map(a => (
          <div key={a.id} className="bg-zinc-900 rounded-xl px-6 py-4">
            {editando === a.id ? (
              <div className="space-y-3">
                <input className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
                  value={editForm.nome ?? ''}
                  onChange={e => setEditForm({ ...editForm, nome: e.target.value })} />

                <select className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
                  value={editForm.genero ?? ''}
                  onChange={e => setEditForm({ ...editForm, genero: e.target.value })}>
                  <option value="">Gênero</option>
                  <option>Rock</option><option>Metal</option><option>HC</option>
                  <option>Emo</option><option>Pop</option><option>Eletrônico</option>
                  <option>MPB</option><option>Jazz</option><option>Outro</option>
                </select>

                <select className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
                  value={editForm.geracao_predominante ?? ''}
                  onChange={e => setEditForm({ ...editForm, geracao_predominante: e.target.value })}>
                  <option value="">Geração predominante</option>
                  <option>até 20</option><option>20-30</option><option>30-40</option><option>40+</option>
                </select>

                <select className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
                  value={editForm.porte_fisico ?? ''}
                  onChange={e => setEditForm({ ...editForm, porte_fisico: e.target.value })}>
                  <option value="">Porte físico predominante</option>
                  <option>Miúdo</option><option>Médio</option><option>Grande</option>
                </select>

                {[
                  { label: 'Energia', key: 'energia', left: 'Frio', right: 'Quente' },
                  { label: 'Perfil estético', key: 'perfil_estetico', left: 'Conservador', right: 'Aberto' },
                  { label: 'Propensão', key: 'propensao_compra', left: 'Baixa', right: 'Alta' },
                ].map(({ label, key, left, right }) => (
                  <div key={key} className="space-y-1">
                    <label className="text-sm text-zinc-400">{label}: {editForm[key as keyof typeof editForm]}</label>
                    <input type="range" min={1} max={5}
                      value={editForm[key as keyof typeof editForm] as number ?? 3}
                      onChange={e => setEditForm({ ...editForm, [key]: Number(e.target.value) })}
                      className="w-full accent-white" />
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>{left}</span><span>{right}</span>
                    </div>
                  </div>
                ))}

                <select className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
                  value={editForm.historico ?? ''}
                  onChange={e => setEditForm({ ...editForm, historico: e.target.value })}>
                  <option value="">Histórico</option>
                  <option>Excelente</option><option>Bom</option>
                  <option>Fraco</option><option>Sem histórico</option>
                </select>

                <div className="flex gap-2">
                  <button type="button" onClick={() => handleUpdate(a.id)}
                    className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors">
                    Salvar
                  </button>
                  <button type="button" onClick={() => setEditando(null)}
                    className="text-zinc-400 hover:text-white text-sm px-4 py-2 transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{a.nome}</p>
                  <p className="text-sm text-zinc-400">{a.genero} · {a.geracao_predominante} · {a.porte_fisico}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-zinc-400 text-right">
                    <p>Energia: {a.energia}/5</p>
                    <p>Estética: {a.perfil_estetico}/5</p>
                    <p>Propensão: {a.propensao_compra}/5</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => iniciarEdicao(a)}
                      className="text-xs text-zinc-400 hover:text-white transition-colors underline">
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(a.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors">
                      Deletar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}