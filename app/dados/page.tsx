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

  // Revisão
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
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      }).eq('id', id)
      fetchVenues()
    }
  }

  async function importarShows(file: File) {
    setCarregando(true)
    const erros: string[] = []
    let importados = 0
    let ignorados = 0

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
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
              artist_id: artistId, venue_id: venueId,
              data: dataFormatada, status_ingresso: status,
              participou, resultado_geral, publico_estimado: 0,
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
    let importados = 0
    let ignorados = 0

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
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

            // Busca o show pelo artista + data
            const { data: artistData } = await supabase.from('artists').select('id').ilike('nome', artista).single()
            if (!artistData) { erros.push(`Artista não encontrado: ${artista}`); ignorados++; continue }

            const { data: showData } = await supabase.from('shows')
              .select('id').eq('artist_id', artistData.id).eq('data', dataFormatada).single()
            if (!showData) { erros.push(`Show não encontrado: ${artista} - ${data}`); ignorados++; continue }

            await supabase.from('pieces').insert([{
  show_id: showData.id,
  tipo: 'Camiseta',
  cor_malha: '',
  qualidade_malha: '',
  tamanho: '',
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
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-2xl font-bold">Dados</h1>

      {/* TABS */}
      <div className="flex bg-zinc-900 rounded-lg p-1 text-sm w-fit">
        {([['shows', 'Importar Shows'], ['pecas', 'Importar Peças'], ['revisao', 'Revisão de Locais']] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => { setTab(key); setResultado(null); if (key === 'revisao') fetchVenues() }}
            className={`px-4 py-1.5 rounded-md transition-colors ${tab === key ? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* IMPORTAR SHOWS */}
      {tab === 'shows' && (
        <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Importar do Notion</h2>
          <ol className="text-sm text-zinc-400 space-y-1 list-decimal list-inside">
            <li>Abre a tabela no Notion</li>
            <li>Clica em ··· → Exportar → CSV</li>
            <li>Faz upload abaixo</li>
          </ol>
          <input type="file" accept=".csv"
            onChange={e => { const f = e.target.files?.[0]; if (f) importarShows(f) }}
            className="text-sm text-zinc-400" />
          {carregando && <p className="text-sm text-zinc-400 animate-pulse">Importando...</p>}
          {resultado && <ResultadoImport resultado={resultado} />}
        </div>
      )}

      {/* IMPORTAR PEÇAS */}
      {tab === 'pecas' && (
        <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Importar Histórico de Peças</h2>
          <div className="bg-zinc-800 rounded-lg p-4 text-xs text-zinc-400 font-mono">
  Artista, Data, Quantidade, Vendidas, Preco
</div>
          <p className="text-sm text-zinc-400">Uma linha por combinação de tipo + cor + malha + tamanho. O sistema cruza Artista + Data para vincular ao show correto.</p>
          <input type="file" accept=".csv"
            onChange={e => { const f = e.target.files?.[0]; if (f) importarPecas(f) }}
            className="text-sm text-zinc-400" />
          {carregando && <p className="text-sm text-zinc-400 animate-pulse">Importando...</p>}
          {resultado && <ResultadoImport resultado={resultado} />}
        </div>
      )}

      {/* REVISÃO */}
      {tab === 'revisao' && (
        <div className="space-y-3">
          {venues.map(v => (
            <div key={v.id} className={`bg-zinc-900 rounded-xl px-6 py-4 ${salvo === v.id ? 'ring-1 ring-green-500' : ''}`}>
              {editando === v.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Nome</label>
                      <input className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
                        value={editForm.nome ?? ''} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Cidade</label>
                      <input className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm"
                        value={editForm.cidade ?? ''} onChange={e => setEditForm({ ...editForm, cidade: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Latitude</label>
                      <input className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm" type="number" step="any"
                        value={editForm.lat ?? ''} onChange={e => setEditForm({ ...editForm, lat: parseFloat(e.target.value) })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Longitude</label>
                      <input className="w-full bg-zinc-800 rounded-lg px-4 py-2 text-sm" type="number" step="any"
                        value={editForm.lng ?? ''} onChange={e => setEditForm({ ...editForm, lng: parseFloat(e.target.value) })} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => salvarVenue(v.id)}
                      className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors">
                      Salvar
                    </button>
                    <button type="button" onClick={() => reprocessarGeo(v.id, editForm.nome ?? v.nome)}
                      className="bg-zinc-700 hover:bg-zinc-600 text-sm px-4 py-2 rounded-lg transition-colors">
                      Reprocessar geo
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
                    <p className="font-medium">{v.nome}</p>
                    <p className="text-sm text-zinc-400">{v.cidade}</p>
                    {v.lat && v.lng
                      ? <p className="text-xs text-green-500 mt-1">✓ {v.lat.toFixed(4)}, {v.lng.toFixed(4)}</p>
                      : <p className="text-xs text-red-400 mt-1">✗ Sem coordenadas</p>}
                  </div>
                  <button type="button" onClick={() => { setEditando(v.id); setEditForm({ ...v }) }}
                    className="text-xs text-zinc-400 hover:text-white transition-colors underline">
                    Editar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ResultadoImport({ resultado }: { resultado: ImportResult }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-800 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">{resultado.total}</p>
          <p className="text-xs text-zinc-400">Total</p>
        </div>
        <div className="bg-zinc-800 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{resultado.importados}</p>
          <p className="text-xs text-zinc-400">Importados</p>
        </div>
        <div className="bg-zinc-800 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-yellow-400">{resultado.ignorados}</p>
          <p className="text-xs text-zinc-400">Ignorados</p>
        </div>
      </div>
      {resultado.erros.length > 0 && (
        <div className="bg-red-900/20 rounded-lg p-4 space-y-1">
          <p className="text-sm font-medium text-red-400">Erros:</p>
          {resultado.erros.map((e, i) => <p key={i} className="text-xs text-red-300">{e}</p>)}
        </div>
      )}
    </div>
  )
}