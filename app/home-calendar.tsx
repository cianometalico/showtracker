'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────

export type CalShow = {
  id: string
  nome: string
  venueNome: string | null
  venueBairro: string | null
  statusIngresso: string | null
  resultadoGeral: string | null
}

interface Props {
  showsByDate: Record<string, CalShow[]>
  hojeStr: string
  mes: string  // YYYY-MM
}

const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

// ── Component ──────────────────────────────────────────────────

export function HomeCalendar({ showsByDate, hojeStr, mes }: Props) {
  const router = useRouter()

  const [year, month] = mes.split('-').map(Number)
  const firstDay     = new Date(year, month - 1, 1)
  const daysInMonth  = new Date(year, month, 0).getDate()
  // Brazilian calendar: Mon=0, ..., Sun=6
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7
  const prevMonthDays  = new Date(year, month - 1, 0).getDate()

  const mesNome    = firstDay.toLocaleDateString('pt-BR', { month: 'long' })
  const monthLabel = `${mesNome} ${year}`

  // Navigation targets
  const prevDate = new Date(year, month - 2, 1)
  const nextDate = new Date(year, month, 1)
  const prevStr  = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const nextStr  = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`

  // ── Build grid cells ─────────────────────────────────────────

  type Cell =
    | { kind: 'filler'; day: number }
    | { kind: 'day'; dateStr: string; dayNum: number; isToday: boolean; shows: CalShow[] }

  const cells: Cell[] = []

  // Leading filler (days from previous month)
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    cells.push({ kind: 'filler', day: prevMonthDays - i })
  }

  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${mes}-${String(d).padStart(2, '0')}`
    cells.push({
      kind: 'day',
      dateStr,
      dayNum: d,
      isToday: dateStr === hojeStr,
      shows: showsByDate[dateStr] ?? [],
    })
  }

  // Trailing filler (complete last row)
  let nextDay = 1
  while (cells.length % 7 !== 0) {
    cells.push({ kind: 'filler', day: nextDay++ })
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div>
      {/* Month header with navigation */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '0.625rem',
      }}>
        <button
          onClick={() => router.push(`/?mes=${prevStr}`)}
          style={navBtnStyle}
          aria-label="mês anterior"
        >
          ←
        </button>
        <span style={{
          fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)',
          textTransform: 'capitalize', letterSpacing: '0.02em',
        }}>
          {monthLabel}
        </span>
        <button
          onClick={() => router.push(`/?mes=${nextStr}`)}
          style={navBtnStyle}
          aria-label="próximo mês"
        >
          →
        </button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '2px', marginBottom: '2px' }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)',
            padding: '2px 0', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '2px' }}>
        {cells.map((cell, i) => {

          // ── Filler cell (other month) ───────────────────────
          if (cell.kind === 'filler') {
            return (
              <div key={`f-${i}`} style={{
                minHeight: 58, padding: '4px 5px',
                background: 'rgba(0,0,0,0.12)', borderRadius: 4,
                border: '1px solid transparent',
              }}>
                <span style={{
                  fontSize: '11px', color: 'var(--text-muted)', opacity: 0.35,
                  fontFamily: 'var(--font-mono)',
                }}>
                  {cell.day}
                </span>
              </div>
            )
          }

          // ── Day cell ─────────────────────────────────────────
          const isPast = cell.dateStr < hojeStr

          return (
            <div key={cell.dateStr} style={{
              minHeight: 58, padding: '4px 5px',
              background: 'var(--surface)',
              border: `1px solid ${cell.isToday ? 'var(--cyan)' : 'var(--border)'}`,
              borderRadius: 4,
            }}>
              {/* Day number */}
              <span style={{
                fontSize: '11px', fontFamily: 'var(--font-mono)', display: 'block',
                color: cell.isToday
                  ? 'var(--cyan)'
                  : cell.shows.length > 0 ? 'var(--text-dim)' : 'var(--text-muted)',
                marginBottom: cell.shows.length > 0 ? 3 : 0,
              }}>
                {cell.dayNum}
              </span>

              {/* Show cards */}
              {cell.shows.map(show => {
                const semRes = isPast && !show.resultadoGeral
                return (
                  <Link key={show.id} href={`/shows/${show.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 3, padding: '3px 4px' }}>
                      <p style={{
                        fontSize: '10px', fontWeight: 600, color: 'var(--text)',
                        margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {show.nome}
                      </p>
                      {show.venueNome && (
                        <p style={{
                          fontSize: '9px', color: 'var(--text-muted)',
                          margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {show.venueBairro ? `${show.venueBairro} · ` : ''}{show.venueNome}
                        </p>
                      )}
                      {(show.statusIngresso || semRes) && (
                        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginTop: 2 }}>
                          {show.statusIngresso === 'sold out' && (
                            <span style={badge('var(--red)')}>sold out</span>
                          )}
                          {show.statusIngresso === 'bem vendido' && (
                            <span style={badge('var(--green)')}>bem vendido</span>
                          )}
                          {show.statusIngresso === 'mal vendido' && (
                            <span style={badge('var(--amber)')}>mal vendido</span>
                          )}
                          {semRes && (
                            <span style={badge('var(--amber)')}>pend</span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--text-dim)', fontSize: '0.875rem', padding: '0.2rem 0.6rem',
}

function badge(color: string): React.CSSProperties {
  return {
    fontSize: '8px', color, border: `1px solid ${color}`,
    borderRadius: 2, padding: '0 3px', lineHeight: '1.6',
    display: 'inline-block',
  }
}
