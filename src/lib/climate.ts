// Typed access to the baked climate normals (src/data/climate.json).

import raw from '../data/climate.json'

export type Hemisphere = 'north' | 'south'
export type ViewMode = 'daily' | 'monthly'

export interface DailyNormals {
  tempMax: (number | null)[]
  tempMin: (number | null)[]
  tempMean: (number | null)[]
  feelsLike: (number | null)[]
  sunHours: (number | null)[]
  rain: (number | null)[]
  snow: (number | null)[]
  wind: (number | null)[]
  windGust: (number | null)[]
  daylight: (number | null)[]
  uv: (number | null)[]
}

export interface MonthlyNormals {
  tempMax: (number | null)[]
  tempMin: (number | null)[]
  tempMean: (number | null)[]
  feelsLike: (number | null)[]
  wind: (number | null)[]
  windGust: (number | null)[]
  daylight: (number | null)[]
  sunHoursPerDay: (number | null)[]
  sunHoursTotal: (number | null)[]
  rainTotal: (number | null)[]
  rainDays: (number | null)[]
  snowTotal: (number | null)[]
  uv: (number | null)[]
}

export interface CitySummary {
  annualTempMean: number
  annualTempMax: number
  annualTempMin: number
  annualRain: number
  annualSnow: number
  annualRainDays: number
  annualSunHours: number
  avgWind: number
  peakUv: number
  avgUv: number | null
  warmestMonth: number
  coldestMonth: number
  wettestMonth: number
  driestMonth: number
  sunniestMonth: number
}

export interface City {
  id: string
  name: string
  country: string
  lat: number
  lon: number
  timezone: string
  hemisphere: Hemisphere
  daily: DailyNormals
  monthly: MonthlyNormals
  summary: CitySummary
}

export interface ClimateData {
  meta: {
    generated: string
    source: string
    archiveStart: string
    archiveEnd: string
    uvStart: string
    uvEnd: string
    smoothingWindowDays: number
    cityOrder: string[]
  }
  calendar: string[]
  monthDays: number[]
  cities: Record<string, City>
}

export const DATA = raw as unknown as ClimateData
export const CALENDAR = DATA.calendar
export const MONTH_DAYS = DATA.monthDays

export const CITY_LIST: City[] = DATA.meta.cityOrder
  .map((id) => DATA.cities[id])
  .filter(Boolean)

export function getCity(id: string): City {
  return DATA.cities[id] ?? CITY_LIST[0]
}

/** Cumulative day index of the first of each month, for axis ticks. */
export const MONTH_START_INDEX: number[] = (() => {
  const out: number[] = []
  let acc = 0
  for (let m = 0; m < 12; m++) {
    out.push(acc)
    acc += MONTH_DAYS[m]
  }
  return out
})()

export const DATA_YEARS = `${DATA.meta.archiveStart.slice(0, 4)}–${DATA.meta.archiveEnd.slice(0, 4)}`
