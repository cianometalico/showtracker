'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Artist = {
  id: string
  nome: string
  genero: string
  geracao_predominante: string
  porte_fisico: string
  energia: number
  perfil_estetico: number
  propensao_compra: number
  historico: string
  pais: string
  musicbrainz_id: string
}

type Show = {
  id: string
  data: string
  resultado_geral: string
  venues: { nome: string } | null
  pieces: { quantidade: number; vendidas: number }[] | null
}

type MBArtist = {
  id: string
  name: string
  country?: string
  genres?: string[]
  disambiguation?: string
  begin?: string
}

type Setlist = {
  id: string
  eventDate: string
  venue: { name: string; city: { name: string } }
  sets: { set: { song: { name: string }[] }[] }
}

export default function ArtistPage() {
  const { id } = useParams()
  const router = useRouter()

  const [artist, setArtist] = useState<Artist | null>(null)
  const [form, setForm] = useState<Partial<Artist>>({})
  const [shows, setShows] = useState<Show[]>([])
  const [mbResultados, setMbResultados] = useState<MBArtist[]>([])
  const [mbBuscando, setMbBuscando] = useState(false)
  const [setlists, setSetlists] = useState<Setlist[]>([])
  const [setlistBuscando, setSetlistBuscando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    const { data: a } = await supabase.from('artists').select('*').eq('id', id).single()
    if (a) { setArtist(a); setForm(a) }

    const { data: s } = await supabase
      .from('shows')
      .select('id, data, resultado_geral, venues(nome), pieces(quantidade, vendidas)')
      .eq('artist_id', id)
      .order('data', { ascending: false })
    if (s) setShows(s as unknown as Show[])
  }

  async function handleSave() {
    setSalvando(true)
    await supabase.from('artists').update(form).eq('id', id)
    setSalvando(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    fetchAll()
  }

  async function handleDelete() {
    if (!confirm('Deletar este artista? Isso não deleta os shows associados.')) return
    await supabase.from('artists').delete().eq('id', id)
    router.push('/database/artistas')
  }

  async function buscarMusicBrainz() {
    if (!artist) return
    setMbBuscando(true)
    setMbResultados([])
    const res = await fetch(`/api/musicbrainz?nome=${encodeURIComponent(artist.nome)}`)
    const data = await res.json()
    const resultados = (data.artists ?? []).map((a: any) => ({
      id: a.id,
      name: a.name,
      country: a.country,
      genres: a.tags?.map((t: any) => t.name) ?? [],
      disambiguation: a.disambiguation,
      begin: a['life-span']?.begin?.slice(0, 4),
    }))
    setMbResultados(resultados)
    setMbBuscando(false)
  }

  async function aplicarMB(mb: MBArtist) {
    const generoMap: Record<string, string> = {
      'rock': 'Rock', 'metal': 'Metal', 'hardcore': 'HC', 'punk': 'HC',
      'post-hardcore': 'HC', 'emo': 'Emo', 'pop': 'Pop',
      'electronic': 'Eletrônico', 'jazz': 'Jazz', 'mpb': 'MPB',
      'indie': 'Rock', 'post-rock': 'Rock', 'death metal': 'Metal',
      'black metal': 'Metal', 'progressive': 'Rock',
    }
    const generos = mb.genres?.map(g => g.toLowerCase()) ?? []
    let generoFinal = form.genero ?? ''
    for (const [key, val] of Object.entries(generoMap)) {
      if (generos.some(g => g.includes(key))) { generoFinal = val; break }
    }

    const novoForm = {
      ...form,
      musicbrainz_id: mb.id,
      pais: mb.country ?? form.pais ?? '',
      genero: generoFinal,
    }
    setForm(novoForm)
    await supabase.from('artists').update(novoForm).eq('id', id)
    setMbResultados([])
    fetchAll()

    // Se tem mbid, busca setlists
    buscarSetlists(mb.id)
  }

  async function buscarSetlists(mbid?: string) {
    const target = mbid ?? artist?.musicbrainz_id
    if (!target) return
    setSetlistBuscando(true)
    const res = await fetch(`/api/setlistfm?mbid=${target}`)
    const data = await res.json()
    setSetlists(data.setlist ?? [])
    setSetlistBuscando(false)
  }

  function topSongs(): string[] {
    const freq: Record<string, number> = {}
    for (const sl of setlists) {
      for (const set of sl.sets?.set ?? []) {
        for (const song of set.song ?? []) {
          if (song.name) freq[song.name] = (freq[song.name] ?? 0) + 1
        }
      }
    }
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n]) => n)
  }

  const totalPecas = shows.reduce((acc, s) => acc + (s.pieces?.reduce((a, p) => a + p.quantidade, 0) ?? 0), 0)
  const totalVendidas = shows.reduce((acc, s) => acc + (s.pieces?.reduce((a, p) => a + p.vendidas, 0) ?? 0), 0)
  const taxaGeral = totalPecas > 0 ? Math.round(totalVendidas / totalPecas * 100) : 0

  if (!artist) return <div style={{ padding: '16px', color: '#808080' }}>Carregando...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* HEADER */}
      <div className="win-window">
        <div className="win-titlebar">
          <span>🎸 {artist.nome}</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="win-btn" style={{ fontSize: '11px', padding: '1px 8px' }}
              onClick={() => router.push('/database/artistas')}>← Voltar</button>
            <button className="win-btn win-btn-danger" style={{ fontSize: '11px', padding: '1px 8px' }}
              onClick={handleDelete}>Deletar</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

        {/* DADOS CADASTRAIS */}
        <div className="win-window">
          <div className="win-titlebar"><span>📋 Dados Cadastrais</span></div>
          <div style={{ padding: '8px', background: '#c0c0c0', display: 'flex', flexDirection: 'column', gap: '6px' }}>

            <label style={{ fontSize: '11px' }}>Nome:</label>
            <input style={{ width: '100%' }} value={form.nome ?? ''}
              onChange={e => setForm({ ...form, nome: e.target.value })} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div>
                <label style={{ fontSize: '11px', display: 'block' }}>Gênero:</label>
                <select style={{ width: '100%' }} value={form.genero ?? ''}
                  onChange={e => setForm({ ...form, genero: e.target.value })}>
                  <option value="">—</option>
                  {['Rock','Metal','HC','Emo','Pop','Eletrônico','MPB','Jazz','Outro'].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', display: 'block' }}>País:</label>
                <input style={{ width: '100%' }} value={form.pais ?? ''}
                  onChange={e => setForm({ ...form, pais: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '11px', display: 'block' }}>Geração:</label>
                <select style={{ width: '100%' }} value={form.geracao_predominante ?? ''}
                  onChange={e => setForm({ ...form, geracao_predominante: e.target.value })}>
                  <option value="">—</option>
                  {['até 20','20-30','30-40','40+'].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', display: 'block' }}>Porte físico:</label>
                <select style={{ width: '100%' }} value={form.porte_fisico ?? ''}
                  onChange={e => setForm({ ...form, porte_fisico: e.target.value })}>
                  <option value="">—</option>
                  {['Miúdo','Médio','Grande'].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', display: 'block' }}>Histórico:</label>
                <select style={{ width: '100%' }} value={form.historico ?? ''}
                  onChange={e => setForm({ ...form, historico: e.target.value })}>
                  <option value="">—</option>
                  {['Excelente','Bom','Fraco','Sem histórico'].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {[
              { label: 'Energia', key: 'energia', left: 'Frio', right: 'Quente' },
              { label: 'Estética', key: 'perfil_estetico', left: 'Conservador', right: 'Aberto' },
              { label: 'Propensão', key: 'propensao_compra', left: 'Baixa', right: 'Alta' },
            ].map(({ label, key, left, right }) => (
              <div key={key}>
                <label style={{ fontSize: '11px' }}>{label}: {form[key as keyof typeof form] ?? 3}/5</label>
                <input type="range" min={1} max={5} style={{ width: '100%' }}
                  value={form[key as keyof typeof form] as number ?? 3}
                  onChange={e => setForm({ ...form, [key]: Number(e.target.value) })} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#808080' }}>
                  <span>{left}</span><span>{right}</span>
                </div>
              </div>
            ))}

            <button className={`win-btn ${saved ? 'win-btn-primary' : 'win-btn-primary'}`}
              onClick={handleSave} disabled={salvando}>
              {salvando ? '⏳ Salvando...' : saved ? '✓ Salvo!' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* MUSICBRAINZ */}
          <div className="win-window">
            <div className="win-titlebar" style={{ background: 'linear-gradient(to right, #4a1080, #9b4dca)' }}>
              <span>🎵 MusicBrainz</span>
              {artist.musicbrainz_id && (
                <span style={{ fontSize: '10px', fontWeight: 'normal', opacity: 0.8 }}>
                  ✓ {artist.musicbrainz_id.slice(0, 8)}...
                </span>
              )}
            </div>
            <div style={{ padding: '8px', background: '#c0c0c0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="win-btn win-btn-primary" style={{ flex: 1 }}
                  onClick={buscarMusicBrainz} disabled={mbBuscando}>
                  {mbBuscando ? '⏳ Buscando...' : '🔍 Buscar no MusicBrainz'}
                </button>
                {artist.musicbrainz_id && (
                  <button className="win-btn" style={{ flex: 1 }}
                    onClick={() => buscarSetlists()} disabled={setlistBuscando}>
                    {setlistBuscando ? '⏳ Buscando...' : '📋 Buscar Setlists'}
                  </button>
                )}
              </div>

              {mbResultados.length > 0 && (
                <table className="win-table">
                  <thead>
                    <tr><th>Nome</th><th>País</th><th>Gêneros</th><th>Início</th><th></th></tr>
                  </thead>
                  <tbody>
                    {mbResultados.map(mb => (
                      <tr key={mb.id}>
                        <td><strong>{mb.name}</strong></td>
                        <td>{mb.country ?? '—'}</td>
                        <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {mb.genres?.slice(0, 2).join(', ') || '—'}
                        </td>
                        <td>{mb.begin ?? '—'}</td>
                        <td>
                          <button className="win-btn win-btn-primary"
                            style={{ fontSize: '11px', padding: '1px 6px' }}
                            onClick={() => aplicarMB(mb)}>✓</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {artist.musicbrainz_id && mbResultados.length === 0 && (
                <div className="sunken" style={{ padding: '4px 8px', background: '#fff', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#808080' }}>MBID:</span>
                    <span style={{ fontFamily: 'monospace' }}>{artist.musicbrainz_id}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#808080' }}>País:</span>
                    <span>{artist.pais || '—'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STATS */}
          <div className="win-window">
            <div className="win-titlebar"><span>📊 Histórico no sistema</span></div>
            <div style={{ padding: '8px', background: '#c0c0c0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '8px' }}>
                {[
                  { label: 'Shows', value: shows.length, color: '#2B5BE0' },
                  { label: 'Peças', value: totalPecas, color: '#806800' },
                  { label: 'Taxa venda', value: `${taxaGeral}%`, color: taxaGeral >= 70 ? '#006400' : taxaGeral >= 40 ? '#806800' : '#CC2200' },
                ].map(s => (
                  <div key={s.label} className="sunken" style={{ padding: '6px', textAlign: 'center', background: '#fff' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '10px', color: '#808080' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <table className="win-table">
                <thead>
                  <tr><th>Data</th><th>Local</th><th>Resultado</th></tr>
                </thead>
                <tbody>
                  {shows.slice(0, 6).map(s => (
                    <tr key={s.id} style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/shows/${s.id}`)}>
                      <td>{new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                      <td>{s.venues?.nome ?? '—'}</td>
                      <td className={
                        s.resultado_geral === 'Excelente' ? 'tag-success' :
                        s.resultado_geral === 'Bom' ? 'tag-sage' :
                        s.resultado_geral === 'Razoável' ? 'tag-warning' :
                        s.resultado_geral === 'Ruim' ? 'tag-danger' : 'tag-neutral'
                      }>{s.resultado_geral || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* SETLISTS */}
      {setlists.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="win-window">
            <div className="win-titlebar"><span>🎵 Top músicas tocadas</span></div>
            <div style={{ padding: '4px', background: '#c0c0c0' }}>
              <table className="win-table">
                <thead><tr><th>#</th><th>Música</th></tr></thead>
                <tbody>
                  {topSongs().map((song, i) => (
                    <tr key={i}>
                      <td style={{ color: '#808080', width: '30px' }}>{i + 1}</td>
                      <td><strong>{song}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="win-window">
            <div className="win-titlebar"><span>📋 Últimos shows ({setlists.length})</span></div>
            <div style={{ padding: '4px', background: '#c0c0c0' }}>
              <table className="win-table">
                <thead><tr><th>Data</th><th>Local</th><th>Cidade</th></tr></thead>
                <tbody>
                  {setlists.slice(0, 8).map(sl => (
                    <tr key={sl.id}>
                      <td>{sl.eventDate}</td>
                      <td>{sl.venue?.name}</td>
                      <td>{sl.venue?.city?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}