'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { TerminalSpinner } from '@/components/terminal-spinner'

// ── Types ─────────────────────────────────────────────────────

type RawRow = {
  data: string
  local: string
  evento: string
  artista: string
  turne: string
}

type PreviewRow = RawRow & {
  venue_status: 'found' | 'not_found'
  venue_id?: string
  artist_status: 'found' | 'not_found'
  artist_id?: string
  show_status: 'new' | 'duplicate'
}

type PreviewResult = {
  summary: { total: number; to_import: number; duplicates: number; venues_new: number; artists_new: number }
  rows: PreviewRow[]
}

type PipelineResult = {
  shows_created:   number
  shows_failed:    number
  duplicates:      number
  artists_created: number
  venues_created:  number
  consolidated:    number
  shows_deleted:   number
  enrich_ok:       number
  enrich_skip:     number
  did_enrich:      boolean
  errors:          string[]
}

type StepStatus = 'pending' | 'running' | 'done' | 'error'

type PipeStep = {
  key:    string
  label:  string
  status: StepStatus
  msg:    string
}

type Phase = 'upload' | 'preview' | 'importing' | 'done'

// ── Parsing ───────────────────────────────────────────────────

function parseDateToISO(val: unknown): string {
  if (val instanceof Date) {
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, '0')
    const d = String(val.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const s = String(val ?? '').trim()
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) {
    const [, d, m, y] = match
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return s
}

function normalizeKey(k: string): string {
  return k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function parseSheet(file: File): Promise<RawRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, unknown>[]

        if (raw.length === 0) { resolve([]); return }

        const headerMap: Record<string, string> = {}
        for (const k of Object.keys(raw[0])) headerMap[normalizeKey(k)] = k

        const getCol = (row: Record<string, unknown>, names: string[]): string => {
          for (const n of names) {
            const orig = headerMap[n]
            if (orig !== undefined) return String(row[orig] ?? '').trim()
          }
          return ''
        }

        const getDate = (row: Record<string, unknown>): string => {
          const orig = headerMap['data']
          if (!orig) return ''
          return parseDateToISO(row[orig])
        }

        const rows = raw.map(r => ({
          data:    getDate(r),
          local:   getCol(r, ['local']),
          evento:  getCol(r, ['evento']),
          artista: getCol(r, ['artista']),
          turne:   getCol(r, ['turne', 'tour']),
        })).filter(r => r.data && r.local && r.artista)

        resolve(rows)
      } catch (e: any) {
        reject(new Error('Erro ao ler arquivo: ' + e.message))
      }
    }
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'))
    reader.readAsArrayBuffer(file)
  })
}

// ── Component ─────────────────────────────────────────────────

export function ImportClient() {
  const fileRef = useRef<HTMLInputElement>(null)

  const [phase,     setPhase]     = useState<Phase>('upload')
  const [rawRows,   setRawRows]   = useState<RawRow[]>([])
  const [preview,   setPreview]   = useState<PreviewResult | null>(null)
  const [result,    setResult]    = useState<PipelineResult | null>(null)
  const [steps,     setSteps]     = useState<PipeStep[]>([])
  const [error,     setError]     = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  function updateStep(key: string, patch: Partial<PipeStep>) {
    setSteps(prev => prev.map(s => s.key === key ? { ...s, ...patch } : s))
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    try {
      setRawRows(await parseSheet(file))
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    setError(null)
    try {
      const res  = await fetch('/api/import-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: rawRows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      setPreview(data)
      setPhase('preview')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleImport() {
    if (!preview) return
    setPhase('importing')
    setError(null)

    const rowsToImport = preview.rows.filter(r => r.show_status === 'new')
    const willEnrich   = preview.summary.artists_new > 0

    // Initialise step list
    const initialSteps: PipeStep[] = [
      { key: 'import',      label: `importando ${rowsToImport.length} shows...`,  status: 'running', msg: '' },
      { key: 'consolidate', label: 'consolidando shows multi-artista...',           status: 'pending', msg: '' },
      ...(willEnrich
        ? [{ key: 'enrich', label: `enriquecendo ${preview.summary.artists_new} artistas...`, status: 'pending' as StepStatus, msg: '' }]
        : []),
    ]
    setSteps(initialSteps)

    const allErrors: string[] = []
    const pipeResult: PipelineResult = {
      shows_created: 0, shows_failed: 0,
      duplicates:    preview.summary.duplicates,
      artists_created: 0, venues_created: 0,
      consolidated: 0, shows_deleted: 0,
      enrich_ok: 0, enrich_skip: 0,
      did_enrich: false,
      errors: [],
    }

    // ── Step 1: Import ──────────────────────────────────────
    try {
      const res  = await fetch('/api/import-shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: rowsToImport }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro no import')

      pipeResult.shows_created   = data.ok ?? 0
      pipeResult.shows_failed    = data.fail ?? 0
      pipeResult.artists_created = data.artists_created ?? 0
      pipeResult.venues_created  = data.venues_created ?? 0
      if (data.errors?.length) allErrors.push(...data.errors)

      updateStep('import', {
        status: 'done',
        label:  'importando shows...',
        msg:    `${pipeResult.shows_created} shows criados`,
      })
    } catch (e: any) {
      updateStep('import', { status: 'error', msg: e.message })
      allErrors.push(e.message)
      // Don't abort — still run consolidate
    }

    // ── Step 2: Consolidate ─────────────────────────────────
    updateStep('consolidate', { status: 'running' })
    try {
      const res  = await fetch('/api/consolidate-shows', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro na consolidação')

      pipeResult.consolidated = data.consolidated ?? 0
      pipeResult.shows_deleted = data.shows_deleted ?? 0
      if (data.errors?.length) allErrors.push(...data.errors)

      updateStep('consolidate', {
        status: 'done',
        msg:    pipeResult.consolidated > 0
          ? `${pipeResult.consolidated} grupos · ${pipeResult.shows_deleted} shows deletados`
          : 'nada a consolidar',
      })
    } catch (e: any) {
      updateStep('consolidate', { status: 'error', msg: e.message })
      allErrors.push(e.message)
    }

    // ── Step 3: Enrich (only if new artists were created) ───
    if (willEnrich) {
      updateStep('enrich', { status: 'running' })
      try {
        const res  = await fetch('/api/enrich-all')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Erro no enriquecimento')

        pipeResult.enrich_ok   = data.ok   ?? 0
        pipeResult.enrich_skip = data.skip  ?? 0
        pipeResult.did_enrich  = true

        updateStep('enrich', {
          status: 'done',
          msg:    `${data.ok} ok · ${data.skip} sem match`,
        })
      } catch (e: any) {
        updateStep('enrich', { status: 'error', msg: e.message })
        allErrors.push(e.message)
      }
    }

    pipeResult.errors = allErrors
    setResult(pipeResult)
    setPhase('done')
  }

  function reset() {
    setPhase('upload')
    setRawRows([])
    setPreview(null)
    setResult(null)
    setSteps([])
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <section style={{ marginBottom: '2rem' }}>
      <p className="section-label">importar shows</p>

      {/* ── Phase 1: Upload ── */}
      {phase === 'upload' && (
        <div>
          <p style={dimStyle}>planilha .xlsx ou .csv — colunas: data · local · evento · artista · turne</p>
          <div style={{ marginTop: '0.75rem' }}>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}
            />
          </div>

          {rawRows.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ ...dimStyle, marginBottom: '0.5rem' }}>{rawRows.length} linhas lidas — prévia (primeiras 5):</p>
              <RawTable rows={rawRows.slice(0, 5)} />
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem' }}>
                <button onClick={handleAnalyze} disabled={analyzing} style={primaryBtnStyle}>
                  {analyzing ? <><TerminalSpinner size={13} />{' '}analisando...</> : 'analisar'}
                </button>
                <button onClick={reset} style={secBtnStyle}>limpar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Phase 2: Preview ── */}
      {phase === 'preview' && preview && (
        <div>
          <div style={{ ...dimStyle, marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text)' }}>{preview.summary.total}</span>{' shows | '}
            <span style={{ color: 'var(--text)' }}>{preview.summary.to_import}</span>{' a importar | '}
            {preview.summary.duplicates > 0 && (
              <><span style={{ color: 'var(--text-muted)' }}>{preview.summary.duplicates} já existem</span>{' | '}</>
            )}
            <span style={{ color: preview.summary.artists_new > 0 ? 'var(--amber)' : 'var(--text-dim)' }}>
              {preview.summary.artists_new} artistas novos
            </span>{' | '}
            <span style={{ color: preview.summary.venues_new > 0 ? 'var(--amber)' : 'var(--text-dim)' }}>
              {preview.summary.venues_new} venues novos
            </span>
          </div>

          <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
            <table style={{ borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', width: '100%' }}>
              <thead>
                <tr>
                  {['ARTISTA','VENUE','DATA','EVENTO','STATUS'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => {
                  const isDup       = row.show_status === 'duplicate'
                  const artistColor = isDup ? 'var(--text-muted)' : row.artist_status === 'not_found' ? 'var(--amber)' : 'var(--text)'
                  const venueColor  = isDup ? 'var(--text-muted)' : row.venue_status  === 'not_found' ? 'var(--amber)' : 'var(--text)'
                  const decor       = isDup ? 'line-through' : 'none'
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)', opacity: isDup ? 0.4 : 1 }}>
                      <td style={tdStyle}><span style={{ color: artistColor, textDecoration: decor }}>{row.artista}</span></td>
                      <td style={tdStyle}><span style={{ color: venueColor,  textDecoration: decor }}>{row.local}</span></td>
                      <td style={{ ...tdStyle, textDecoration: decor }}>{row.data}</td>
                      <td style={{ ...tdStyle, textDecoration: decor }}>{row.evento || '—'}</td>
                      <td style={tdStyle}>
                        {isDup
                          ? <span style={{ color: 'var(--text-muted)' }}>já existe</span>
                          : row.artist_status === 'not_found' || row.venue_status === 'not_found'
                            ? <span style={{ color: 'var(--amber)' }}>○ criar</span>
                            : <span style={{ color: 'var(--status-pos)' }}>✓</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={handleImport}
              disabled={preview.summary.to_import === 0}
              style={{ ...primaryBtnStyle, opacity: preview.summary.to_import === 0 ? 0.4 : 1 }}
            >
              importar {preview.summary.to_import} shows
            </button>
            <button onClick={reset} style={secBtnStyle}>cancelar</button>
          </div>
        </div>
      )}

      {/* ── Phase 3: Pipeline progress ── */}
      {phase === 'importing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {steps.map(step => (
            <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', ...dimStyle }}>
              {step.status === 'running' && <TerminalSpinner size={13} />}
              {step.status === 'done'    && <span style={{ color: 'var(--status-pos)', width: '1em' }}>✓</span>}
              {step.status === 'error'   && <span style={{ color: 'var(--status-neg)', width: '1em' }}>✗</span>}
              {step.status === 'pending' && <span style={{ color: 'var(--text-muted)', width: '1em' }}>·</span>}
              <span style={{ color: step.status === 'pending' ? 'var(--text-muted)' : 'var(--text-dim)' }}>
                {step.label}
              </span>
              {step.msg && step.status !== 'running' && (
                <span style={{ color: step.status === 'error' ? 'var(--status-neg)' : 'var(--cyan)', fontSize: '0.7rem' }}>
                  — {step.msg}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Phase 4: Done ── */}
      {phase === 'done' && result && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
          <p style={{ color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.68rem', marginBottom: '0.75rem' }}>
            import concluído
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <ResultLine
              value={`${result.shows_created} shows criados`}
              dim={result.duplicates > 0 ? `· ${result.duplicates} já existiam` : undefined}
            />
            {result.artists_created > 0 && (
              <ResultLine
                value={`${result.artists_created} artistas novos`}
                dim={result.did_enrich ? '· enriquecidos via Ohara' : '· pendentes (enriquecer manualmente)'}
              />
            )}
            {result.venues_created > 0 && (
              <ResultLine value={`${result.venues_created} venues criados`} />
            )}
            {result.consolidated > 0 && (
              <ResultLine
                value={`${result.consolidated} shows consolidados`}
                dim="· multi-artista"
              />
            )}
            {result.shows_failed > 0 && (
              <ResultLine value={`${result.shows_failed} erros`} danger />
            )}
          </div>

          {result.errors.length > 0 && (
            <ul style={{ marginTop: '0.75rem', color: 'var(--status-neg)', fontSize: '0.7rem', paddingLeft: '1rem' }}>
              {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
              {result.errors.length > 10 && <li>... e mais {result.errors.length - 10}</li>}
            </ul>
          )}

          <button onClick={reset} style={{ ...secBtnStyle, marginTop: '1rem' }}>
            importar outra planilha
          </button>
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--status-neg)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', marginTop: '0.75rem' }}>
          {error}
        </p>
      )}
    </section>
  )
}

// ── Sub-components ────────────────────────────────────────────

function ResultLine({ value, dim, danger }: { value: string; dim?: string; danger?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'baseline' }}>
      <span style={{ color: danger ? 'var(--status-neg)' : 'var(--cyan)' }}>{value}</span>
      {dim && <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{dim}</span>}
    </div>
  )
}

function RawTable({ rows }: { rows: RawRow[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
        <thead>
          <tr>{['DATA','LOCAL','EVENTO','ARTISTA','TURNE'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={tdStyle}>{r.data}</td>
              <td style={tdStyle}>{r.local}</td>
              <td style={tdStyle}>{r.evento || '—'}</td>
              <td style={tdStyle}>{r.artista}</td>
              <td style={tdStyle}>{r.turne || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────

const dimStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.78rem',
  color: 'var(--text-dim)',
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '0.4rem 1rem', fontSize: '0.78rem',
  background: 'var(--surface-raised)', color: 'var(--text)',
  border: '1px solid var(--border)', borderRadius: 4,
  cursor: 'pointer', fontFamily: 'var(--font-mono)',
  display: 'flex', alignItems: 'center', gap: '0.4rem',
}

const secBtnStyle: React.CSSProperties = {
  padding: '0.4rem 1rem', fontSize: '0.78rem',
  background: 'none', color: 'var(--text-dim)',
  border: '1px solid var(--border)', borderRadius: 4,
  cursor: 'pointer', fontFamily: 'var(--font-mono)',
}

const thStyle: React.CSSProperties = {
  padding: '0.3rem 1rem 0.3rem 0',
  color: 'var(--text-dim)', fontSize: '0.68rem',
  letterSpacing: '0.08em', fontWeight: 500,
  textAlign: 'left', borderBottom: '1px solid var(--border)',
}

const tdStyle: React.CSSProperties = {
  padding: '0.3rem 1rem 0.3rem 0', color: 'var(--text)',
  maxWidth: 200, overflow: 'hidden',
  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}
