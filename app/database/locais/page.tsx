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

const emptyForm = { nome: '', cidade: '', capacidade: 0, lat: 0, lng: 0 }

export default function Venues() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editando, setEditando] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Venue>>({})

  useEffect(() => { fetchVenues() }, [])

  async function fetchVenues() {
    const { data } = await supabase.from('venues').select('*').order('nome')
    if (data) setVenues(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('venues').insert([form])
    setForm(emptyForm)
    fetchVenues()
  }

  async function handleUpdate(id: string) {
    await supabase.from('venues').update(editForm).eq('id', id)
    setEditando(null)
    fetchVenues()
  }

  async function handleDelete(id: string) {
    if (!confirm('Deletar este local?')) return
    await supabase.from('venues').delete().eq('id', id)
    fetchVenues()
  }

  async function reprocessarGeo(id: string, nome: string) {
    const query = encodeURIComponent(`${nome}, Brasil`)
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`)
    const data = await res.json()
    if (data.length > 0) {
      await supabase.from('venues').update({
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      }).eq('id', id)
      fetchVenues()
    }
  }

  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

      {/* FORM NOVO */}
      <div className="win-window" style={{ width: '260px', flexShrink: 0 }}>
        <div className="win-titlebar">
          <span>📍 Novo Local</span>
        </div>
        <div style={{ padding: '8px', background: '#c0c0c0' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>

            <label style={{ fontSize: '11px' }}>Nome:</label>
            <input style={{ width: '100%' }} value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })} required />

            <label style={{ fontSize: '11px' }}>Cidade:</label>
            <input style={{ width: '100%' }} value={form.cidade}
              onChange={e => setForm({ ...form, cidade: e.target.value })} />

            <label style={{ fontSize: '11px' }}>Capacidade:</label>
            <input style={{ width: '100%' }} type="number" value={form.capacidade || ''}
              onChange={e => setForm({ ...form, capacidade: Number(e.target.value) })} />

            <label style={{ fontSize: '11px' }}>Latitude:</label>
            <input style={{ width: '100%' }} type="number" step="any" value={form.lat || ''}
              onChange={e => setForm({ ...form, lat: Number(e.target.value) })} />

            <label style={{ fontSize: '11px' }}>Longitude:</label>
            <input style={{ width: '100%' }} type="number" step="any" value={form.lng || ''}
              onChange={e => setForm({ ...form, lng: Number(e.target.value) })} />

            <p style={{ fontSize: '10px', color: '#808080' }}>
              Lat/Lng: clique direito no Google Maps para copiar.
            </p>

            <button type="submit" className="win-btn win-btn-primary">Salvar</button>
          </form>
        </div>
      </div>

      {/* TABELA */}
      <div className="win-window" style={{ flex: 1 }}>
        <div className="win-titlebar">
          <span>📍 Locais ({venues.length})</span>
        </div>
        <div style={{ padding: '4px', background: '#c0c0c0' }}>
          <table className="win-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cidade</th>
                <th>Capacidade</th>
                <th>Coordenadas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {venues.map(v => (
                editando === v.id ? (
                  <tr key={v.id} style={{ background: '#ffffc0' }}>
                    <td><input style={{ width: '140px' }} value={editForm.nome ?? ''}
                      onChange={e => setEditForm({ ...editForm, nome: e.target.value })} /></td>
                    <td><input style={{ width: '100px' }} value={editForm.cidade ?? ''}
                      onChange={e => setEditForm({ ...editForm, cidade: e.target.value })} /></td>
                    <td><input type="number" style={{ width: '70px' }} value={editForm.capacidade ?? ''}
                      onChange={e => setEditForm({ ...editForm, capacidade: Number(e.target.value) })} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <input type="number" step="any" style={{ width: '80px' }} placeholder="lat"
                        value={editForm.lat ?? ''}
                        onChange={e => setEditForm({ ...editForm, lat: Number(e.target.value) })} />
                      {' '}
                      <input type="number" step="any" style={{ width: '80px' }} placeholder="lng"
                        value={editForm.lng ?? ''}
                        onChange={e => setEditForm({ ...editForm, lng: Number(e.target.value) })} />
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="win-btn" style={{ fontSize: '11px', padding: '1px 6px', marginRight: '2px' }}
                        onClick={() => handleUpdate(v.id)}>OK</button>
                      <button className="win-btn" style={{ fontSize: '11px', padding: '1px 6px', marginRight: '2px' }}
                        onClick={() => reprocessarGeo(v.id, editForm.nome ?? v.nome)}>🌐</button>
                      <button className="win-btn" style={{ fontSize: '11px', padding: '1px 6px' }}
                        onClick={() => setEditando(null)}>✕</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={v.id}>
                    <td><strong>{v.nome}</strong></td>
                    <td>{v.cidade}</td>
                    <td>{v.capacidade?.toLocaleString()}</td>
                    <td>
                      {v.lat && v.lng
                        ? <span className="tag-success">✓ {v.lat.toFixed(3)}, {v.lng.toFixed(3)}</span>
                        : <span className="tag-danger">✗ Sem geo</span>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="win-btn" style={{ fontSize: '11px', padding: '1px 6px', marginRight: '2px' }}
                        onClick={() => { setEditando(v.id); setEditForm({ ...v }) }}>✎</button>
                      <button className="win-btn win-btn-danger" style={{ fontSize: '11px', padding: '1px 6px' }}
                        onClick={() => handleDelete(v.id)}>✕</button>
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