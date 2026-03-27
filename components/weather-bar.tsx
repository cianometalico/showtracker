'use client'

export type WeatherData = {
  clima: string | null
  temp: number | null
  feels_like: number | null
  humidity: number | null
  wind_speed: number | null
  pop: number | null
  description: string | null
  icon: string | null
}

const OWM_EMOJI: Record<string, string> = {
  '01': '☀', '02': '⛅', '03': '☁', '04': '☁',
  '09': '🌧', '10': '🌧', '11': '⛈', '13': '❄', '50': '🌫',
}

function iconEmoji(icon: string | null): string {
  if (!icon) return '🌡'
  return OWM_EMOJI[icon.slice(0, 2)] ?? '🌡'
}

export function WeatherBar({ weather }: { weather: WeatherData | null }) {
  if (!weather || weather.temp === null) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap',
      fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
      color: 'var(--text-dim)',
    }}>
      <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>{iconEmoji(weather.icon)}</span>
      <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>{weather.temp}°C</span>
      {weather.feels_like !== null && (
        <span>/ {weather.feels_like}°C</span>
      )}
      {weather.humidity !== null && (
        <span style={{ color: 'var(--text-muted)' }}>· {weather.humidity}%</span>
      )}
      {weather.wind_speed !== null && (
        <span style={{ color: 'var(--text-muted)' }}>· {weather.wind_speed} km/h</span>
      )}
      {weather.pop !== null && weather.pop > 0 && (
        <span style={{ color: 'var(--text-muted)' }}>· {weather.pop}% ☔</span>
      )}
      {weather.description && (
        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>· {weather.description}</span>
      )}
    </div>
  )
}
