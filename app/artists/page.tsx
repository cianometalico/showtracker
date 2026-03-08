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
  nome: '', genero: '', geracao_predominante: '', porte_fisico: '',
  energia: 3, perfil_estetico: 3, historico: '', propensao_compra: 3,
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

  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

      {/* FORM NOVO */}
      <div className="win-window" style={{ width: '280px', flexShrink: 0 }}>
        <div className="win-titlebar">
          <span>🎸 Novo Artista</span>
        </div>
        <div style={{ padding: '8px', background: '#c0c0c0' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>

            <label style={{ fontSize: '11px' }}>Nome:</label>
            <input style={{ width: '100%' }} value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })} required />

            <label style={{ fontSize: '11px' }}>Gênero:</label>
            <select style={{ width: '100%' }} value={form.genero}
              onChange={e => setForm({ ...form, genero: e.target.value })}>
              <option value="">—</option>
              {['Rock','Metal','HC','Emo','Pop','Eletrônico','MPB','Jazz','Outro'].map(g => <option key={g}>{g}</option>)}
            </select>

            <label style={{ fontSize: '11px' }}>Geração:</label>
            <select style={{ width: '100%' }} value={form.geracao_predominante}
              onChange={e => setForm({ ...form, geracao_predominante: e.target.value })}>
              <option value="">—</option>
              {['até 20','20-30','30-40','40+'].map(g => <option key={g}>{g}</option>)}
            </select>

            <label style={{ fontSize: '11px' }}>Porte físico:</label>
            <select style={{ width: '100%' }} value={form.porte_fisico}
              onChange={e => setForm({ ...form, porte_fisico: e.target.value })}>
              <option value="">—</option>
              {['Miúdo','Médio','Grande'].map(g => <option key={g}>{g}</option>)}
            </select>

            <label style={{ fontSize: '11px' }}>Histórico:</label>
            <select style={{ width: '100%' }} value={form.historico}
              onChange={e => setForm({ ...form, historico: e.target.value })}>
              <option value="">—</option>
              {['Excelente','Bom','Fraco','Sem histórico'].map(g => <option key={g}>{g}</option>)}
            </select>

            {[
              { label: 'Energia', key: 'energia', left: 'Frio', right: 'Quente' },
              { label: 'Estética', key: 'perfil_estetico', left: 'Conservador', right: 'Aberto' },
              { label: 'Propensão', key: 'propensao_compra', left: 'Baixa', right: 'Alta' },
            ].map(({ label, key, left, right }) => (
              <div key={key}>
                <label style={{ fontSize: '11px' }}>{label}: {form[key as keyof typeof form]}/5</label>
                <input type="range" min={1} max={5} style={{ width: '100%' }}
                  value={form[key as keyof typeof form] as number}
                  onChange={e => setForm({ ...form, [key]: Number(e.target.value) })} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#808080' }}>
                  <span>{left}</span><span>{right}</span>
                </div>
              </div>
            ))}

            <button type="submit" className="win-btn win-btn-primary" style={{ marginTop: '4px' }}>
              Salvar
            </button>
          </form>
        </div>
      </div>

      {/* TABELA */}
      <div className="win-window" style={{ flex: 1 }}>
        <div className="win-titlebar">
          <span>🎸 Artistas ({artists.length})</span>
        </div>
        <div style={{ padding: '4px', background: '#c0c0c0' }}>
          <table className="win-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Gênero</th>
                <th>Geração</th>
                <th>Porte</th>
                <th>Energia</th>
                <th>Estética</th>
                <th>Propensão</th>
                <th>Histórico</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {artists.map(a => (
                editando === a.id ? (
                  <tr key={a.id} style={{ background: '#ffffc0' }}>
                    <td><input style={{ width: '120px' }} value={editForm.nome ?? ''}
                      onChange={e => setEditForm({ ...editForm, nome: e.target.value })} /></td>
                    <td>
                      <select style={{ width: '80px' }} value={editForm.genero ?? ''}
                        onChange={e => setEditForm({ ...editForm, genero: e.target.value })}>
                        <option value="">—</option>
                        {['Rock','Metal','HC','Emo','Pop','Eletrônico','MPB','Jazz','Outro'].map(g => <option key={g}>{g}</option>)}
                      </select>
                    </td>
                    <td>
                      <select style={{ width: '70px' }} value={editForm.geracao_predominante ?? ''}
                        onChange={e => setEditForm({ ...editForm, geracao_predominante: e.target.value })}>
                        <option value="">—</option>
                        {['até 20','20-30','30-40','40+'].map(g => <option key={g}>{g}</option>)}
                      </select>
                    </td>
                    <td>
                      <select style={{ width: '70px' }} value={editForm.porte_fisico ?? ''}
                        onChange={e => setEditForm({ ...editForm, porte_fisico: e.target.value })}>
                        <option value="">—</option>
                        {['Miúdo','Médio','Grande'].map(g => <option key={g}>{g}</option>)}
                      </select>
                    </td>
                    <td><input type="number" min={1} max={5} style={{ width: '40px' }}
                      value={editForm.energia ?? 3}
                      onChange={e => setEditForm({ ...editForm, energia: Number(e.target.value) })} /></td>
                    <td><input type="number" min={1} max={5} style={{ width: '40px' }}
                      value={editForm.perfil_estetico ?? 3}
                      onChange={e => setEditForm({ ...editForm, perfil_estetico: Number(e.target.value) })} /></td>
                    <td><input type="number" min={1} max={5} style={{ width: '40px' }}
                      value={editForm.propensao_compra ?? 3}
                      onChange={e => setEditForm({ ...editForm, propensao_compra: Number(e.target.value) })} /></td>
                    <td>
                      <select style={{ width: '90px' }} value={editForm.historico ?? ''}
                        onChange={e => setEditForm({ ...editForm, historico: e.target.value })}>
                        <option value="">—</option>
                        {['Excelente','Bom','Fraco','Sem histórico'].map(g => <option key={g}>{g}</option>)}
                      </select>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="win-btn" style={{ fontSize: '11px', padding: '1px 6px', marginRight: '2px' }}
                        onClick={() => handleUpdate(a.id)}>OK</button>
                      <button className="win-btn" style={{ fontSize: '11px', padding: '1px 6px' }}
                        onClick={() => setEditando(null)}>✕</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={a.id}>
                    <td><strong>{a.nome}</strong></td>
                    <td>{a.genero}</td>
                    <td>{a.geracao_predominante}</td>
                    <td>{a.porte_fisico}</td>
                    <td style={{ textAlign: 'center' }}>{a.energia}/5</td>
                    <td style={{ textAlign: 'center' }}>{a.perfil_estetico}/5</td>
                    <td style={{ textAlign: 'center' }}>{a.propensao_compra}/5</td>
                    <td className={
                      a.historico === 'Excelente' ? 'tag-success' :
                      a.historico === 'Bom' ? 'tag-sage' :
                      a.historico === 'Fraco' ? 'tag-danger' : 'tag-neutral'
                    }>{a.historico || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="win-btn" style={{ fontSize: '11px', padding: '1px 6px', marginRight: '2px' }}
                        onClick={() => { setEditando(a.id); setEditForm({ ...a }) }}>✎</button>
                      <button className="win-btn win-btn-danger" style={{ fontSize: '11px', padding: '1px 6px' }}
                        onClick={() => handleDelete(a.id)}>✕</button>
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