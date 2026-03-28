'use client'

import { useState, useTransition } from 'react'
import { updateArtistOverrides } from './actions'

type Nicho = {
  id: string
  nome: string
  cor: string
  underground_score: number
  letramento: number | null
  receptividade_autoral: number | null
  commodificacao: number | null
  energia: number | null
  abertura_experimental: number | null
}

type ArtistOverrides = {
  letramento: number | null
  receptividade_autoral: number | null
  commodificacao: number | null
  energia: number | null
  abertura_experimental: number | null
  geracao_override: string[] | null
  estetica_override: string[] | null
  cor_dominante_override: string[] | null
  tipo_nostalgia_override: string[] | null
}

type Props = {
  artistId: string
  overrides: ArtistOverrides
  nichoRef: Nicho | null
}

const FIELDS: { key: keyof Pick<ArtistOverrides, 'letramento'|'receptividade_autoral'|'commodificacao'|'energia'|'abertura_experimental'>; label: string }[] = [
  { key: 'letramento',            label: 'letramento' },
  { key: 'receptividade_autoral', label: 'receptividade autoral' },
  { key: 'commodificacao',        label: 'commodificação' },
  { key: 'energia',               label: 'energia' },
  { key: 'abertura_experimental', label: 'abertura experimental' },
]

export function OverrideSectionClient({ artistId, overrides, nichoRef }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [letramento,         setLetramento]        = useState(overrides.letramento ?? 0)
  const [receptividade,      setReceptividade]     = useState(overrides.receptividade_autoral ?? 0)
  const [commodificacao,     setCommodificacao]    = useState(overrides.commodificacao ?? 0)
  const [energia,            setEnergia]           = useState(overrides.energia ?? 0)
  const [abertura,           setAbertura]          = useState(overrides.abertura_experimental ?? 0)
  const [geracaoStr,         setGeracaoStr]        = useState((overrides.geracao_override ?? []).join(', '))
  const [esteticaStr,        setEsteticaStr]       = useState((overrides.estetica_override ?? []).join(', '))
  const [corDomStr,          setCorDomStr]         = useState((overrides.cor_dominante_override ?? []).join(', '))
  const [nostalgiaStr,       setNostalgiaStr]      = useState((overrides.tipo_nostalgia_override ?? []).join(', '))

  function startEdit() {
    setLetramento(overrides.letramento ?? 0)
    setReceptividade(overrides.receptividade_autoral ?? 0)
    setCommodificacao(overrides.commodificacao ?? 0)
    setEnergia(overrides.energia ?? 0)
    setAbertura(overrides.abertura_experimental ?? 0)
    setGeracaoStr((overrides.geracao_override ?? []).join(', '))
    setEsteticaStr((overrides.estetica_override ?? []).join(', '))
    setCorDomStr((overrides.cor_dominante_override ?? []).join(', '))
    setNostalgiaStr((overrides.tipo_nostalgia_override ?? []).join(', '))
    setError(null)
    setIsEditing(true)
  }

  function parseArr(v: string) {
    return v.split(',').map(s => s.trim()).filter(Boolean)
  }

  function handleSave() {
    setError(null)
    start(async () => {
      await updateArtistOverrides(artistId, {
        letramento:            letramento > 0 ? letramento : null,
        receptividade_autoral: receptividade > 0 ? receptividade : null,
        commodificacao:        commodificacao > 0 ? commodificacao : null,
        energia:               energia > 0 ? energia : null,
        abertura_experimental: abertura > 0 ? abertura : null,
        geracao_override:       parseArr(geracaoStr).length > 0 ? parseArr(geracaoStr) : null,
        estetica_override:      parseArr(esteticaStr).length > 0 ? parseArr(esteticaStr) : null,
        cor_dominante_override: parseArr(corDomStr).length > 0 ? parseArr(corDomStr) : null,
        tipo_nostalgia_override: parseArr(nostalgiaStr).length > 0 ? parseArr(nostalgiaStr) : null,
      })
      setIsEditing(false)
    })
  }

  const hasAnyOverride =
    overrides.letramento != null ||
    overrides.receptividade_autoral != null ||
    overrides.commodificacao != null ||
    overrides.energia != null ||
    overrides.abertura_experimental != null ||
    (overrides.geracao_override?.length ?? 0) > 0 ||
    (overrides.estetica_override?.length ?? 0) > 0 ||
    (overrides.cor_dominante_override?.length ?? 0) > 0 ||
    (overrides.tipo_nostalgia_override?.length ?? 0) > 0

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p className="section-label" style={{ margin: 0 }}>
          Overrides
          {nichoRef && (
            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>
              (herda de: {nichoRef.nome})
            </span>
          )}
        </p>
        {!isEditing && (
          <button onClick={startEdit} style={editBtnStyle}>
            {hasAnyOverride ? 'editar' : '+ override'}
          </button>
        )}
      </div>

      {!isEditing ? (
        hasAnyOverride ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
            {FIELDS.map(({ key, label }) => {
              const val = overrides[key]
              const inherited = nichoRef?.[key] ?? null
              return (
                <div key={key} style={{ fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}: </span>
                  {val != null ? (
                    <span style={{ color: 'var(--cyan)' }}>{val}/5</span>
                  ) : inherited != null ? (
                    <span style={{ color: 'var(--text-muted)' }}>{inherited}/5 ←nicho</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </div>
              )
            })}
            {(overrides.geracao_override?.length ?? 0) > 0 && (
              <div style={{ fontSize: '0.8rem', gridColumn: '1/-1' }}>
                <span style={{ color: 'var(--text-muted)' }}>geração: </span>
                <span style={{ color: 'var(--cyan)' }}>{overrides.geracao_override!.join(', ')}</span>
              </div>
            )}
            {(overrides.estetica_override?.length ?? 0) > 0 && (
              <div style={{ fontSize: '0.8rem', gridColumn: '1/-1' }}>
                <span style={{ color: 'var(--text-muted)' }}>estética: </span>
                <span style={{ color: 'var(--cyan)' }}>{overrides.estetica_override!.join(', ')}</span>
              </div>
            )}
            {(overrides.cor_dominante_override?.length ?? 0) > 0 && (
              <div style={{ fontSize: '0.8rem', gridColumn: '1/-1' }}>
                <span style={{ color: 'var(--text-muted)' }}>cor dominante: </span>
                <span style={{ color: 'var(--cyan)' }}>{overrides.cor_dominante_override!.join(', ')}</span>
              </div>
            )}
            {(overrides.tipo_nostalgia_override?.length ?? 0) > 0 && (
              <div style={{ fontSize: '0.8rem', gridColumn: '1/-1' }}>
                <span style={{ color: 'var(--text-muted)' }}>nostalgia: </span>
                <span style={{ color: 'var(--cyan)' }}>{overrides.tipo_nostalgia_override!.join(', ')}</span>
              </div>
            )}
          </div>
        ) : (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {nichoRef ? `herdando tudo de ${nichoRef.nome}` : 'sem overrides — vincule um nicho primeiro'}
          </p>
        )
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '1.25rem' }}>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
            deixe em 0 (posição mínima) para herdar do nicho
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            {[
              { label: 'letramento', val: letramento, set: setLetramento },
              { label: 'receptividade autoral', val: receptividade, set: setReceptividade },
              { label: 'commodificação', val: commodificacao, set: setCommodificacao },
              { label: 'energia', val: energia, set: setEnergia },
              { label: 'abertura experimental', val: abertura, set: setAbertura },
            ].map(({ label, val, set }) => {
              const nicho_val = label.replace(' autoral', '_autoral').replace('ção', 'cao').replace(' ', '_')
              const inherited = nichoRef ? (nichoRef as any)[nicho_val.replace('commodificação', 'commodificacao').replace('abertura_experimental', 'abertura_experimental')] : null
              return (
                <div key={label}>
                  <label style={labelStyle}>
                    {label} {val > 0 ? <span style={{ color: 'var(--cyan)' }}>{val}/5</span> : inherited ? <span style={{ color: 'var(--text-muted)' }}>←{inherited}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </label>
                  <input
                    type="range" min={0} max={5} value={val}
                    onChange={e => set(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            {[
              { label: 'geração (vírgula)', val: geracaoStr, set: setGeracaoStr, placeholder: 'ex: gen_z, millennial' },
              { label: 'estética (vírgula)', val: esteticaStr, set: setEsteticaStr, placeholder: 'ex: preto, funcional' },
              { label: 'cor dominante (vírgula)', val: corDomStr, set: setCorDomStr, placeholder: 'ex: preto, cinza' },
              { label: 'nostalgia (vírgula)', val: nostalgiaStr, set: setNostalgiaStr, placeholder: 'ex: restaurativa, reflexiva' },
            ].map(({ label, val, set, placeholder }) => (
              <div key={label}>
                <label style={labelStyle}>{label}</label>
                <input
                  value={val}
                  onChange={e => set(e.target.value)}
                  placeholder={placeholder}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>

          {error && <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginBottom: 8 }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button onClick={handleSave} disabled={pending} style={{ ...saveBtnStyle, opacity: pending ? 0.5 : 1 }}>
              {pending ? 'salvando…' : 'salvar'}
            </button>
            <button onClick={() => setIsEditing(false)} style={cancelBtnStyle}>cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
}
const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: '0.875rem', background: 'var(--surface)', color: 'var(--text)',
  border: '1px solid var(--border)', borderRadius: 4, padding: '0.45rem 0.75rem',
  outline: 'none', boxSizing: 'border-box',
}
const saveBtnStyle: React.CSSProperties = {
  padding: '0.45rem 1.25rem', fontSize: '0.875rem', background: 'var(--surface-2)',
  color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer',
}
const cancelBtnStyle: React.CSSProperties = {
  fontSize: '0.85rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
}
const editBtnStyle: React.CSSProperties = {
  fontSize: '0.75rem', color: 'var(--text-dim)', background: 'var(--surface-2)',
  border: '1px solid var(--border)', padding: '0.2rem 0.6rem', borderRadius: 4, cursor: 'pointer',
}
