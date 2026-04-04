import Link from 'next/link'
import {
  getArtistsDuplicados,
  getArtistsSemMbid,
  getArtistsSemListeners,
  getArtistasOrfaos,
  getShowsSemResultado,
  getVenuesSemSubprefeitura,
} from '@/lib/db/diagnostics'
import { deleteArtistOrfao } from './actions'

export async function DiagnosticsSection() {
  const [
    duplicados,
    semMbid,
    semListeners,
    orfaos,
    semResultado,
    semSubpref,
  ] = await Promise.all([
    getArtistsDuplicados(),
    getArtistsSemMbid(),
    getArtistsSemListeners(),
    getArtistasOrfaos(),
    getShowsSemResultado(),
    getVenuesSemSubprefeitura(),
  ])

  const totalPendencias =
    duplicados.data.length +
    semMbid.data.length +
    semListeners.data.length +
    orfaos.data.length +
    semResultado.data.length +
    semSubpref.data.length

  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <p className="section-label">diagnóstico</p>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.72rem',
          color: totalPendencias > 0 ? 'var(--amber)' : 'var(--text-muted)',
        }}>
          {totalPendencias > 0 ? `${totalPendencias} pendências` : 'tudo ok'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <DiagBlock
          label="ARTISTAS DUPLICADOS"
          count={duplicados.data.length}
          error={duplicados.error}
        >
          {duplicados.data.map((grupo) => (
            <div key={grupo.nome_lower} style={itemRowStyle}>
              <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                {grupo.nomes.join(' · ')}
              </span>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', marginLeft: '0.5rem' }}>
                {grupo.ids.map(id => id.slice(0, 8)).join(', ')}
              </span>
            </div>
          ))}
          <p style={{ ...noteStyle, marginTop: '0.5rem' }}>merge manual necessário via banco</p>
        </DiagBlock>

        <DiagBlock
          label="SEM MBID"
          count={semMbid.data.length}
          error={semMbid.error}
        >
          {semMbid.data.map((a) => (
            <div key={a.id} style={itemRowStyle}>
              <Link href={`/artistas/${a.id}`} style={linkStyle}>{a.nome}</Link>
              {a.pais && <span style={pipeStyle}>{a.pais}</span>}
            </div>
          ))}
        </DiagBlock>

        <DiagBlock
          label="SEM LISTENERS"
          count={semListeners.data.length}
          error={semListeners.error}
        >
          {semListeners.data.map((a) => (
            <div key={a.id} style={itemRowStyle}>
              <Link href={`/artistas/${a.id}`} style={linkStyle}>{a.nome}</Link>
              <span style={pipeStyle}>{a.mbid.slice(0, 8)}</span>
            </div>
          ))}
        </DiagBlock>

        <DiagBlock
          label="ÓRFÃOS"
          count={orfaos.data.length}
          error={orfaos.error}
        >
          {orfaos.data.map((a) => (
            <div key={a.id} style={{ ...itemRowStyle, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                <Link href={`/artistas/${a.id}`} style={linkStyle}>{a.nome}</Link>
                {!a.mbid && <span style={pipeStyle}>sem mbid</span>}
              </div>
              <form action={deleteArtistOrfao.bind(null, a.id)}>
                <button type="submit" style={deleteBtnStyle}>excluir</button>
              </form>
            </div>
          ))}
        </DiagBlock>

        <DiagBlock
          label="SHOWS SEM RESULTADO"
          count={semResultado.data.length}
          error={semResultado.error}
        >
          {semResultado.data.map((s) => (
            <div key={s.id} style={itemRowStyle}>
              <Link href={`/shows/${s.id}`} style={linkStyle}>{s.data}</Link>
              {s.venue_nome && <span style={pipeStyle}>{s.venue_nome}</span>}
              {s.nome_evento && <span style={pipeStyle}>{s.nome_evento}</span>}
            </div>
          ))}
        </DiagBlock>

        <DiagBlock
          label="VENUES SEM SUBPREFEITURA"
          count={semSubpref.data.length}
          error={semSubpref.error}
        >
          {semSubpref.data.map((v) => (
            <div key={v.id} style={itemRowStyle}>
              <Link href={`/locais/${v.id}`} style={linkStyle}>{v.nome}</Link>
              {v.cidade && <span style={pipeStyle}>{v.cidade}</span>}
            </div>
          ))}
        </DiagBlock>
      </div>
    </section>
  )
}

// ── DiagBlock ──────────────────────────────────────────────────

function DiagBlock({
  label,
  count,
  error,
  children,
}: {
  label: string
  count: number
  error: string | null
  children?: React.ReactNode
}) {
  const hasItems = count > 0

  return (
    <details open={hasItems} style={detailsStyle}>
      <summary style={summaryStyle}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--accent-structure)',
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: hasItems ? 'var(--amber)' : 'var(--text-muted)',
          marginLeft: '0.75rem',
        }}>
          {error ? 'erro' : hasItems ? count : 'ok'}
        </span>
      </summary>

      <div style={{ paddingTop: '0.5rem', paddingLeft: '0.25rem' }}>
        {error && (
          <p style={{ color: 'var(--status-neg)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
            {error}
          </p>
        )}
        {!error && !hasItems && (
          <p style={noteStyle}>tudo ok</p>
        )}
        {!error && hasItems && children}
      </div>
    </details>
  )
}

// ── Styles ─────────────────────────────────────────────────────

const detailsStyle: React.CSSProperties = {
  borderTop: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
  paddingTop: '0.5rem',
  paddingBottom: '0.5rem',
}

const summaryStyle: React.CSSProperties = {
  cursor: 'pointer',
  listStyle: 'none',
  display: 'flex',
  alignItems: 'baseline',
  userSelect: 'none',
}

const itemRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '0.4rem',
  paddingTop: '0.2rem',
  paddingBottom: '0.2rem',
}

const linkStyle: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: '0.85rem',
  color: 'var(--text)',
  textDecoration: 'none',
}

const pipeStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.68rem',
  color: 'var(--text-dim)',
}

const noteStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.68rem',
  color: 'var(--text-muted)',
}

const deleteBtnStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.68rem',
  color: 'var(--status-neg)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0 0.25rem',
  letterSpacing: '0.05em',
}
