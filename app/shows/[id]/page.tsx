'use client'

import { calculateSuggestedVolume, getVenueZona } from '@/lib/inference'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Artist = { id: string; nome: string; genero: string; propensao_compra: number }
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
  const [genre, setGenre] = useState<any>(null)
  const [pieces, setPieces] = useState<Piece[]>([])
  const [clima, setClima] = useState<{
    descricao: string; temp_min: number; temp_max: number; chuva: number; vento: number; icone: string
  } | null>(null)

  const [form, setForm] = useState({
    artist_id: '', venue_id: '', data: '', status_ingresso: '',
    publico_estimado: 0, primeira_vez_brasil: false, fiscalizacao: false,
    risco_cancelamento: false, concorrentes: '', qualidade_concorrencia: 3,
    clima_estimado: '', resultado_geral: '', observacoes: '', participou: true,
    fiscalizacao_score: 0,
  })

  const [newDesign, setNewDesign] = useState<Design>({
    nome: '', abordagem: '', cromatismo: '', tamanho_estampa: '', status: ''
  })

  const [newPiece, setNewPiece] = useState<Piece>({
    tipo: '', cor_malha: '', qualidade_malha: '', tamanho: '',
    quantidade: 0, vendidas: 0, preco_medio: 0
  })

  useEffect(() => {
    supabase.from('artists').select('id, nome, genero, propensao_compra').order('nome').then(({ data }) => { if (data) setArtists(data) })
    supabase.from('venues').select('id, nome, capacidade, lat, lng').order('nome').then(({ data }) => { if (data) setVenues(data as Venue[]) })
    if (!isNew) fetchShow()
  }, [id])

  async function fetchShow() {
    const { data: show } = await supabase.from('shows').select('*').eq('id', id).single()
    if (show) setForm({
      ...show,
      concorrentes: show.concorrentes ?? '',
      clima_estimado: show.clima_estimado ?? '',
      observacoes: show.observacoes ?? '',
      resultado_geral: show.resultado_geral ?? '',
      publico_estimado: show.publico_estimado ?? 0,
      fiscalizacao_score: show.fiscalizacao_score ?? 0,
    })
    const { data: d } = await supabase.from('designs').select('*').eq('show_id', id)
    if (d) setDesigns(d)
    const { data: p } = await supabase.from('pieces').select('*').eq('show_id', id)
    if (p) setPieces(p)

    // Busca gênero do artista
    const artistData = artists.find(a => a.id === show.artist_id)
    if (artistData?.genero) {
      const { data: genreData } = await supabase
        .from('genres')
        .select('*')
        .ilike('nome', artistData.genero)
        .single()
      if (genreData) setGenre(genreData)
    }
  }

  useEffect(() => {
    const venue = venues.find(v => v.id === form.venue_id)
    if (!venue) return
    const taxas: Record<string, number> = {
      'sold out': 1, 'último lote': 0.9, 'lotes intermediários': 0.6, 'mal vendido': 0.3,
    }
    const taxa = taxas[form.status_ingresso] ?? 0.5
    setForm(f => ({ ...f, publico_estimado: Math.round(venue.capacidade * taxa) }))
  }, [form.venue_id, form.status_ingresso])

  async function fetchClima() {
    const venue = venues.find(v => v.id === form.venue_id)
    if (!venue?.lat || !venue?.lng || !form.data) return
    const res = await fetch(`/api/weather?lat=${venue.lat}&lng=${venue.lng}&date=${form.data}`)
    const data = await res.json()
    if (!data.error) setClima(data)
  }

  async function handleSaveShow(e: React.FormEvent) {
    e.preventDefault()
    if (isNew) {
      await supabase.from('shows').insert([form])
    } else {
      await supabase.from('shows').update(form).eq('id', id)
    }
    alert('Show salvo!')
  }

  async function handleDelete() {
    if (!confirm('Deletar este show?')) return
    await supabase.from('pieces').delete().eq('show_id', id)
    await supabase.from('designs').delete().eq('show_id', id)
    await supabase.from('shows').delete().eq('id', id)
    window.location.href = '/agenda'
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

  async function updatePiece(id: string, fields: Partial<Piece>) {
    await supabase.from('pieces').update(fields).eq('id', id)
    fetchShow()
  }

  async function deletePiece(id: string) {
    await supabase.from('pieces').delete().eq('id', id)
    setPieces(prev => prev.filter(p => p.id !== id))
  }

  const totalPecas = pieces.reduce((acc, p) => acc + p.quantidade, 0)
  const totalVendidas = pieces.reduce((acc, p) => acc + p.vendidas, 0)
  const artista = artists.find(a => a.id === form.artist_id)
  const venueAtual = venues.find(v => v.id === form.venue_id)
  const inferencia = calculateSuggestedVolume({
    status_ingresso: form.status_ingresso,
    publico_estimado: form.publico_estimado,
    concorrentes: form.concorrentes,
    qualidade_concorrencia: form.qualidade_concorrencia,
    fiscalizacao: form.fiscalizacao,
    fiscalizacao_score: form.fiscalizacao_score ?? 0,
    chuva_prevista: (clima?.chuva ?? 0) > 2,
    venue_zona: venueAtual ? getVenueZona(venueAtual.nome) : '',
    artist_propensao: artists.find(a => a.id === form.artist_id)?.propensao_compra,
    num_artistas: designs.length > 0 ? designs.length : 1,
    genre,
  })


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* HEADER */}
      <div className="win-window">
        <div className="win-titlebar">
          <span>{isNew ? '+ Novo Show' : `🎵 ${artista?.nome ?? 'Show'}`}</span>
          {!isNew && (
            <button className="win-btn win-btn-danger" style={{ fontSize: '11px', padding: '1px 8px' }}
              onClick={handleDelete}>Deletar Show</button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

        {/* PAINEL DO EVENTO */}
        <form onSubmit={handleSaveShow}>
          <div className="win-window">
            <div className="win-titlebar"><span>📋 Painel do Evento</span></div>
            <div style={{ padding: '8px', background: '#c0c0c0', display: 'flex', flexDirection: 'column', gap: '6px' }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ fontSize: '11px', display: 'block' }}>Artista:</label>
                  <select style={{ width: '100%' }} value={form.artist_id}
                    onChange={e => setForm({ ...form, artist_id: e.target.value })}>
                    <option value="">—</option>
                    {artists.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', display: 'block' }}>Data:</label>
                  <input type="date" style={{ width: '100%' }} value={form.data}
                    onChange={e => setForm({ ...form, data: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', display: 'block' }}>Local:</label>
                  <select style={{ width: '100%' }} value={form.venue_id}
                    onChange={e => setForm({ ...form, venue_id: e.target.value })}>
                    <option value="">—</option>
                    {venues.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', display: 'block' }}>Status Ingressos:</label>
                  <select style={{ width: '100%' }} value={form.status_ingresso}
                    onChange={e => setForm({ ...form, status_ingresso: e.target.value })}>
                    <option value="">—</option>
                    <option>sold out</option>
                    <option>último lote</option>
                    <option>lotes intermediários</option>
                    <option>mal vendido</option>

                  </select>
                </div>
              </div>

              {/* PÚBLICO ESTIMADO */}
              <div className="win-inset" style={{ padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px' }}>Público estimado:</span>
                <strong style={{ fontSize: '16px', color: '#2B5BE0' }}>{(form.publico_estimado ?? 0).toLocaleString()}</strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ fontSize: '11px', display: 'block' }}>Concorrentes:</label>
                  <select style={{ width: '100%' }} value={form.concorrentes}
                    onChange={e => setForm({ ...form, concorrentes: e.target.value })}>
                    <option value="">—</option>
                    <option>nenhum</option><option>poucos</option>
                    <option>moderado</option><option>muitos</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', display: 'block' }}>Qualidade concorrência: {form.qualidade_concorrencia}/5</label>
                  <input type="range" min={1} max={5} style={{ width: '100%' }}
                    value={form.qualidade_concorrencia ?? 5}
                    onChange={e => setForm({ ...form, qualidade_concorrencia: Number(e.target.value) })} />
                </div>
              </div>

              {/* CHECKBOXES */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Primeira vez no Brasil', key: 'primeira_vez_brasil' },
                  { label: 'Fiscalização', key: 'fiscalizacao' },
                  { label: 'Risco cancelamento', key: 'risco_cancelamento' },
                ].map(({ label, key }) => (
                  <label key={key} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="checkbox"
                      checked={form[key as keyof typeof form] as boolean}
                      onChange={e => setForm({ ...form, [key]: e.target.checked })} />
                    {label}
                  </label>
                ))}
              </div>

              {/* CLIMA */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '11px' }}>Clima:</label>
                  {form.venue_id && form.data && (
                    <button type="button" className="win-btn" style={{ fontSize: '10px', padding: '1px 6px' }}
                      onClick={fetchClima}>🌤 Buscar</button>
                  )}
                </div>
                {clima ? (
                  <div className="win-inset" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={`https://openweathermap.org/img/wn/${clima.icone}.png`} style={{ width: '32px', height: '32px' }} alt="" />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize' }}>{clima.descricao}</div>
                      <div style={{ fontSize: '11px', color: '#808080' }}>{clima.temp_min}°–{clima.temp_max}°C · {clima.vento}km/h{clima.chuva > 0 ? ` · ${clima.chuva}mm` : ''}</div>
                    </div>
                  </div>
                ) : (
                  <input style={{ width: '100%' }} placeholder="Selecione local e data para buscar"
                    value={form.clima_estimado}
                    onChange={e => setForm({ ...form, clima_estimado: e.target.value })} />
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ fontSize: '11px', display: 'block' }}>Resultado:</label>
                  <select style={{ width: '100%' }} value={form.resultado_geral}
                    onChange={e => setForm({ ...form, resultado_geral: e.target.value })}>
                    <option value="">—</option>
                    <option>Excelente</option><option>Bom</option>
                    <option>Razoável</option><option>Ruim</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', display: 'block' }}>Observações:</label>
                <textarea style={{ width: '100%', height: '60px', resize: 'none' }}
                  value={form.observacoes}
                  onChange={e => setForm({ ...form, observacoes: e.target.value })} />
              </div>

              <button type="submit" className="win-btn win-btn-primary">Salvar Show</button>
            </div>
          </div>
        </form>

        {/* ESTAMPAS */}
        {!isNew && (
          <div className="win-window">
            <div className="win-titlebar"><span>🎨 Estampas</span></div>
            <div style={{ padding: '8px', background: '#c0c0c0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <form onSubmit={handleAddDesign} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: '11px', display: 'block' }}>Nome:</label>
                  <input style={{ width: '100%' }} value={newDesign.nome}
                    onChange={e => setNewDesign({ ...newDesign, nome: e.target.value })} required />
                </div>
                {[
                  { label: 'Abordagem', key: 'abordagem', opts: ['Canônica', 'Reinterpretação', 'Experimental'] },
                  { label: 'Cromatismo', key: 'cromatismo', opts: ['Monocromático', 'Bicromático', 'Tricromático', 'Gradiente'] },
                  { label: 'Tamanho', key: 'tamanho_estampa', opts: ['Pequena', 'Média', 'Grande'] },
                  { label: 'Status', key: 'status', opts: ['Pesquisa', 'Fotolito impresso', 'Fotolito finalizado', 'Tela gravada', 'Pronto'] },
                ].map(({ label, key, opts }) => (
                  <div key={key}>
                    <label style={{ fontSize: '11px', display: 'block' }}>{label}:</label>
                    <select style={{ width: '100%' }} value={newDesign[key as keyof Design]}
                      onChange={e => setNewDesign({ ...newDesign, [key]: e.target.value })}>
                      <option value="">—</option>
                      {opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <button type="submit" className="win-btn win-btn-primary" style={{ gridColumn: '1/-1' }}>
                  + Adicionar Estampa
                </button>
              </form>

              <table className="win-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Abordagem</th>
                    <th>Cores</th>
                    <th>Tam</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {designs.map((d, i) => (
                    <tr key={i}>
                      <td><strong>{d.nome}</strong></td>
                      <td>{d.abordagem}</td>
                      <td>{d.cromatismo}</td>
                      <td>{d.tamanho_estampa}</td>
                      <td className={d.status === 'Pronto' ? 'tag-success' : d.status === 'Tela gravada' ? 'tag-warning' : 'tag-neutral'}>
                        {d.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>  {/* fecha o grid 1fr 1fr */}

      {/* INFERÊNCIA */}
      {!isNew && form.status_ingresso && form.status_ingresso !== 'não participei' && (
        <div className="win-window">
          <div className="win-titlebar" style={{ background: 'linear-gradient(to right, #806800, #C9A84C)' }}>
            <span>🧮 Sugestão de Produção</span>
          </div>
          <div style={{ padding: '8px', background: '#c0c0c0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '8px' }}>
              <div className="sunken" style={{ padding: '6px', textAlign: 'center', background: '#fff' }}>
                <div style={{ fontSize: '10px', color: '#808080' }}>Mínimo</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#806800' }}>{inferencia.volume_min}</div>
                <div style={{ fontSize: '10px' }}>peças</div>
              </div>
              <div className="sunken" style={{ padding: '6px', textAlign: 'center', background: '#ffffc0' }}>
                <div style={{ fontSize: '10px', color: '#808080' }}>Sugerido</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#C9A84C' }}>{inferencia.volume_sugerido}</div>
                <div style={{ fontSize: '10px' }}>peças</div>
              </div>
              <div className="sunken" style={{ padding: '6px', textAlign: 'center', background: '#fff' }}>
                <div style={{ fontSize: '10px', color: '#808080' }}>Máximo</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#806800' }}>{inferencia.volume_max}</div>
                <div style={{ fontSize: '10px' }}>peças</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '8px' }}>
              <div className="sunken" style={{ padding: '4px 8px', background: '#fff' }}>
                <div style={{ fontSize: '10px', color: '#808080' }}>Receita estimada</div>
                <div style={{ fontWeight: 'bold', color: '#006400' }}>R$ {inferencia.receita_estimada.toFixed(0)}</div>
              </div>
              <div className="sunken" style={{ padding: '4px 8px', background: '#fff' }}>
                <div style={{ fontSize: '10px', color: '#808080' }}>Margem estimada</div>
                <div style={{ fontWeight: 'bold', color: '#2B5BE0' }}>R$ {inferencia.margem_estimada.toFixed(0)}</div>
              </div>
            </div>
            {inferencia.alertas.map((a, i) => (
              <div key={i} style={{ fontSize: '11px', color: '#CC2200', padding: '1px 0' }}>{a}</div>
            ))}
            {inferencia.notas.map((n, i) => (
              <div key={i} style={{ fontSize: '11px', color: '#808080', padding: '1px 0' }}>{n}</div>
            ))}
          </div>
        </div>
      )}

      {/* PEÇAS */}

      {/* PEÇAS */}
      {!isNew && (
        <div className="win-window">
          <div className="win-titlebar">
            <span>👕 Peças</span>
            <span style={{ fontSize: '11px', fontWeight: 'normal' }}>
              Total: {totalPecas} pç
              {totalVendidas > 0 && ` · Vendidas: ${totalVendidas} · Taxa: ${Math.round(totalVendidas / totalPecas * 100)}%`}
            </span>
          </div>
          <div style={{ padding: '8px', background: '#c0c0c0', display: 'flex', flexDirection: 'column', gap: '8px' }}>

            <form onSubmit={handleAddPiece} style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {[
                { label: 'Tipo', key: 'tipo', opts: ['Camiseta', 'Manga longa', 'Moletom'] },
                { label: 'Malha', key: 'qualidade_malha', opts: ['Fina', 'Média', 'Grossa'] },
                { label: 'Tamanho', key: 'tamanho', opts: ['PP', 'P', 'M', 'G', 'GG'] },
              ].map(({ label, key, opts }) => (
                <div key={key}>
                  <label style={{ fontSize: '10px', display: 'block' }}>{label}:</label>
                  <select style={{ width: '90px' }} value={newPiece[key as keyof Piece] as string}
                    onChange={e => setNewPiece({ ...newPiece, [key]: e.target.value })}>
                    <option value="">—</option>
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label style={{ fontSize: '10px', display: 'block' }}>Cor:</label>
                <input style={{ width: '80px' }} value={newPiece.cor_malha}
                  onChange={e => setNewPiece({ ...newPiece, cor_malha: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '10px', display: 'block' }}>Qtd:</label>
                <input type="number" style={{ width: '60px' }} value={newPiece.quantidade || ''}
                  onChange={e => setNewPiece({ ...newPiece, quantidade: Number(e.target.value) })} />
              </div>
              <div>
                <label style={{ fontSize: '10px', display: 'block' }}>Preço R$:</label>
                <input type="number" style={{ width: '70px' }} value={newPiece.preco_medio || ''}
                  onChange={e => setNewPiece({ ...newPiece, preco_medio: Number(e.target.value) })} />
              </div>
              <button type="submit" className="win-btn win-btn-primary">+ Adicionar</button>
            </form>

            <table className="win-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Cor</th>
                  <th>Malha</th>
                  <th>Tam</th>
                  <th>Qtd</th>
                  <th>Vendidas</th>
                  <th>Preço</th>
                  <th>Taxa</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pieces.map((p, i) => (
                  <tr key={p.id ?? i} className="group">
                    <td>{p.tipo}</td>
                    <td>{p.cor_malha}</td>
                    <td>{p.qualidade_malha}</td>
                    <td>{p.tamanho}</td>
                    <td>
                      <input type="number" defaultValue={p.quantidade} style={{ width: '50px' }}
                        onBlur={e => updatePiece(p.id!, { quantidade: Number(e.target.value) })} />
                    </td>
                    <td>
                      <input type="number" defaultValue={p.vendidas} style={{ width: '50px', color: '#006400' }}
                        onBlur={e => updatePiece(p.id!, { vendidas: Number(e.target.value) })} />
                    </td>
                    <td>
                      <input type="number" defaultValue={p.preco_medio} style={{ width: '60px' }}
                        onBlur={e => updatePiece(p.id!, { preco_medio: Number(e.target.value) })} />
                    </td>
                    <td className={p.quantidade > 0 && p.vendidas / p.quantidade >= 0.8 ? 'tag-success' : p.quantidade > 0 && p.vendidas / p.quantidade >= 0.5 ? 'tag-warning' : 'tag-danger'}>
                      {p.quantidade > 0 ? `${Math.round(p.vendidas / p.quantidade * 100)}%` : '—'}
                    </td>
                    <td>
                      <button type="button" className="win-btn win-btn-danger"
                        style={{ fontSize: '10px', padding: '1px 4px' }}
                        onClick={() => deletePiece(p.id!)}>✕</button>
                    </td>
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