// One source of truth for the six compared metrics: how to read a value for a city
// at a given day/month, how to format it, the headline insight, and (for UV) the
// WHO risk bands. Shared by the metric sections and the synchronized readout.

import type { City, ViewMode } from './climate'
import { MONTH_DAYS } from './climate'
import { fmt, fmtTemp, convTemp, type TempUnit } from './format'

export interface MetricMeta {
  key: string
  title: string
  subtitle: string
  unitLabel: (mode: ViewMode) => string
  isTemp?: boolean
  get: (c: City, mode: ViewMode, i: number) => number | null
  format: (v: number | null, unit: TempUnit) => string
  insight: (a: City, b: City, unit: TempUnit) => string
}

const annualMean = (arr: (number | null)[], weights?: number[]) => {
  let s = 0
  let w = 0
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    if (v == null) continue
    const ww = weights ? weights[i] : 1
    s += v * ww
    w += ww
  }
  return w ? s / w : 0
}

const degUnit = (unit: TempUnit) => (unit === 'f' ? '°F' : '°C')
const tempDiff = (c: number, unit: TempUnit) => (unit === 'f' ? c * 9 / 5 : c)
const groupInt = (n: number) => Math.round(n).toLocaleString('en-US')

export function uvWord(v: number): string {
  if (v < 3) return 'low'
  if (v < 6) return 'moderate'
  if (v < 8) return 'high'
  if (v < 11) return 'very high'
  return 'extreme'
}

export const UV_BANDS = [
  { from: 0, to: 3, color: '#d3e3c4', label: 'Low' },
  { from: 3, to: 6, color: '#f6e7a6', label: 'Moderate' },
  { from: 6, to: 8, color: '#f3d09a', label: 'High' },
  { from: 8, to: 11, color: '#eeb2a1', label: 'Very high' },
  { from: 11, to: 16, color: '#dab7d0', label: 'Extreme' },
]

export const METRICS: MetricMeta[] = [
  {
    key: 'temp',
    title: 'Temperature',
    subtitle: 'Average temperature, with the typical daily high–low range shaded behind.',
    unitLabel: () => '',
    isTemp: true,
    get: (c, mode, i) => (mode === 'daily' ? c.daily.tempMean : c.monthly.tempMean)[i],
    format: (v, unit) => fmtTemp(v, unit, 0),
    insight: (a, b, unit) => {
      const d = a.summary.annualTempMean - b.summary.annualTempMean
      const [warm, cool] = d >= 0 ? [a, b] : [b, a]
      return `${warm.name} runs ${tempDiff(Math.abs(d), unit).toFixed(1)}${degUnit(unit)} warmer than ${cool.name} averaged over the year — but the gap swings month to month.`
    },
  },
  {
    key: 'feels',
    title: 'Feels-like',
    subtitle: 'Apparent temperature — what it actually feels like once wind and humidity are folded in.',
    unitLabel: () => '',
    isTemp: true,
    get: (c, mode, i) => (mode === 'daily' ? c.daily.feelsLike : c.monthly.feelsLike)[i],
    format: (v, unit) => fmtTemp(v, unit, 0),
    insight: (a, b, unit) => {
      const fa = annualMean(a.monthly.feelsLike, MONTH_DAYS)
      const fb = annualMean(b.monthly.feelsLike, MONTH_DAYS)
      const [warm, cool] = fa >= fb ? [a, b] : [b, a]
      return `Factoring in wind and humidity, ${warm.name} feels ${tempDiff(Math.abs(fa - fb), unit).toFixed(1)}${degUnit(unit)} warmer than ${cool.name} on a typical day.`
    },
  },
  {
    key: 'sun',
    title: 'Sunshine',
    subtitle: 'Hours of bright sunshine — totalled by month, averaged by day.',
    unitLabel: (mode) => (mode === 'daily' ? 'hours / day' : 'hours / month'),
    get: (c, mode, i) => (mode === 'daily' ? c.daily.sunHours[i] : c.monthly.sunHoursTotal[i]),
    format: (v) => fmt(v, v != null && v < 10 ? 1 : 0, ' h'),
    insight: (a, b) => {
      const d = a.summary.annualSunHours - b.summary.annualSunHours
      const [more, less] = d >= 0 ? [a, b] : [b, a]
      return `${more.name} banks ${groupInt(Math.abs(d))} more hours of sunshine a year — ${groupInt(more.summary.annualSunHours)} h against ${less.name}'s ${groupInt(less.summary.annualSunHours)} h.`
    },
  },
  {
    key: 'rain',
    title: 'Rain & snow',
    subtitle: 'Precipitation totals. Snowfall, where it falls, sits stacked on the rain.',
    unitLabel: (mode) => (mode === 'daily' ? 'mm / day' : 'mm / month'),
    get: (c, mode, i) => (mode === 'daily' ? c.daily.rain[i] : c.monthly.rainTotal[i]),
    format: (v) => fmt(v, v != null && v < 10 ? 1 : 0, ' mm'),
    insight: (a, b) => {
      const [wet, dry] = a.summary.annualRain >= b.summary.annualRain ? [a, b] : [b, a]
      const ratio = wet.summary.annualRain / Math.max(1, dry.summary.annualRain)
      const snowy = a.summary.annualSnow > b.summary.annualSnow ? a : b
      const snowNote = snowy.summary.annualSnow >= 1
        ? ` ${snowy.name} also gets about ${groupInt(snowy.summary.annualSnow)} cm of snow.`
        : ' Neither city sees meaningful snow.'
      return `${wet.name} collects ${groupInt(wet.summary.annualRain)} mm of rain a year, ${ratio.toFixed(1)}× ${dry.name}'s ${groupInt(dry.summary.annualRain)} mm.${snowNote}`
    },
  },
  {
    key: 'wind',
    title: 'Wind',
    subtitle: 'Average of each day’s peak wind speed.',
    unitLabel: () => 'km/h',
    get: (c, mode, i) => (mode === 'daily' ? c.daily.wind : c.monthly.wind)[i],
    format: (v) => fmt(v, 0, ' km/h'),
    insight: (a, b) => {
      const [windy, calm] = a.summary.avgWind >= b.summary.avgWind ? [a, b] : [b, a]
      return `${windy.name} is the breezier of the two, with daily peaks near ${windy.summary.avgWind.toFixed(0)} km/h versus ${calm.name}'s ${calm.summary.avgWind.toFixed(0)} km/h.`
    },
  },
  {
    key: 'uv',
    title: 'UV index',
    subtitle: 'Peak daily ultraviolet level, banded by the WHO exposure scale.',
    unitLabel: () => '',
    get: (c, mode, i) => (mode === 'daily' ? c.daily.uv : c.monthly.uv)[i],
    format: (v) => fmt(v, 1),
    insight: (a, b) => {
      const [hi, lo] = a.summary.peakUv >= b.summary.peakUv ? [a, b] : [b, a]
      return `${hi.name}'s summer sun is fierce — UV peaks around ${hi.summary.peakUv.toFixed(0)} (${uvWord(hi.summary.peakUv)}), while ${lo.name} tops out near ${lo.summary.peakUv.toFixed(0)} (${uvWord(lo.summary.peakUv)}).`
    },
  },
]
