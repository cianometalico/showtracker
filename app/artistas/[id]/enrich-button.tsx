'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TerminalSpinner } from '@/components/terminal-spinner'

interface Props {
  artistId: string
  artistNome: string
  artistMbid: string | null
  ultimaAtualizacao: string | null
}

type State = 'idle' | 'loading' | 'done' | 'error'

export function EnrichButton({ artistId, artistNome, artistMbid, ultimaAtualizacao }: Props) {
  const [state,   setState]   = useState<State>('idle')
  const [errMsg,  setErrMsg]  = useState('')
  const router = useRouter()

  async function handleEnrich() {
    setState('loading')
    setErrMsg('')
    try {
      let mbid = artistMbid

      if (!mbid) {
        const mbRes  = await fetch(`/api/musicbrainz?action=search&q=${encodeURIComponent(artistNome)}`)
        const mbData = await mbRes.json()
        const first  = mbData.artists?.[0]
        if (!first?.mbid) throw new Error('Artista não encontrado no MusicBrainz')
        mbid = first.mbid
      }

      const enrichRes  = await fetch(`/api/enrich?mbid=${mbid}&name=${encodeURIComponent(artistNome)}`)
      const enrichData = await enrichRes.json()
      if (enrichData.error) throw new Error(enrichData.error)

      const saveRes = await fetch('/api/artists', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mbid:            enrichData.identity?.mbid,
          name:            enrichData.identity?.name,
          country:         enrichData.identity?.country,
          type:            enrichData.identity?.type,
          founded_year:    enrichData.identity?.formedYear
            ? parseInt(enrichData.identity.formedYear)
            : null,
          tags_editorial:  enrichData.tags_editorial,
          tags_behavioral: enrichData.tags_behavioral,
          listeners:       enrichData.audience?.listeners,
          wikipedia_url:   enrichData.sources?.wikipedia
            ? `https://en.wikipedia.org/wiki/${encodeURIComponent((enrichData.identity?.name ?? '').replace(/\s+/g, '_'))}`
            : null,
        }),
      })
      const saved = await saveRes.json()
      if (!saved.id) throw new Error('Erro ao salvar artista')

      setState('done')
      router.refresh()
    } catch (e: any) {
      setState('error')
      setErrMsg(e.message ?? 'Erro desconhecido')
    }
  }

  const labelIdle = artistMbid ? 'atualizar dados' : 'enriquecer'

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <button
        onClick={handleEnrich}
        disabled={state === 'loading'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '0.4rem 1rem',
          fontSize: '0.8rem', background: 'var(--surface-raised)',
          color: 'var(--text-dim)', border: '1px solid var(--border)',
          borderRadius: 4, cursor: state === 'loading' ? 'default' : 'pointer',
          opacity: state === 'loading' ? 0.6 : 1,
        }}
      >
        {state === 'loading' ? (
          <>
            <TerminalSpinner size={12} />
            <span>enriquecendo…</span>
          </>
        ) : labelIdle}
      </button>
      {ultimaAtualizacao && state !== 'done' && (
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.75rem' }}>
          atualizado {new Date(ultimaAtualizacao).toLocaleDateString('pt-BR')}
        </span>
      )}
      {state === 'error' && (
        <p style={{ fontSize: '0.75rem', color: 'var(--red)', marginTop: 4 }}>{errMsg}</p>
      )}
    </div>
  )
}
