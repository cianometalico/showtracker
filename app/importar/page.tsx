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
  Vendedor?: string
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
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
  } catch {}
  return null
}

export default function Importar() {
  const [resultado, setResultado] = useState<ImportResult | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [preview, setPreview] = useState<NotionRow[]>([])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreview(results.data.slice(0, 5) as NotionRow[])
      }
    })
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

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

            if (!artista || !data) {
              ignorados++
              erros.push(`Linha ignorada: artista="${artista || 'vazio'}" data="${data || 'vazio'}"`)
              continue
            }

            // Cria ou busca artista
            let artistId: string
            const { data: artistExist } = await supabase
              .from('artists')
              .select('id')
              .ilike('nome', artista)
              .single()

            if (artistExist) {
              artistId = artistExist.id
            } else {
              const { data: newArtist } = await supabase
                .from('artists')
                .insert([{ nome: artista }])
                .select('id')
                .single()
              artistId = newArtist?.id
            }

            // Cria ou busca venue
            let venueId: string | null = null
            if (local) {
              const { data: venueExist } = await supabase
                .from('venues')
                .select('id')
                .ilike('nome', local)
                .single()

              if (venueExist) {
                venueId = venueExist.id
              } else {
                const coords = await buscarCoordenadas(local)
                const { data: newVenue } = await supabase
                  .from('venues')
                  .insert([{
                    nome: local,
                    cidade: 'São Paulo',
                    capacidade: 0,
                    lat: coords?.lat ?? null,
                    lng: coords?.lng ?? null,
                  }])
                  .select('id')
                  .single()
                venueId = newVenue?.id
              }
            }

            // Mapeia campos
            const { status, participou } = mapExpectativa(row['Prioridade'])
            const resultado_geral = mapResultado(row['Resultado'])

            // Formata data DD/MM/YYYY → YYYY-MM-DD
            const partes = data.split('/')
            const dataFormatada = partes.length === 3
              ? `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`
              : data

            await supabase.from('shows').insert([{
              artist_id: artistId,
              venue_id: venueId,
              data: dataFormatada,
              status_ingresso: status,
              participou,
              resultado_geral,
              publico_estimado: 0,
            }])

            importados++
          } catch (err) {
            erros.push(`Erro na linha: ${row['Artista/Banda']} - ${row['Data']}`)
            ignorados++
          }
        }

        setResultado({ total: rows.length, importados, ignorados, erros })
        setCarregando(false)
      }
    })
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold">Importar do Notion</h1>

      <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Como exportar do Notion</h2>
        <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
          <li>Abre a página da tabela no Notion</li>
          <li>Clica nos três pontos ··· no canto superior direito</li>
          <li>Clica em <span className="text-white">Exportar</span></li>
          <li>Escolhe formato <span className="text-white">CSV</span></li>
          <li>Faz o upload do arquivo abaixo</li>
        </ol>
      </div>

      <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Upload do CSV</h2>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            handleFile(e)
            handleImport(e)
          }}
          className="text-sm text-zinc-400"
        />

        {carregando && (
          <div className="text-sm text-zinc-400 animate-pulse">
            Importando... isso pode levar alguns segundos.
          </div>
        )}

        {resultado && (
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
                {resultado.erros.map((e, i) => (
                  <p key={i} className="text-xs text-red-300">{e}</p>
                ))}
              </div>
            )}

            {resultado.importados > 0 && (
              <a href="/agenda"
                className="block w-full text-center bg-white text-black font-semibold rounded-lg py-2 text-sm hover:bg-zinc-200 transition-colors">
                Ver agenda
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}