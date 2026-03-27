// app/api/weather/route.ts
import { NextRequest, NextResponse } from 'next/server'

const KEY  = process.env.OPENWEATHER_API_KEY
const BASE = 'https://api.openweathermap.org/data/2.5'

// In-memory cache keyed by "lat|lng|date_or_current"
const cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30 min

function owmToClima(id: number, temp: number): string {
  if (id >= 200 && id < 700) return 'chuva'
  if (id >= 700 && id < 800) return 'nublado'
  if (id === 800)             return temp <= 18 ? 'frio' : 'sol'
  return temp <= 18 ? 'frio' : 'nublado'
}

// GET /api/weather?lat=&lng=&data=yyyy-mm-dd
// GET /api/weather?lat=&lng=&mode=current
export async function GET(req: NextRequest) {
  if (!KEY) return NextResponse.json({ error: 'OPENWEATHER_API_KEY não configurada' }, { status: 500 })

  const { searchParams } = req.nextUrl
  const lat  = searchParams.get('lat')
  const lng  = searchParams.get('lng')
  const data = searchParams.get('data') // yyyy-mm-dd
  const mode = searchParams.get('mode') // 'current' | null

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat e lng obrigatórios' }, { status: 400 })
  }
  if (mode !== 'current' && !data) {
    return NextResponse.json({ error: 'data obrigatória (ou mode=current)' }, { status: 400 })
  }

  const cacheKey = `${lat}|${lng}|${mode === 'current' ? 'current' : data}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    if (mode === 'current') {
      const res = await fetch(
        `${BASE}/weather?lat=${lat}&lon=${lng}&appid=${KEY}&units=metric&lang=pt_br`,
        { signal: AbortSignal.timeout(6000) }
      )
      const json = await res.json()
      if (json.cod !== 200) throw new Error(json.message ?? 'Erro OWM')

      const temp        = Math.round(json.main.temp)
      const feels_like  = Math.round(json.main.feels_like)
      const humidity    = json.main.humidity as number
      const wind_speed  = Math.round((json.wind?.speed ?? 0) * 3.6)
      const description = (json.weather?.[0]?.description as string) ?? null
      const icon        = (json.weather?.[0]?.icon as string) ?? '01d'
      const weatherId   = (json.weather?.[0]?.id as number) ?? 800
      const clima       = owmToClima(weatherId, temp)

      const payload = { clima, temp, feels_like, humidity, wind_speed, pop: 0, description, icon, fonte: 'openweather' }
      cache.set(cacheKey, { data: payload, ts: Date.now() })
      return NextResponse.json(payload)
    }

    // ── Forecast mode ─────────────────────────────────────────
    const alvoTs  = new Date(data! + 'T20:00:00').getTime() / 1000
    const hoje    = new Date()
    const diasAte = Math.ceil((new Date(data!).getTime() - hoje.getTime()) / 86400000)

    if (diasAte > 5) {
      return NextResponse.json({
        clima: null, temp: null, feels_like: null, humidity: null, wind_speed: null,
        pop: null, description: 'Previsão indisponível para datas além de 5 dias',
        icon: null, fonte: 'sem_previsao',
      })
    }

    const res = await fetch(
      `${BASE}/forecast?lat=${lat}&lon=${lng}&appid=${KEY}&units=metric&lang=pt_br`,
      { signal: AbortSignal.timeout(6000) }
    )
    const json = await res.json()
    if (json.cod !== '200') throw new Error(json.message ?? 'Erro OWM')

    const lista: any[] = json.list ?? []
    const slot = lista.reduce((best: any, item: any) => {
      const diff     = Math.abs(item.dt - alvoTs)
      const bestDiff = Math.abs((best?.dt ?? Infinity) - alvoTs)
      return diff < bestDiff ? item : best
    }, null)

    if (!slot) {
      const payload = { clima: 'sol', temp: null, feels_like: null, humidity: null, wind_speed: null, pop: 0, description: null, icon: null, fonte: 'openweather' }
      cache.set(cacheKey, { data: payload, ts: Date.now() })
      return NextResponse.json(payload)
    }

    const temp        = Math.round(slot.main.temp)
    const feels_like  = Math.round(slot.main.feels_like)
    const humidity    = slot.main.humidity as number
    const wind_speed  = Math.round((slot.wind?.speed ?? 0) * 3.6)
    const description = (slot.weather?.[0]?.description as string) ?? null
    const icon        = (slot.weather?.[0]?.icon as string) ?? '01d'
    const weatherId   = (slot.weather?.[0]?.id as number) ?? 800
    const clima       = owmToClima(weatherId, temp)
    const pop         = Math.round((slot.pop ?? 0) * 100)

    const payload = { clima, temp, feels_like, humidity, wind_speed, pop, description, icon, fonte: 'openweather' }
    cache.set(cacheKey, { data: payload, ts: Date.now() })
    return NextResponse.json(payload)

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
