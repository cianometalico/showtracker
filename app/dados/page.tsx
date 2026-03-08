'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Papa from 'papaparse'

type NotionRow = {
  Data: string
  'Artista/Banda': string
  Local: string
  Prioridade: string
  Resultado: string
}

type PiecesRow = {
  Artista: string
  Data: string
  Quantidade: string
  Vendidas: string
  Preco: string
}

type ImportResult = {
  total: number
  importados: number
  ignorados: number
  erros: string[]
}

function mapResultado(valor: string): string {
  if (!valor) return ''
  const v = valor.toUpperCase()
  if (v.includes('SUCESSO TOTAL')) return 'Excelente'
  if (v.includes('SUCESSO')) return 'Bom'
  if (v.includes('MÉDIO') || v.includes('MEDIO')) return 'Razoável'
  if (v.includes('FRACASSO')) return 'Ruim'
  return ''
}

function mapExpectativa(valor: string): { status: string; participou: boolean } {
  if (!valor) return { status: '', participou: true }
  const v = valor.toUpperCase()
  if (v.includes('ALTA')) return { status: 'sold out', participou: true }
  if (v.includes('MÉDIA') || v.includes('MEDIA')) return { status: 'lotes intermediários', participou: true }
  if (v.includes('BAIXA')) return { status: 'mal vendido', participou: true }
  if (v.includes('NULA')) return { status: 'não participei', participou: false }
  return { status: '', participou: true }
}

async function buscarCoordenadas(local: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = encodeURIComponent(`${local}, Brasil`)
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`)
    const data = await res.json()
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {}
  return null
}

export default function Dados() {
  const [tab, setTab] = useState<'shows' | 'pecas' | 'revisao'>('shows')
  const [resultado, setResultado] = useState<ImportResult | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [venues, setVenues] = useState<any[]>([])
  const [editando, setEditando] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [salvo, setSalvo] = useState<string | null>(null)

  async function fetchVenues() {
    const { data } = await supabase.from('venues').select('*').order('nome')
    if (data) setVenues(data)
  }

  async function salvarVenue(id: string) {
    await supabase.from('venues').update(editForm).eq('id', id)
    setSalvo(id)
    setTimeout(() => setSalvo(null), 2000)
    setEditando(null)
    fetchVenues()
  }

  async function reprocessarGeo(id: string, nome: string) {
    const query = encodeURIComponent(`${nome}, Brasil`)
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`)
    const data = await res.json()
    if (data.length > 0) {
      await supabase.from('venues').update({
        lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon)
      }).eq('id', id)
      fetchVenues()
    }
  }

  async function importarShows(file: File) {
    setCarregando(true)
    const erros: string[] = []
    let importados = 0, ignorados = 0

    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as NotionRow[]
        for (const row of rows) {
          try {
            const artista = row['Artista/Banda']?.trim()
            const local = row['Local']?.trim()
            const data = row['Data']?.trim()
            if (!artista || !data || artista.includes('http')) { ignorados++; continue }

            let artistId: string
            const { data: artistExist } = await supabase.from('artists').select('id').ilike('nome', artista).single()
            if (artistExist) {
              artistId = artistExist.id
            } else {
              const { data: newArtist } = await supabase.from('artists').insert([{ nome: artista }]).select('id').single()
              artistId = newArtist?.id
            }

            let venueId: string | null = null
            if (local) {
              const { data: venueExist } = await supabase.from('venues').select('id').ilike('nome', local).single()
              if (venueExist) {
                venueId = venueExist.id
              } else {
                const coords = await buscarCoordenadas(local)
                const { data: newVenue } = await supabase.from('venues').insert([{
                  nome: local, cidade: 'São Paulo', capacidade: 0,
                  lat: coords?.lat ?? null, lng: coords?.lng ?? null,
                }]).select('id').single()
                venueId = newVenue?.id
              }
            }

            const { status, participou } = mapExpectativa(row['Prioridade'])
            const resultado_geral = mapResultado(row['Resultado'])
            const partes = data.split('/')
            const dataFormatada = partes.length === 3
              ? `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`
              : data

            await supabase.from('shows').insert([{
              artist_id: artistId, venue_id: venueId, data: dataFormatada,
              status_ingresso: status, participou, resultado_geral, publico_estimado: 0,
            }])
            importados++
          } catch {
            erros.push(`Erro: ${row['Artista/Banda']} - ${row['Data']}`)
            ignorados++
          }
        }
        setResultado({ total: rows.length, importados, ignorados, erros })
        setCarregando(false)
      }
    })
  }

  async function importarPecas(file: File) {
    setCarregando(true)
    const erros: string[] = []
    let importados = 0, ignorados = 0

    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as PiecesRow[]
        for (const row of rows) {
          try {
            const artista = row['Artista']?.trim()
            const data = row['Data']?.trim()
            if (!artista || !data) { ignorados++; continue }

            const partes = data.split('/')
            const dataFormatada = partes.length === 3
              ? `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`
              : data

            const { data: artistData } = await supabase.from('artists').select('id').ilike('nome', artista).single()
            if (!artistData) { erros.push(`Artista não encontrado: ${artista}`); ignorados++; continue }

            const { data: showData } = await supabase.from('shows')
              .select('id').eq('artist_id', artistData.id).eq('data', dataFormatada).single()
            if (!showData) { erros.push(`Show não encontrado: ${artista} - ${data}`); ignorados++; continue }

            await supabase.from('pieces').insert([{
              show_id: showData.id, tipo: 'Camiseta', cor_malha: '',
              qualidade_malha: '', tamanho: '',
              quantidade: Number(row['Quantidade']) || 0,
              vendidas: Number(row['Vendidas']) || 0,
              preco_medio: Number(row['Preco']) || 0,
            }])
            importados++
          } catch {
            erros.push(`Erro: ${row['Artista']} - ${row['Data']}`)
            ignorados++
          }
        }
        setResultado({ total: rows.length, importados, ignorados, erros })
        setCarregando(false)
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* TABS */}
      <div className="win-window">
        <div className="win-titlebar"><span>💾 Dados</span></div>
        <div style={{ padding: '4px 8px', background: '#c0c0c0', display: 'flex', gap: '4px' }}>
          {([['shows', '📥 Importar Shows'], ['pecas', '👕 Importar Peças'], ['revisao', '🗺 Revisão de Locais']] as const).map(([key, label]) => (
            <button key={key} type="button"
              className={`win-btn ${tab === key ? 'win-btn-primary' : ''}`}
              onClick={() => { setTab(key); setResultado(null); if (key === 'revisao') fetchVenues() }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* IMPORTAR SHOWS */}
      {tab === 'shows' && (
        <div className="win-window">
          <div className="win-titlebar"><span>📥 Importar Shows do Notion</span></div>
          <div style={{ padding: '12px', background: '#c0c0c0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="win-inset" style={{ padding: '8px', fontSize: '11px' }}>
              <strong>Como exportar do Notion:</strong><br />
              1. Abre a tabela no Notion<br />
              2. Clica em ··· → Exportar → CSV<br />
              3. Faz upload abaixo
            </div>
            <input type="file" accept=".csv" style={{ fontSize: '12px' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) importarShows(f) }} />
            {carregando && <p style={{ fontSize: '12px', color: '#808080' }}>⏳ Importando...</p>}
            {resultado && <ResultadoImport resultado={resultado} />}
          </div>
        </div>
      )}

      {/* IMPORTAR PEÇAS */}
      {tab === 'pecas' && (
        <div className="win-window">
          <div className="win-titlebar"><span>👕 Importar Histórico de Peças</span></div>
          <div style={{ padding: '12px', background: '#c0c0c0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="win-inset" style={{ padding: '8px', fontFamily: 'monospace', fontSize: '11px' }}>
              Artista, Data, Quantidade, Vendidas, Preco
            </div>
            <p style={{ fontSize: '11px', color: '#808080' }}>Uma linha por show. O sistema cruza Artista + Data para vincular ao show correto.</p>
            <input type="file" accept=".csv" style={{ fontSize: '12px' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) importarPecas(f) }} />
            {carregando && <p style={{ fontSize: '12px', color: '#808080' }}>⏳ Importando...</p>}
            {resultado && <ResultadoImport resultado={resultado} />}
          </div>
        </div>
      )}

      {/* REVISÃO */}
      {tab === 'revisao' && (
        <div className="win-window">
          <div className="win-titlebar"><span>🗺 Revisão de Locais</span></div>
          <div style={{ padding: '4px', background: '#c0c0c0' }}>
            <table className="win-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Cidade</th>
                  <th>Coordenadas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {venues.map(v => (
                  editando === v.id ? (
                    <tr key={v.id} style={{ background: '#ffffc0' }}>
                      <td><input style={{ width: '160px' }} value={editForm.nome ?? ''}
                        onChange={e => setEditForm({ ...editForm, nome: e.target.value })} /></td>
                      <td><input style={{ width: '100px' }} value={editForm.cidade ?? ''}
                        onChange={e => setEditForm({ ...editForm, cidade: e.target.value })} /></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <input type="number" step="any" style={{ width: '80px' }} placeholder="lat"
                          value={editForm.lat ?? ''}
                          onChange={e => setEditForm({ ...editForm, lat: parseFloat(e.target.value) })} />
                        {' '}
                        <input type="number" step="any" style={{ width: '80px' }} placeholder="lng"
                          value={editForm.lng ?? ''}
                          onChange={e => setEditForm({ ...editForm, lng: parseFloat(e.target.value) })} />
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="win-btn" style={{ fontSize: '11px', padding: '1px 6px', marginRight: '2px' }}
                          onClick={() => salvarVenue(v.id)}>OK</button>
                        <button className="win-btn" style={{ fontSize: '11px', padding: '1px 6px', marginRight: '2px' }}
                          onClick={() => reprocessarGeo(v.id, editForm.nome ?? v.nome)}>🌐</button>
                        <button className="win-btn" style={{ fontSize: '11px', padding: '1px 6px' }}
                          onClick={() => setEditando(null)}>✕</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={v.id} style={{ background: salvo === v.id ? '#c8ffc8' : undefined }}>
                      <td><strong>{v.nome}</strong></td>
                      <td>{v.cidade}</td>
                      <td>
                        {v.lat && v.lng
                          ? <span className="tag-success">✓ {v.lat.toFixed(3)}, {v.lng.toFixed(3)}</span>
                          : <span className="tag-danger">✗ Sem geo</span>}
                      </td>
                      <td>
                        <button className="win-btn" style={{ fontSize: '11px', padding: '1px 6px' }}
                          onClick={() => { setEditando(v.id); setEditForm({ ...v }) }}>✎</button>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function ResultadoImport({ resultado }: { resultado: ImportResult }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <table className="win-table" style={{ width: 'auto' }}>
        <thead>
          <tr><th>Total</th><th>Importados</th><th>Ignorados</th></tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ textAlign: 'center' }}><strong>{resultado.total}</strong></td>
            <td style={{ textAlign: 'center' }} className="tag-success"><strong>{resultado.importados}</strong></td>
            <td style={{ textAlign: 'center' }} className="tag-warning"><strong>{resultado.ignorados}</strong></td>
          </tr>
        </tbody>
      </table>
      {resultado.erros.length > 0 && (
        <div className="win-inset" style={{ padding: '8px', maxHeight: '200px', overflowY: 'auto' }}>
          {resultado.erros.map((e, i) => (
            <div key={i} style={{ fontSize: '11px', color: '#CC2200' }}>{e}</div>
          ))}
        </div>
      )}
      {resultado.importados > 0 && (
        <a href="/agenda" className="win-btn win-btn-primary" style={{ textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}>
          Ver Agenda →
        </a>
      )}
    </div>
  )
}