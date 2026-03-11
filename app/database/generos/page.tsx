'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Genre = {
  id: string
  nome: string
  tags_mb: string[]
  multiplicador_propensao: number
  energia_tipica: number
  perfil_estetico_tipico: number
  zona: string
  notas: string
}

const emptyForm = {
  nome: '',
  tags_mb: [] as string[],
  multiplicador_propensao: 1.0,
  energia_tipica: 3,
  perfil_estetico_tipico: 3,
  zona: '',
  notas: '',
}

export default function Generos() {
  const [genres, setGenres] = useState<Genre[]>([])
  const [form, setForm] = useState(emptyForm)
  const [tagsInput, setTagsInput] = useState('')
  const [editando, setEditando] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Genre>>({})
  const [editTagsInput, setEditTagsInput] = useState('')

  useEffect(() => { fetchGenres() }, [])

  async function fetchGenres() {
    const { data } = await supabase.from('genres').select('*').order('nome')
    if (data) setGenres(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    await supabase.from('genres').insert([{ ...form, tags_mb: tags }])
    setForm(emptyForm)
    setTagsInput('')
    fetchGenres()
  }

  async function handleUpdate(id: string) {
    const tags = editTagsInput.split(',').map(t => t.trim()).filter(Boolean)
    await supabase.from('genres').update({
      ...editForm,
      tags_mb: tags,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    setEditando(null)
    fetchGenres()
  }

  async function handleDelete(id: string) {
    if (!confirm('Deletar este gênero?')) return
    await supabase.from('genres').delete().eq('id', id)
    fetchGenres()
  }

  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

      {/* FORM NOVO */}
      <div className="win-window" style={{ width: '260px', flexShrink: 0 }}>
        <div className="win-titlebar"><span>🎼 Novo Gênero</span></div>
        <div style={{ padding: '8px', background: '#c0c0c0' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>

            <label style={{ fontSize: '11px' }}>Nome:</label>
            <input style={{ width: '100%' }} value={form.nome} required
              onChange={e => setForm({ ...form, nome: e.target.value })} />

            <label style={{ fontSize: '11px' }}>Tags MusicBrainz:</label>
            <textarea style={{ width: '100%', height: '60px', resize: 'none' }}
              placeholder="hardcore, post-hardcore, metalcore"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)} />
            <span style={{ fontSize: '10px', color: '#808080' }}>Separadas por vírgula</span>

            <label style={{ fontSize: '11px' }}>
              Multiplicador propensão: {form.multiplicador_propensao}x
            </label>
            <input type="range" min={0.1} max={2.0} step={0.1} style={{ width: '100%' }}
              value={form.multiplicador_propensao}
              onChange={e => setForm({ ...form, multiplicador_propensao: Number(e.target.value) })} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#808080' }}>
              <span>0.1x Baixíssima</span><span>2.0x Altíssima</span>
            </div>

            {[
              { label: 'Energia típica', key: 'energia_tipica', left: 'Frio', right: 'Quente' },
              { label: 'Estética típica', key: 'perfil_estetico_tipico', left: 'Conservador', right: 'Aberto' },
            ].map(({ label, key, left, right }) => (
              <div key={key}>
                <label style={{ fontSize: '11px' }}>{label}: {form[key as keyof typeof emptyForm]}/5</label>
                <input type="range" min={1} max={5} style={{ width: '100%' }}
                  value={form[key as keyof typeof emptyForm] as number}
                  onChange={e => setForm({ ...form, [key]: Number(e.target.value) })} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#808080' }}>
                  <span>{left}</span><span>{right}</span>
                </div>
              </div>
            ))}

            <label style={{ fontSize: '11px' }}>Zona:</label>
            <select style={{ width: '100%' }} value={form.zona}
              onChange={e => setForm({ ...form, zona: e.target.value })}>
              <option value="">—</option>
              <option>Faminto</option>
              <option>Saturado</option>
            </select>

            <label style={{ fontSize: '11px' }}>Notas:</label>
            <textarea style={{ width: '100%', height: '50px', resize: 'none' }}
              value={form.notas}
              onChange={e => setForm({ ...form, notas: e.target.value })} />

            <button type="submit" className="win-btn win-btn-primary">Salvar</button>
          </form>
        </div>
      </div>

      {/* TABELA */}
      <div className="win-window" style={{ flex: 1 }}>
        <div className="win-titlebar"><span>🎼 Gêneros ({genres.length})</span></div>
        <div style={{ padding: '4px', background: '#c0c0c0' }}>
          <table className="win-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Propensão</th>
                <th>Energia</th>
                <th>Estética</th>
                <th>Zona</th>
                <th>Tags MB</th>
                <th>Notas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {genres.map(g => (
                editando === g.id ? (
                  <tr key={g.id} style={{ background: '#ffffc0' }}>
                    <td>
                      <input style={{ width: '80px' }} value={editForm.nome ?? ''}
                        onChange={e => setEditForm({ ...editForm, nome: e.target.value })} />
                    </td>
                    <td>
                      <input type="number" step={0.1} min={0.1} max={2.0} style={{ width: '50px' }}
                        value={editForm.multiplicador_propensao ?? 1.0}
                        onChange={e => setEditForm({ ...editForm, multiplicador_propensao: Number(e.target.value) })} />
                      <span style={{ fontSize: '10px' }}>x</span>
                    </td>
                    <td>
                      <input type="number" min={1} max={5} style={{ width: '40px' }}
                        value={editForm.energia_tipica ?? 3}
                        onChange={e => setEditForm({ ...editForm, energia_tipica: Number(e.target.value) })} />
                    </td>
                    <td>
                      <input type="number" min={1} max={5} style={{ width: '40px' }}
                        value={editForm.perfil_estetico_tipico ?? 3}
                        onChange={e => setEditForm({ ...editForm, perfil_estetico_tipico: Number(e.target.value) })} />
                    </td>
                    <td>
                      <select style={{ width: '80px' }} value={editForm.zona ?? ''}
                        onChange={e => setEditForm({ ...editForm, zona: e.target.value })}>
                        <option value="">—</option>
                        <option>Faminto</option>
                        <option>Saturado</option>
                      </select>
                    </td>
                    <td>
                      <input style={{ width: '180px' }} value={editTagsInput}
                        onChange={e => setEditTagsInput(e.target.value)}
                        placeholder="tag1, tag2, tag3" />
                    </td>
                    <td>
                      <input style={{ width: '140px' }} value={editForm.notas ?? ''}
                        onChange={e => setEditForm({ ...editForm, notas: e.target.value })} />
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="win-btn" style={{ fontSize: '11px', padding: '1px 6px', marginRight: '2px' }}
                        onClick={() => handleUpdate(g.id)}>OK</button>
                      <button className="win-btn" style={{ fontSize: '11px', padding: '1px 6px' }}
                        onClick={() => setEditando(null)}>✕</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={g.id}>
                    <td><strong>{g.nome}</strong></td>
                    <td>
                      <span style={{
                        fontWeight: 'bold',
                        color: g.multiplicador_propensao >= 1.1 ? '#006400' :
                               g.multiplicador_propensao >= 0.8 ? '#806800' : '#CC2200'
                      }}>
                        {g.multiplicador_propensao}x
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{g.energia_tipica}/5</td>
                    <td style={{ textAlign: 'center' }}>{g.perfil_estetico_tipico}/5</td>
                    <td>
                      <span className={
                        g.zona === 'Faminto' ? 'tag-success' :
                        g.zona === 'Saturado' ? 'tag-danger' : 'tag-neutral'
                      }>{g.zona || '—'}</span>
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', color: '#808080', fontSize: '10px' }}>
                      {g.tags_mb?.join(', ') || '—'}
                    </td>
                    <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', color: '#808080' }}>
                      {g.notas || '—'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="win-btn" style={{ fontSize: '11px', padding: '1px 6px', marginRight: '2px' }}
                        onClick={() => {
                          setEditando(g.id)
                          setEditForm({ ...g })
                          setEditTagsInput(g.tags_mb?.join(', ') ?? '')
                        }}>✎</button>
                      <button className="win-btn win-btn-danger" style={{ fontSize: '11px', padding: '1px 6px' }}
                        onClick={() => handleDelete(g.id)}>✕</button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}