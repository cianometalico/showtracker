'use client'

import { searchArtist, type MBArtist } from '@/lib/musicbrainz'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
  musicbrainz_id?: string
  pais?: string
}

const emptyForm = {
  nome: '', genero: '', geracao_predominante: '', porte_fisico: '',
  energia: 3, perfil_estetico: 3, historico: '', propensao_compra: 3,
}

export default function Artists() {
  const router = useRouter()
  const [artists, setArtists] = useState<Artist[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editando, setEditando] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Artist>>({})
  const [enriching, setEnriching] = useState(false)
  const [enrichLog, setEnrichLog] = useState<{ nome: string; status: 'ok' | 'manual' | 'skip' | 'erro'; detalhe?: string }[]>([])
  const [enrichProgress, setEnrichProgress] = useState(0)
  const [enrichTotal, setEnrichTotal] = useState(0)
  const [enrichDone, setEnrichDone] = useState(false)

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

  async function buscarMusicBrainz(artistId: string, nome: string) {

    const res = await fetch(`/api/musicbrainz?nome=${encodeURIComponent(nome)}`)
    const data = await res.json()
    const resultados = (data.artists ?? []).map((a: any) => ({
      id: a.id,
      name: a.name,
      country: a.country,
      genres: a.tags?.map((t: any) => t.name) ?? [],
      disambiguation: a.disambiguation,
      begin: a['life-span']?.begin?.slice(0, 4),
    }))
  }

  async function aplicarMB(artistId: string, mb: MBArtist) {
    const generoMap: Record<string, string> = {
      'rock': 'Rock', 'metal': 'Metal', 'hardcore': 'HC', 'punk': 'HC',
      'post-hardcore': 'HC', 'emo': 'Emo', 'pop': 'Pop',
      'electronic': 'Eletrônico', 'jazz': 'Jazz', 'mpb': 'MPB',
      'indie': 'Rock', 'post-rock': 'Rock', 'death metal': 'Metal',
      'black metal': 'Metal', 'progressive': 'Rock',
    }

    const generos = mb.genres?.map(g => g.toLowerCase()) ?? []
    let generoFinal = ''
    for (const [key, val] of Object.entries(generoMap)) {
      if (generos.some(g => g.includes(key))) { generoFinal = val; break }
    }

    const update: Record<string, unknown> = {
      musicbrainz_id: mb.id,
      pais: mb.country ?? '',
    }
    if (generoFinal) update.genero = generoFinal

    const { error } = await supabase.from('artists').update(update).eq('id', artistId)
    if (error) { console.error(error); return }

    fetchArtists()
  }

  async function autoEnriquecer() {
    setEnriching(true)
    setEnrichDone(false)
    setEnrichLog([])
    setEnrichProgress(0)
    setEnrichTotal(artists.length)

    const generoMap: Record<string, string> = {
      'rock': 'Rock', 'metal': 'Metal', 'hardcore': 'HC', 'punk': 'HC',
      'post-hardcore': 'HC', 'emo': 'Emo', 'pop': 'Pop',
      'electronic': 'Eletrônico', 'jazz': 'Jazz', 'mpb': 'MPB',
      'indie': 'Rock', 'post-rock': 'Rock', 'death metal': 'Metal',
      'black metal': 'Metal', 'progressive': 'Rock',
    }

    for (let i = 0; i < artists.length; i++) {
      const a = artists[i]
      setEnrichProgress(i + 1)

      // Já tem MBID — pula
      if (a.musicbrainz_id) {
        setEnrichLog(prev => [...prev, { nome: a.nome, status: 'skip', detalhe: 'já tem MBID' }])
        continue
      }

      try {
        const res = await fetch(`/api/musicbrainz?nome=${encodeURIComponent(a.nome)}`)
        const data = await res.json()
        const candidates = (data.artists ?? []).map((mb: any) => ({
          id: mb.id,
          name: mb.name,
          country: mb.country,
          genres: mb.tags?.map((t: any) => t.name) ?? [],
          disambiguation: mb.disambiguation,
          begin: mb['life-span']?.begin?.slice(0, 4),
        }))

        const { bestMatch } = await import('@/lib/mbmatch')
        const result = bestMatch(a.nome, candidates)

        if (!result) {
          setEnrichLog(prev => [...prev, { nome: a.nome, status: 'skip', detalhe: 'sem resultados' }])
        } else if (result.auto) {
          const mb = result.candidate
          const generos = mb.genres?.map((g: string) => g.toLowerCase()) ?? []
          let generoFinal = a.genero ?? ''
          for (const [key, val] of Object.entries(generoMap)) {
            if (generos.some((g: string) => g.includes(key))) { generoFinal = val; break }
          }
          await supabase.from('artists').update({
            musicbrainz_id: mb.id,
            pais: mb.country ?? '',
            ...(generoFinal && { genero: generoFinal }),
          }).eq('id', a.id)
          setEnrichLog(prev => [...prev, { nome: a.nome, status: 'ok', detalhe: `${mb.name} (${(result.score * 100).toFixed(0)}%)` }])
        } else {
          setEnrichLog(prev => [...prev, { nome: a.nome, status: 'manual', detalhe: `melhor match: ${result.candidate.name} (${(result.score * 100).toFixed(0)}%)` }])
        }
      } catch {
        setEnrichLog(prev => [...prev, { nome: a.nome, status: 'erro' }])
      }

      // Rate limit — 1 req/s
      await new Promise(r => setTimeout(r, 1100))
    }

    setEnrichDone(true)
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
              {['Rock', 'Metal', 'HC', 'Emo', 'Pop', 'Eletrônico', 'MPB', 'Jazz', 'Outro'].map(g => <option key={g}>{g}</option>)}
            </select>

            <label style={{ fontSize: '11px' }}>Geração:</label>
            <select style={{ width: '100%' }} value={form.geracao_predominante}
              onChange={e => setForm({ ...form, geracao_predominante: e.target.value })}>
              <option value="">—</option>
              {['até 20', '20-30', '30-40', '40+'].map(g => <option key={g}>{g}</option>)}
            </select>

            <label style={{ fontSize: '11px' }}>Porte físico:</label>
            <select style={{ width: '100%' }} value={form.porte_fisico}
              onChange={e => setForm({ ...form, porte_fisico: e.target.value })}>
              <option value="">—</option>
              {['Miúdo', 'Médio', 'Grande'].map(g => <option key={g}>{g}</option>)}
            </select>

            <label style={{ fontSize: '11px' }}>Histórico:</label>
            <select style={{ width: '100%' }} value={form.historico}
              onChange={e => setForm({ ...form, historico: e.target.value })}>
              <option value="">—</option>
              {['Excelente', 'Bom', 'Fraco', 'Sem histórico'].map(g => <option key={g}>{g}</option>)}
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
          <button className="win-btn" style={{ fontSize: '11px', padding: '1px 8px' }}
            onClick={autoEnriquecer} disabled={enriching}>
            {enriching ? '⏳ Enriquecendo...' : '✨ Auto-enriquecer'}
          </button>
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
                <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/database/artistas/${a.id}`)}>
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
                  <td onClick={e => e.stopPropagation()}>
                    <button className="win-btn win-btn-danger" style={{ fontSize: '11px', padding: '1px 6px' }}
                      onClick={() => handleDelete(a.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {enriching || enrichDone ? (
        <div style={{
          position: 'fixed', bottom: '28px', right: '16px', width: '380px', zIndex: 9999,
        }} className="win-window">
          <div className="win-titlebar" style={{ background: 'linear-gradient(to right, #4a1080, #9b4dca)' }}>
            <span>✨ Auto-enriquecimento MusicBrainz</span>
            {enrichDone && (
              <button className="win-titlebar-btn" onClick={() => { setEnriching(false); setEnrichDone(false); setEnrichLog([]) }}>✕</button>
            )}
          </div>
          <div style={{ padding: '8px', background: '#c0c0c0', display: 'flex', flexDirection: 'column', gap: '6px' }}>

            {/* BARRA DE PROGRESSO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
              <span>{enrichDone ? '✓ Concluído' : `Processando...`}</span>
              <span>{enrichProgress}/{enrichTotal}</span>
            </div>
            <div className="sunken" style={{ background: '#fff', height: '12px', padding: '1px' }}>
              <div style={{
                height: '100%',
                width: `${enrichTotal > 0 ? (enrichProgress / enrichTotal) * 100 : 0}%`,
                background: enrichDone ? '#006400' : '#4a1080',
                transition: 'width 0.3s',
              }} />
            </div>

            {/* STATS */}
            {enrichLog.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                <span style={{ color: '#006400' }}>✓ {enrichLog.filter(l => l.status === 'ok').length} auto</span>
                <span style={{ color: '#806800' }}>⚠ {enrichLog.filter(l => l.status === 'manual').length} manual</span>
                <span style={{ color: '#808080' }}>○ {enrichLog.filter(l => l.status === 'skip').length} skip</span>
                <span style={{ color: '#CC2200' }}>✗ {enrichLog.filter(l => l.status === 'erro').length} erro</span>
              </div>
            )}

            {/* LOG */}
            <div className="sunken" style={{
              background: '#fff', height: '160px', overflowY: 'auto',
              padding: '4px', fontFamily: 'monospace', fontSize: '10px',
            }}>
              {enrichLog.map((l, i) => (
                <div key={i} style={{
                  color: l.status === 'ok' ? '#006400' : l.status === 'manual' ? '#806800' : l.status === 'erro' ? '#CC2200' : '#808080',
                  padding: '1px 0',
                }}>
                  {l.status === 'ok' ? '✓' : l.status === 'manual' ? '⚠' : l.status === 'erro' ? '✗' : '○'} {l.nome}
                  {l.detalhe ? ` — ${l.detalhe}` : ''}
                </div>
              ))}
            </div>

            {enrichDone && (
              <div style={{ fontSize: '11px', color: '#808080', textAlign: 'center' }}>
                {enrichLog.filter(l => l.status === 'manual').length > 0
                  ? `${enrichLog.filter(l => l.status === 'manual').length} artistas precisam de revisão manual — clique em ✎ para abrir.`
                  : 'Todos os artistas foram enriquecidos automaticamente.'}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}