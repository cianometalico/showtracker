// app/shows/[id]/weather-block.tsx
'use client'

import { useEffect, useState } from 'react'
import { updateClimaFromWeather } from './actions'

type Props = {
  showId:     string
  data:       string
  lat:        number | null
  lng:        number | null
  climaAtual: string | null
}

const ICONE: Record<string, string> = {
  sol: '☀️', nublado: '☁️', chuva: '🌧️', frio: '🥶',
}

type WeatherState = {
  clima:     string | null
  descricao: string | null
  temp:      number | null
  fonte:     string | null
}

export function WeatherBlock({ showId, data, lat, lng, climaAtual }: Props) {
  const diasAte = Math.ceil((new Date(data).getTime() - new Date().getTime()) / 86400000)
  const isPast  = diasAte < 0
  const inRange = diasAte >= 0 && diasAte <= 5

  const [weather,  setWeather]  = useState<WeatherState>({
    clima:     climaAtual,
    descricao: null,
    temp:      null,
    fonte:     climaAtual ? 'salvo' : null,
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error' | 'unavailable'>(
    climaAtual ? 'done' : 'idle'
  )
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!inRange || !lat || !lng || climaAtual) return
    fetchWeather()
  }, [])

  async function fetchWeather() {
    if (!lat || !lng) {
      setMsg('Venue sem coordenadas')
      setStatus('error')
      return
    }
    setStatus('loading')
    setMsg(null)
    try {
      const res  = await fetch(`/api/weather?lat=${lat}&lng=${lng}&data=${data}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      if (json.fonte === 'sem_previsao') {
        setStatus('unavailable')
        setMsg('Previsão disponível apenas nos próximos 5 dias')
        return
      }
      setWeather({ clima: json.clima, descricao: json.descricao, temp: json.temp, fonte: 'openweather' })
      setStatus('done')
      await updateClimaFromWeather(showId, json.clima)
    } catch (e: any) {
      setStatus('error')
      setMsg(e.message)
    }
  }

  if (isPast) return null

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-xs text-gray-400 w-24 shrink-0">Clima previsto</span>
      <div className="flex items-center gap-2 flex-wrap">

        {status === 'loading' && (
          <span className="text-xs text-gray-400 animate-pulse">Buscando previsão…</span>
        )}

        {status === 'done' && weather.clima && (
          <>
            <span className="text-base leading-none">{ICONE[weather.clima] ?? '?'}</span>
            <span className="text-sm text-gray-700 capitalize">{weather.clima}</span>
            {weather.temp !== null && (
              <span className="text-sm font-medium text-gray-600">{weather.temp}°C</span>
            )}
            {weather.descricao && (
              <span className="text-xs text-gray-400 capitalize">{weather.descricao}</span>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              weather.fonte === 'openweather'
                ? 'bg-blue-50 text-blue-500'
                : 'bg-gray-100 text-gray-400'
            }`}>
              {weather.fonte === 'openweather' ? '✓ OpenWeather' : 'salvo'}
            </span>
            {inRange && (
              <button onClick={fetchWeather}
                title="Atualizar previsão"
                className="text-xs text-gray-300 hover:text-blue-500 cursor-pointer transition-colors px-1">
                ↻ atualizar
              </button>
            )}
          </>
        )}

        {status === 'unavailable' && (
          <span className="text-xs text-gray-400">{msg}</span>
        )}

        {status === 'error' && (
          <>
            <span className="text-xs text-red-400">{msg}</span>
            {inRange && lat && lng && (
              <button onClick={fetchWeather}
                className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer underline">
                tentar novamente
              </button>
            )}
          </>
        )}

        {status === 'idle' && !inRange && (
          <span className="text-xs text-gray-300">Previsão disponível até 5 dias antes</span>
        )}

        {status === 'idle' && inRange && (!lat || !lng) && (
          <span className="text-xs text-gray-300">Venue sem coordenadas — configure em Locais</span>
        )}
      </div>
    </div>
  )
}