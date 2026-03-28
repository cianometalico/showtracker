'use client'

import { useState, useTransition } from 'react'
import { TooltipIcon } from './tooltip-client'

type NichoInitial = {
  nome?: string
  underground_score?: number
  coesao?: number | null
  identidade_visual?: number | null
  maturidade?: number | null
  letramento?: number | null
  receptividade_autoral?: number | null
  commodificacao?: number | null
  energia?: number | null
  geracao?: string[]
  faixa_etaria?: string | null
  estetica?: string[]
  cor_dominante?: string[]
  fator_compra?: string[]
  concorrencia_merch?: string | null
  abertura_experimental?: number | null
  tipo_nostalgia?: string[]
  descricao?: string | null
  tags?: string[] | null
}

type Props = {
  initialData?: NichoInitial
  action: (formData: FormData) => Promise<void>
}

const GERACAO_OPTIONS  = ['gen_z', 'millennial', 'gen_x', 'boomer']
const FATOR_OPTIONS    = ['pertencimento', 'estetica', 'colecao', 'impulso', 'nostalgia']
const NOSTALGIA_OPTIONS = ['nenhuma', 'restaurativa', 'reflexiva', 'hauntologica']

const TOOLTIPS: Record<string, string> = {
  coesao:                'existe público ou existem pessoas?',
  identidade_visual:     'dá pra saber o show pela fila?',
  underground_score:     'onde o cluster se posiciona? 1=underground, 10=mainstream',
  maturidade:            'quanto tempo o gênero sedimentou?',
  letramento:            'a estampa pode ser críptica ou precisa ser explícita?',
  receptividade_autoral: 'aceita recombinação na estampa ou quer reprodução fiel?',
  commodificacao:        'quanto merch oficial domina a cena?',
  energia:               'qual a intensidade típica do show?',
  abertura_experimental: 'o público aceita coisa nova ou só o clássico?',
}

function parseFaixaEtaria(v: string | null | undefined): [number, number] {
  if (!v) return [18, 35]
  const parts = v.split('-')
  const min = parseInt(parts[0] ?? '', 10)
  const max = parseInt(parts[1] ?? '', 10)
  return [isNaN(min) ? 18 : min, isNaN(max) ? 35 : max]
}

export function NichoFormClient({ initialData, action }: Props) {
  const d = initialData ?? {}
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [faixaIni, faixaFimIni] = parseFaixaEtaria(d.faixa_etaria)

  // ── State ──────────────────────────────────────────────────────
  const [nome,          setNome]         = useState(d.nome ?? '')
  const [underScore,    setUnderScore]   = useState(d.underground_score ?? 5)
  const [coesao,        setCoesao]       = useState(d.coesao ?? 0)
  const [identVisual,   setIdentVisual]  = useState(d.identidade_visual ?? 0)
  const [maturidade,    setMaturidade]   = useState(d.maturidade ?? 0)
  const [letramento,    setLetramento]   = useState(d.letramento ?? 0)
  const [receptividade, setReceptividade]= useState(d.receptividade_autoral ?? 0)
  const [commodificacao,setCommodificacao]=useState(d.commodificacao ?? 0)
  const [energia,       setEnergia]      = useState(d.energia ?? 0)
  const [geracao,       setGeracao]      = useState<string[]>(d.geracao ?? [])
  const [faixaMin,      setFaixaMin]     = useState(faixaIni)
  const [faixaMax,      setFaixaMax]     = useState(faixaFimIni)
  const [estetica,      setEstetica]     = useState((d.estetica ?? []).join(', '))
  const [corDominante,  setCorDominante] = useState((d.cor_dominante ?? []).join(', '))
  const [fatorCompra,   setFatorCompra]  = useState<string[]>(d.fator_compra ?? [])
  const [concorrencia,  setConcorrencia] = useState(d.concorrencia_merch ?? '')
  const [abertura,      setAbertura]     = useState(d.abertura_experimental ?? 0)
  const [tipoNostalgia, setTipoNostalgia]= useState<string[]>(d.tipo_nostalgia ?? [])
  const [descricao,     setDescricao]    = useState(d.descricao ?? '')
  const [tags,          setTags]         = useState((d.tags ?? []).join(', '))

  function toggleArr(arr: string[], val: string, set: (v: string[]) => void) {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { setError('nome obrigatório'); return }

    // Validação faixa_etaria
    if (faixaMin < 10) { setError('idade mínima deve ser ≥ 10'); return }
    if (faixaMax > 80) { setError('idade máxima deve ser ≤ 80'); return }
    if (faixaMin >= faixaMax) { setError('idade mínima deve ser menor que a máxima'); return }

    setError(null)

    const fd = new FormData()
    fd.set('nome',                  nome.toLowerCase().trim())
    fd.set('underground_score',     String(underScore))
    fd.set('coesao',                coesao > 0 ? String(coesao) : '')
    fd.set('identidade_visual',     identVisual > 0 ? String(identVisual) : '')
    fd.set('maturidade',            maturidade > 0 ? String(maturidade) : '')
    fd.set('letramento',            letramento > 0 ? String(letramento) : '')
    fd.set('receptividade_autoral', receptividade > 0 ? String(receptividade) : '')
    fd.set('commodificacao',        commodificacao > 0 ? String(commodificacao) : '')
    fd.set('energia',               energia > 0 ? String(energia) : '')
    fd.set('geracao',               geracao.join(','))
    fd.set('faixa_etaria',          `${faixaMin}-${faixaMax}`)
    fd.set('estetica',              estetica)
    fd.set('cor_dominante',         corDominante)
    fd.set('fator_compra',          fatorCompra.join(','))
    fd.set('concorrencia_merch',    concorrencia)
    fd.set('abertura_experimental', abertura > 0 ? String(abertura) : '')
    fd.set('tipo_nostalgia',        tipoNostalgia.join(','))
    fd.set('descricao',             descricao)
    fd.set('tags',                  tags)

    startTransition(() => action(fd).catch(err => setError(err.message ?? 'erro ao salvar')))
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: 640 }}>

      {/* Nome + underground_score */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end' }}>
        <div>
          <label style={labelStyle}>nome *</label>
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="ex: hc 90 straight edge"
            style={inputStyle}
          />
        </div>
        <div style={{ minWidth: 140 }}>
          <label style={labelStyle}>
            underground {underScore}/10
            <TooltipIcon text={TOOLTIPS.underground_score} />
          </label>
          <input
            type="range" min={1} max={10} value={underScore}
            onChange={e => setUnderScore(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Core */}
      <section>
        <p style={sectionLabel}>core</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <ScoreSlider label="coesão"            tooltip={TOOLTIPS.coesao}            hint="plateia(1) → nicho denso(5)"     value={coesao}       onChange={setCoesao} />
          <ScoreSlider label="identidade visual" tooltip={TOOLTIPS.identidade_visual} hint="sem código(1) → codificada(5)"   value={identVisual}  onChange={setIdentVisual} />
          <ScoreSlider label="maturidade"        tooltip={TOOLTIPS.maturidade}        hint="emergente(1) → monumental(5)"    value={maturidade}   onChange={setMaturidade} />
        </div>
      </section>

      {/* Defaults */}
      <section>
        <p style={sectionLabel}>defaults (refinados pelos artistas)</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <ScoreSlider label="letramento"            tooltip={TOOLTIPS.letramento}            hint="nome grande(1) → cifrada(5)"   value={letramento}    onChange={setLetramento} />
          <ScoreSlider label="receptividade autoral" tooltip={TOOLTIPS.receptividade_autoral} hint="reprodução fiel(1) → autoral(5)"value={receptividade} onChange={setReceptividade} />
          <ScoreSlider label="commodificação"        tooltip={TOOLTIPS.commodificacao}        hint="DIY(1) → industrializada(5)"   value={commodificacao}onChange={setCommodificacao} />
          <ScoreSlider label="energia"               tooltip={TOOLTIPS.energia}               hint="contemplativo(1) → extático(5)" value={energia}       onChange={setEnergia} />
        </div>
      </section>

      {/* Corporalidade */}
      <section>
        <p style={sectionLabel}>corporalidade</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>geração (por ordem de predominância)</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 4 }}>
              {GERACAO_OPTIONS.map(g => (
                <ToggleChip key={g} label={g} active={geracao.includes(g)} onClick={() => toggleArr(geracao, g, setGeracao)} />
              ))}
            </div>
            {geracao.length > 0 && (
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
                ordem: {geracao.join(' → ')}
              </p>
            )}
          </div>

          {/* Faixa etária — dois inputs numéricos */}
          <div>
            <label style={labelStyle}>faixa etária</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number" min={10} max={79} value={faixaMin}
                onChange={e => setFaixaMin(Number(e.target.value))}
                style={{ ...inputStyle, width: 72 }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>–</span>
              <input
                type="number" min={11} max={80} value={faixaMax}
                onChange={e => setFaixaMax(Number(e.target.value))}
                style={{ ...inputStyle, width: 72 }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>anos</span>
            </div>
          </div>

          <div>
            <label style={labelStyle}>estética (vírgula separa)</label>
            <input value={estetica} onChange={e => setEstetica(e.target.value)} placeholder="ex: preto, funcional, tatuado" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>cor dominante (por ordem, vírgula separa)</label>
            <input value={corDominante} onChange={e => setCorDominante(e.target.value)} placeholder="ex: preto, azul marinho, bordô" style={inputStyle} />
          </div>
        </div>
      </section>

      {/* Mentalidade */}
      <section>
        <p style={sectionLabel}>mentalidade</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>fator de compra (por ordem)</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 4 }}>
              {FATOR_OPTIONS.map(f => (
                <ToggleChip key={f} label={f} active={fatorCompra.includes(f)} onClick={() => toggleArr(fatorCompra, f, setFatorCompra)} />
              ))}
            </div>
            {fatorCompra.length > 0 && (
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
                ordem: {fatorCompra.join(' → ')}
              </p>
            )}
          </div>

          <div>
            <label style={labelStyle}>concorrência merch</label>
            <select value={concorrencia} onChange={e => setConcorrencia(e.target.value)} style={selectStyle}>
              <option value="">— não definido</option>
              <option value="nenhuma">nenhuma</option>
              <option value="baixa">baixa</option>
              <option value="media">média</option>
              <option value="alta">alta</option>
            </select>
          </div>

          <ScoreSlider label="abertura experimental" tooltip={TOOLTIPS.abertura_experimental} hint="só o clássico(1) → aberto ao novo(5)" value={abertura} onChange={setAbertura} />

          <div>
            <label style={labelStyle}>tipo de nostalgia (por ordem)</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 4 }}>
              {NOSTALGIA_OPTIONS.map(n => (
                <ToggleChip key={n} label={n} active={tipoNostalgia.includes(n)} onClick={() => toggleArr(tipoNostalgia, n, setTipoNostalgia)} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Texto livre */}
      <section>
        <p style={sectionLabel}>texto</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>descrição</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={4}
              placeholder="dossiê do nicho..."
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
          <div>
            <label style={labelStyle}>tags (auto-link artistas, vírgula separa)</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="ex: metal, heavy metal, hard rock" style={inputStyle} />
          </div>
        </div>
      </section>

      {error && <p style={{ color: 'var(--red)', fontSize: '0.8rem' }}>{error}</p>}

      <div>
        <button type="submit" disabled={pending} style={saveBtnStyle}>
          {pending ? 'salvando…' : 'salvar'}
        </button>
      </div>

    </form>
  )
}

// ── Componentes internos ──────────────────────────────────────────

function ScoreSlider({ label, tooltip, hint, value, onChange }: {
  label: string
  tooltip?: string
  hint: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label style={labelStyle}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {label}
          {tooltip && <TooltipIcon text={tooltip} />}
          &nbsp;
          {value > 0
            ? <span style={{ color: 'var(--cyan)' }}>{value}/5</span>
            : <span style={{ color: 'var(--text-muted)' }}>—</span>}
        </span>
      </label>
      <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', margin: '0 0 4px' }}>{hint}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => onChange(0)}
          style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: value === 0 ? 1 : 0.4 }}
        >×</button>
        <input
          type="range" min={1} max={5} value={value || 1}
          onChange={e => onChange(Number(e.target.value))}
          style={{ flex: 1 }}
        />
      </div>
    </div>
  )
}

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: 4,
        border: active ? '1px solid var(--cyan)' : '1px solid var(--border)',
        background: active ? 'rgba(0,188,212,0.12)' : 'var(--surface)',
        color: active ? 'var(--cyan)' : 'var(--text-dim)', cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

// ── Styles ────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
}

const sectionLabel: React.CSSProperties = {
  fontSize: '0.62rem', color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.1em',
  margin: '0 0 0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: '0.875rem', background: 'var(--surface)', color: 'var(--text)',
  border: '1px solid var(--border)', borderRadius: 4, padding: '0.45rem 0.75rem',
  outline: 'none', boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  fontSize: '0.875rem', background: 'var(--surface)', color: 'var(--text)',
  border: '1px solid var(--border)', borderRadius: 4, padding: '0.45rem 0.75rem',
  outline: 'none',
}

const saveBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1.5rem', fontSize: '0.875rem',
  background: 'var(--surface-2)', color: 'var(--text)',
  border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer',
}
