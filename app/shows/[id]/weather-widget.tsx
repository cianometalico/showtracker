'use client'

import { useEffect, useState } from 'react'

const ICONE: Record<string, string> = {
  sol:     '☀',
  nublado: '☁',
  chuva:   '🌧',
  frio:    '🥶',
}

const LABEL: Record<string, string> = {
  sol:     'sol',
  nublado: 'nublado',
  chuva:   'chuva',
  frio:    'frio',
}

type Props = {
  data: string        // yyyy-mm-dd
  lat: number | null
  lng: number | null
  climaSalvo: string | null  // valor já no banco
}

export function WeatherWidget({ data, lat, lng, climaSalvo }: Props) {
  const [clima,    setClima]    = useState<string | null>(climaSalvo)
  const [temp,     setTemp]     = useState<number | null>(null)
  const [desc,     setDesc]     = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [indispon, setIndispon] = useState(false)

  const diasAte = Math.ceil((new Date(data).getTime() - new Date().getTime()) / 86400000)
  const podeBuscar = diasAte >= 0 && diasAte <= 5 && lat && lng

  useEffect(() => {
    if (!podeBuscar || climaSalvo) return
    setLoading(true)
    fetch(`/api/weather?lat=${lat}&lng=${lng}&data=${data}`)
      .then(r => r.json())
      .then(json => {
        if (json.clima) {
          setClima(json.clima)
          setTemp(json.temp)
          setDesc(json.descricao)
        } else {
          setIndispon(true)
        }
      })
      .catch(() => setIndispon(true))
      .finally(() => setLoading(false))
  }, [])

  if (diasAte < 0) return null  // show passado, sem clima
  if (!lat || !lng) return null  // venue sem coordenadas

  if (loading) return (
    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>...</span>
  )

  if (indispon || (!clima && diasAte > 5)) return (
    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
      previsão disponível em {diasAte - 5}d
    </span>
  )

  if (!clima) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <span style={{ fontSize: '1.1rem' }}>{ICONE[clima] ?? '—'}</span>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
        {LABEL[clima]}
        {temp !== null && ` · ${temp}°C`}
      </span>
    </div>
  )
}