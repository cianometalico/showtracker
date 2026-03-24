// app/api/weather/route.ts
import { NextRequest, NextResponse } from 'next/server'

const KEY  = process.env.OPENWEATHER_API_KEY
const BASE = 'https://api.openweathermap.org/data/2.5'

// GET /api/weather?lat=-23.5&lng=-46.6&data=2026-03-20
export async function GET(req: NextRequest) {
  if (!KEY) return NextResponse.json({ error: 'OPENWEATHER_API_KEY não configurada' }, { status: 500 })

  const { searchParams } = req.nextUrl
  const lat  = searchParams.get('lat')
  const lng  = searchParams.get('lng')
  const data = searchParams.get('data') // yyyy-mm-dd

  if (!lat || !lng || !data) {
    return NextResponse.json({ error: 'lat, lng e data obrigatórios' }, { status: 400 })
  }

  try {
    const alvoTs  = new Date(data + 'T20:00:00').getTime() / 1000 // noite do show
    const hoje    = new Date()
    const diasAte = Math.ceil((new Date(data).getTime() - hoje.getTime()) / 86400000)

    let clima: string
    let descricao: string | null = null
    let temp: number | null = null

    if (diasAte > 5) {
      // Além de 5 dias — OWM free só tem 5 dias de forecast
      return NextResponse.json({
        clima:     null,
        descricao: 'Previsão indisponível para datas além de 5 dias',
        temp:      null,
        fonte:     'sem_previsao',
      })
    }

    // Forecast 5 dias / 3h
    const res = await fetch(
      `${BASE}/forecast?lat=${lat}&lon=${lng}&appid=${KEY}&units=metric&lang=pt_br`,
      { signal: AbortSignal.timeout(6000) }
    )
    const json = await res.json()
    if (json.cod !== '200') throw new Error(json.message ?? 'Erro OWM')

    // Pega o slot mais próximo do horário do show
    const lista: any[] = json.list ?? []
    const slot = lista.reduce((best: any, item: any) => {
      const diff    = Math.abs(item.dt - alvoTs)
      const bestDiff = Math.abs((best?.dt ?? Infinity) - alvoTs)
      return diff < bestDiff ? item : best
    }, null)

    if (slot) {
      temp      = Math.round(slot.main.temp)
      descricao = slot.weather?.[0]?.description ?? null
      const id  = slot.weather?.[0]?.id ?? 800

      // Mapeia código OWM → nosso enum
      if (id >= 200 && id < 700)       clima = 'chuva'
      else if (id >= 700 && id < 800)  clima = 'nublado'
      else if (id === 800)             clima = temp <= 18 ? 'frio' : 'sol'
      else                             clima = temp <= 18 ? 'frio' : 'nublado'
    } else {
      clima = 'sol' // fallback
    }

    return NextResponse.json({ clima, descricao, temp, fonte: 'openweather' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}