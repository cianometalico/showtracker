import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const date = searchParams.get('date')

  if (!lat || !lng || !date) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: lat, lng, date' }, { status: 400 })
  }

  const apiKey = process.env.OPENWEATHER_API_KEY

  // OpenWeather permite previsão de até 5 dias via forecast
  // Para datas além disso, retorna clima atual como referência
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=pt_br`

  try {
    const res = await fetch(url)
    const data = await res.json()

    if (!data.list) {
      return NextResponse.json({ error: 'Sem dados de previsão' }, { status: 404 })
    }

    // Busca a previsão mais próxima da data informada
    const target = new Date(date + 'T12:00:00').getTime()
    const closest = data.list.reduce((prev: any, curr: any) => {
      const prevDiff = Math.abs(new Date(prev.dt_txt).getTime() - target)
      const currDiff = Math.abs(new Date(curr.dt_txt).getTime() - target)
      return currDiff < prevDiff ? curr : prev
    })

    return NextResponse.json({
      descricao: closest.weather[0].description,
      temp_min: Math.round(closest.main.temp_min),
      temp_max: Math.round(closest.main.temp_max),
      chuva: closest.rain?.['3h'] ?? 0,
      vento: Math.round(closest.wind.speed * 3.6), // m/s para km/h
      icone: closest.weather[0].icon,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao buscar clima' }, { status: 500 })
  }
}