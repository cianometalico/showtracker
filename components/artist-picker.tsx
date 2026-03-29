'use client'

import { useState, useEffect } from 'react'

// ── Types ─────────────────────────────────────────────────────

export type PickedArtist = {
  id: string
  nome: string
  ordem: number
  faz_estampa: boolean
}

export type ArtistPickerProps = {
  selectedArtists: PickedArtist[]
  onArtistsChange: (artists: PickedArtist[]) => void
}

type LocalResult = { id: string; nome: string; pais: string | null }

type MBCandidate = {
  mbid: string
  nome: string
  pais: string | null
  disambiguation: string | null
  tipo: string | null
}

type Phase = 'local' | 'mb' | 'enriching'

// ── Component ─────────────────────────────────────────────────

export function ArtistPicker({ selectedArtists, onArtistsChange }: ArtistPickerProps) {
  const [phase,         setPhase]         = useState<Phase>('local')
  const [query,         setQuery]         = useState('')
  const [localResults,  setLocalResults]  = useState<LocalResult[]>([])
  const [localLoading,  setLocalLoading]  = useState(false)
  const [mbResults,     setMbResults]     = useState<MBCandidate[]>([])
  const [mbLoading,     setMbLoading]     = useState(false)
  const [enrichingNome, setEnrichingNome] = useState('')
  const [enrichError,   setEnrichError]   = useState<string | null>(null)

  // ── Fase 1: busca local com debounce 300ms ────────────────
  useEffect(() => {
    if (phase !== 'local') return
    if (query.length < 2) { setLocalResults([]); return }

    setLocalLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/artists?search=${encodeURIComponent(query)}`)
        const data = await res.json()
        const filtered = (data.artists ?? []).filter(
          (a: LocalResult) => !selectedArtists.find(s => s.id === a.id)
        )
        setLocalResults(filtered)
      } catch {
        setLocalResults([])
      } finally {
        setLocalLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, phase, selectedArtists])

  // ── Fase 2: busca MB com debounce 500ms ───────────────────
  useEffect(() => {
    if (phase !== 'mb') return
    if (query.length < 2) { setMbResults([]); return }

    setMbLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/musicbrainz?action=search&q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setMbResults(data.artists ?? [])
      } catch {
        setMbResults([])
      } finally {
        setMbLoading(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [query, phase])

  // ── Handlers ──────────────────────────────────────────────

  function addFromLocal(a: LocalResult) {
    const newList: PickedArtist[] = [
      ...selectedArtists,
      { id: a.id, nome: a.nome, ordem: selectedArtists.length + 1, faz_estampa: false },
    ]
    onArtistsChange(newList)
    setQuery('')
    setLocalResults([])
  }

  function removeArtist(id: string) {
    onArtistsChange(
      selectedArtists
        .filter(a => a.id !== id)
        .map((a, i) => ({ ...a, ordem: i + 1 }))
    )
  }

  function moveUp(i: number) {
    if (i === 0) return
    const next = [...selectedArtists]
    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
    onArtistsChange(next.map((a, idx) => ({ ...a, ordem: idx + 1 })))
  }

  function toggleEstampa(id: string) {
    onArtistsChange(
      selectedArtists.map(a => a.id === id ? { ...a, faz_estampa: !a.faz_estampa } : a)
    )
  }

  function goToMB() {
    setPhase('mb')
    setMbResults([])
    setLocalResults([])
    // mantém o query atual para pré-popular a busca MB
  }

  function backToLocal() {
    setPhase('local')
    setMbResults([])
    setLocalResults([])
  }

  async function enrichAndAdd(candidate: MBCandidate) {
    setPhase('enriching')
    setEnrichingNome(candidate.nome)
    setEnrichError(null)

    try {
      // 1. Enriquecer: MB + Last.fm + Wikipedia + Setlist.fm
      const enrichRes  = await fetch(
        `/api/enrich?mbid=${candidate.mbid}&name=${encodeURIComponent(candidate.nome)}`
      )
      const enrichData = await enrichRes.json()
      if (enrichData.error) throw new Error(enrichData.error)

      // 2. Salvar no banco via upsert
      const saveRes  = await fetch('/api/artists', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          mbid:            enrichData.identity.mbid,
          name:            enrichData.identity.name,
          country:         enrichData.identity.country,
          type:            enrichData.identity.type,
          formedYear:      enrichData.identity.formedYear,
          endedYear:       enrichData.identity.endedYear,
          tags_editorial:  enrichData.tags_editorial,
          tags_behavioral: enrichData.tags_behavioral,
          listeners:       enrichData.audience.listeners,
          wikipedia_url:   enrichData.sources.wikipedia
            ? `https://en.wikipedia.org/wiki/${encodeURIComponent(enrichData.identity.name.replace(/\s+/g, '_'))}`
            : null,
        }),
      })
      const savedData = await saveRes.json()
      if (!savedData.ok) throw new Error(savedData.error ?? 'erro ao salvar')

      // 3. Adicionar à lista selecionada
      const newList: PickedArtist[] = [
        ...selectedArtists,
        { id: savedData.id, nome: savedData.nome, ordem: selectedArtists.length + 1, faz_estampa: false },
      ]
      onArtistsChange(newList)
      setQuery('')
      setPhase('local')
    } catch (e: any) {
      setEnrichError(e.message ?? 'erro desconhecido')
      setPhase('mb')
    }
  }

  // ── Render ────────────────────────────────────────────────

  const noLocalResults = phase === 'local' && !localLoading && query.length >= 2 && localResults.length === 0

  return (
    <div>
      {/* ── Lista selecionada ── */}
      {selectedArtists.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {selectedArtists.map((a, i) => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0.3rem 0', borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', width: 16, flexShrink: 0 }}>
                {a.ordem}
              </span>
              <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text)' }}>
                {a.nome}
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={a.faz_estampa}
                  onChange={() => toggleEstampa(a.id)}
                  style={{ accentColor: 'var(--cyan)', width: 12, height: 12 }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--cyan)' }}>estampa</span>
              </label>
              {i > 0 && (
                <button onClick={() => moveUp(i)}
                  style={iconBtnStyle} title="mover para cima">↑</button>
              )}
              <button onClick={() => removeArtist(a.id)}
                style={iconBtnStyle} title="remover">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Fase 3: enriching ── */}
      {phase === 'enriching' && (
        <div style={{ padding: '0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4 }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>
            <span style={{ color: 'var(--amber)' }}>⟳</span> enriquecendo <strong style={{ color: 'var(--text)' }}>{enrichingNome}</strong>…
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            buscando mb · last.fm · wikipedia · setlist.fm
          </p>
        </div>
      )}

      {/* ── Fases 1 e 2: input + resultados ── */}
      {phase !== 'enriching' && (
        <div>
          {/* Cabeçalho fase MB */}
          {phase === 'mb' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <button onClick={backToLocal} style={{ ...iconBtnStyle, fontSize: '0.75rem', color: 'var(--cyan)' }}>
                ← busca local
              </button>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>musicbrainz</span>
            </div>
          )}

          {/* Input */}
          <div style={{ position: 'relative' }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={phase === 'mb' ? 'buscar no musicbrainz...' : 'buscar artista...'}
              style={inputStyle}
              autoFocus={phase === 'mb'}
            />
            {(localLoading || mbLoading) && (
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                ···
              </span>
            )}
          </div>

          {/* Fase 1: resultados locais */}
          {phase === 'local' && localResults.length > 0 && (
            <div style={dropdownStyle}>
              {localResults.map(a => (
                <button key={a.id} onClick={() => addFromLocal(a)} style={dropdownItemStyle}>
                  {a.nome}
                  {a.pais && <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginLeft: 6 }}>· {a.pais}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Fase 1: sem resultado → botão MB */}
          {noLocalResults && (
            <button onClick={goToMB} style={{
              marginTop: 6, fontSize: '0.8rem', color: 'var(--cyan)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}>
              buscar no musicbrainz →
            </button>
          )}

          {/* Fase 2: resultados MB */}
          {phase === 'mb' && mbResults.length > 0 && !mbLoading && (
            <div style={dropdownStyle}>
              {mbResults.map(r => (
                <button key={r.mbid} onClick={() => enrichAndAdd(r)} style={{ ...dropdownItemStyle, display: 'block' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text)' }}>{r.nome}</span>
                  {(r.pais || r.tipo) && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: 6 }}>
                      · {[r.tipo, r.pais].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {r.disambiguation && (
                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>
                      {r.disambiguation}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Fase 2: sem resultado MB */}
          {phase === 'mb' && !mbLoading && query.length >= 2 && mbResults.length === 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>
              nenhum resultado no musicbrainz
            </p>
          )}

          {/* Erro de enriquecimento */}
          {enrichError && (
            <p style={{ fontSize: '0.8rem', color: 'var(--status-neg)', marginTop: 6 }}>
              erro: {enrichError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: '0.875rem', background: 'var(--surface)', color: 'var(--text)',
  border: '1px solid var(--border)', borderRadius: 4, padding: '0.45rem 0.75rem',
  outline: 'none', boxSizing: 'border-box',
}

const dropdownStyle: React.CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 4, marginTop: 4,
  overflow: 'hidden', background: 'var(--surface)',
}

const dropdownItemStyle: React.CSSProperties = {
  width: '100%', textAlign: 'left', fontSize: '0.875rem',
  padding: '0.45rem 0.75rem', background: 'none', border: 'none',
  borderBottom: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text)',
}

const iconBtnStyle: React.CSSProperties = {
  fontSize: '0.7rem', color: 'var(--text-dim)', background: 'none',
  border: 'none', cursor: 'pointer', padding: '0 4px', flexShrink: 0,
}
