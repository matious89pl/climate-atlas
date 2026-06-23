// Build step: download ~20 years of daily weather from Open-Meteo's ERA5 reanalysis
// archive (+ CAMS UV index), reduce it to climate normals, and bake the result into
// src/data/climate.json. Run with: npm run fetch-data
//
// Normals are computed two ways so the UI can show both views the user asked for:
//   - day-by-day  : one smoothed value per calendar day (366 points, Feb 29 included)
//   - month-by-month: one value per month (12 points), using totals where that is the
//     natural unit (rain mm/month, sunshine hours/month) and averages otherwise.
//
// No API key is required. Data © Open-Meteo (CC-BY-4.0), ERA5 / CAMS.

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CITIES } from './cities.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_FILE = resolve(__dirname, '../src/data/climate.json')

// 12 years keeps the API-weight per request under Open-Meteo's free-tier limit
// while still giving a stable climatology.
const ARCHIVE_START = '2013-01-01'
const ARCHIVE_END = '2024-12-31'
const SLEEP_BETWEEN_CITIES = 6000 // ms — stay under the per-minute weighted limit
// CAMS UV reanalysis only reaches back to mid-2022, so UV normals use a shorter window.
const UV_START = '2022-08-01'
const UV_END = '2024-12-31'
const SMOOTH_HALF = 4 // ±4 days -> 9-day centred window for day-by-day curves

const DAILY_VARS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'temperature_2m_mean',
  'apparent_temperature_mean',
  'sunshine_duration',
  'daylight_duration',
  'precipitation_sum',
  'rain_sum',
  'snowfall_sum',
  'precipitation_hours',
  'windspeed_10m_max',
  'windgusts_10m_max',
]

// ---- canonical 366-day calendar (leap year so Feb 29 has a slot) --------------
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const CALENDAR = [] // ['01-01', '01-02', ... '12-31'] length 366
const KEY_INDEX = new Map()
for (let m = 0; m < 12; m++) {
  for (let d = 1; d <= DAYS_IN_MONTH[m]; d++) {
    const key = `${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    KEY_INDEX.set(key, CALENDAR.length)
    CALENDAR.push(key)
  }
}
const MONTH_OF_INDEX = CALENDAR.map((k) => parseInt(k.slice(0, 2), 10) - 1)

// ---- tiny helpers -------------------------------------------------------------
const sum = (a) => a.reduce((s, x) => s + x, 0)
const round = (x, d = 1) => {
  if (x == null || Number.isNaN(x)) return null
  const f = 10 ** d
  return Math.round(x * f) / f
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchJson(url, label, attempts = 6) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url)
      if (res.status === 429) throw new Error('rate-limited (429)')
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`)
      return await res.json()
    } catch (e) {
      lastErr = e
      // 429s need to outlast the per-minute window, so back off much harder for them.
      const base = String(e.message).includes('429') ? 9000 : 1500
      const wait = base * (i + 1)
      process.stdout.write(`    retry ${i + 1}/${attempts} for ${label} (${e.message}) in ${wait}ms\n`)
      await new Promise((r) => setTimeout(r, wait))
    }
  }
  throw new Error(`Failed ${label}: ${lastErr?.message}`)
}

// Circular moving average that ignores null gaps (keeps season-boundary continuity).
function smoothCircular(arr, half) {
  const n = arr.length
  const out = new Array(n)
  for (let i = 0; i < n; i++) {
    let s = 0
    let c = 0
    for (let j = -half; j <= half; j++) {
      const v = arr[(i + j + n) % n]
      if (v != null && !Number.isNaN(v)) {
        s += v
        c++
      }
    }
    out[i] = c ? s / c : null
  }
  return out
}

// Average, per month, of each year's monthly total (used for rain / snow / sunshine).
function monthlyMeanOfYearTotals(byYearMonth) {
  const buckets = Array.from({ length: 12 }, () => [])
  for (const [k, v] of Object.entries(byYearMonth)) {
    const month = parseInt(k.split('|')[1], 10)
    buckets[month].push(v)
  }
  return buckets.map((vals) => (vals.length ? sum(vals) / vals.length : 0))
}

// ---- per-city processing ------------------------------------------------------
function processArchive(raw) {
  const time = raw.time
  const n = time.length

  const series = {
    tempMax: raw.temperature_2m_max,
    tempMin: raw.temperature_2m_min,
    tempMean: raw.temperature_2m_mean,
    feelsLike: raw.apparent_temperature_mean,
    sunHours: raw.sunshine_duration.map((s) => (s == null ? null : s / 3600)),
    daylight: raw.daylight_duration.map((s) => (s == null ? null : s / 3600)),
    rain: raw.rain_sum,
    snow: raw.snowfall_sum,
    wind: raw.windspeed_10m_max,
    windGust: raw.windgusts_10m_max,
  }
  const precip = raw.precipitation_sum

  // day-of-year accumulators (sum + count over all years)
  const dnKeys = Object.keys(series)
  const dn = Object.fromEntries(
    dnKeys.map((k) => [k, { sum: new Float64Array(366), cnt: new Float64Array(366) }]),
  )
  // month accumulators for straight averages
  const mAvgKeys = ['tempMax', 'tempMin', 'tempMean', 'feelsLike', 'wind', 'windGust', 'daylight']
  const mAvg = Object.fromEntries(
    mAvgKeys.map((k) => [k, { sum: new Float64Array(12), cnt: new Float64Array(12) }]),
  )
  // per-year-month totals (averaged across years afterwards)
  const ymRain = {}
  const ymSnow = {}
  const ymSun = {}
  const ymRainDays = {}
  const accTotal = (map, key, v) => {
    if (v != null && !Number.isNaN(v)) map[key] = (map[key] || 0) + v
  }

  for (let i = 0; i < n; i++) {
    const date = time[i]
    const di = KEY_INDEX.get(date.slice(5)) // 'MM-DD'
    if (di == null) continue
    const month = parseInt(date.slice(5, 7), 10) - 1
    const ym = `${date.slice(0, 4)}|${month}`

    for (const k of dnKeys) {
      const v = series[k][i]
      if (v != null && !Number.isNaN(v)) {
        dn[k].sum[di] += v
        dn[k].cnt[di] += 1
      }
    }
    for (const k of mAvgKeys) {
      const v = series[k][i]
      if (v != null && !Number.isNaN(v)) {
        mAvg[k].sum[month] += v
        mAvg[k].cnt[month] += 1
      }
    }
    accTotal(ymRain, ym, series.rain[i])
    accTotal(ymSnow, ym, series.snow[i])
    accTotal(ymSun, ym, series.sunHours[i])
    if (precip[i] != null && precip[i] >= 1) ymRainDays[ym] = (ymRainDays[ym] || 0) + 1
  }

  // finalise day-by-day curves (average then smooth)
  const dailyNormal = (k, d = 1) => {
    const avg = new Array(366)
    for (let i = 0; i < 366; i++) avg[i] = dn[k].cnt[i] ? dn[k].sum[i] / dn[k].cnt[i] : null
    return smoothCircular(avg, SMOOTH_HALF).map((v) => round(v, d))
  }
  const monthlyAvg = (k, d = 1) => {
    const out = new Array(12)
    for (let m = 0; m < 12; m++) out[m] = mAvg[k].cnt[m] ? round(mAvg[k].sum[m] / mAvg[k].cnt[m], d) : null
    return out
  }

  const daily = {
    tempMax: dailyNormal('tempMax'),
    tempMin: dailyNormal('tempMin'),
    tempMean: dailyNormal('tempMean'),
    feelsLike: dailyNormal('feelsLike'),
    sunHours: dailyNormal('sunHours'),
    rain: dailyNormal('rain', 2),
    snow: dailyNormal('snow', 2),
    wind: dailyNormal('wind'),
    windGust: dailyNormal('windGust'),
    daylight: dailyNormal('daylight'),
  }

  const rainTotal = monthlyMeanOfYearTotals(ymRain).map((v) => round(v, 1))
  const snowTotal = monthlyMeanOfYearTotals(ymSnow).map((v) => round(v, 2))
  const sunHoursTotal = monthlyMeanOfYearTotals(ymSun).map((v) => round(v, 0))
  const rainDays = monthlyMeanOfYearTotals(ymRainDays).map((v) => round(v, 1))
  const monthly = {
    tempMax: monthlyAvg('tempMax'),
    tempMin: monthlyAvg('tempMin'),
    tempMean: monthlyAvg('tempMean'),
    feelsLike: monthlyAvg('feelsLike'),
    wind: monthlyAvg('wind'),
    windGust: monthlyAvg('windGust'),
    daylight: monthlyAvg('daylight'),
    sunHoursPerDay: sunHoursTotal.map((t, m) => round(t / DAYS_IN_MONTH[m], 1)),
    sunHoursTotal,
    rainTotal,
    rainDays,
    snowTotal,
  }

  return { daily, monthly }
}

function processUv(hourly) {
  // hourly UV -> per-day maximum -> day-of-year & month normals
  const time = hourly.time
  const uv = hourly.uv_index
  const byDate = {}
  for (let i = 0; i < time.length; i++) {
    const v = uv[i]
    if (v == null || Number.isNaN(v)) continue
    const date = time[i].slice(0, 10)
    if (byDate[date] == null || v > byDate[date]) byDate[date] = v
  }
  const dSum = new Float64Array(366)
  const dCnt = new Float64Array(366)
  const mSum = new Float64Array(12)
  const mCnt = new Float64Array(12)
  for (const [date, v] of Object.entries(byDate)) {
    const di = KEY_INDEX.get(date.slice(5))
    const month = parseInt(date.slice(5, 7), 10) - 1
    if (di != null) {
      dSum[di] += v
      dCnt[di] += 1
    }
    mSum[month] += v
    mCnt[month] += 1
  }
  const dailyRaw = new Array(366)
  for (let i = 0; i < 366; i++) dailyRaw[i] = dCnt[i] ? dSum[i] / dCnt[i] : null
  const daily = smoothCircular(dailyRaw, 6).map((v) => round(v, 1))
  const monthly = new Array(12)
  for (let m = 0; m < 12; m++) monthly[m] = mCnt[m] ? round(mSum[m] / mCnt[m], 1) : null
  return { daily, monthly }
}

function buildSummary(monthly, daily) {
  const months = [...Array(12).keys()]
  const argmax = (arr) => arr.reduce((best, v, i) => (v != null && (arr[best] == null || v > arr[best]) ? i : best), 0)
  const argmin = (arr) => arr.reduce((best, v, i) => (v != null && (arr[best] == null || v < arr[best]) ? i : best), 0)
  const weightedAnnualMean = sum(months.map((m) => (monthly.tempMean[m] ?? 0) * DAYS_IN_MONTH[m])) / 366
  const validUv = daily.uv.filter((v) => v != null)
  return {
    annualTempMean: round(weightedAnnualMean, 1),
    annualTempMax: round(Math.max(...monthly.tempMax.filter((v) => v != null)), 1),
    annualTempMin: round(Math.min(...monthly.tempMin.filter((v) => v != null)), 1),
    annualRain: round(sum(monthly.rainTotal), 0),
    annualSnow: round(sum(monthly.snowTotal), 1),
    annualRainDays: round(sum(monthly.rainDays), 0),
    annualSunHours: round(sum(monthly.sunHoursTotal), 0),
    avgWind: round(sum(daily.wind.filter((v) => v != null)) / daily.wind.filter((v) => v != null).length, 1),
    peakUv: round(Math.max(...monthly.uv.filter((v) => v != null)), 1),
    avgUv: validUv.length ? round(sum(validUv) / validUv.length, 1) : null,
    warmestMonth: argmax(monthly.tempMean),
    coldestMonth: argmin(monthly.tempMean),
    wettestMonth: argmax(monthly.rainTotal),
    driestMonth: argmin(monthly.rainTotal),
    sunniestMonth: argmax(monthly.sunHoursTotal),
  }
}

async function processCity(city) {
  process.stdout.write(`  ${city.name}: archive…`)
  const archiveUrl =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${city.lat}&longitude=${city.lon}` +
    `&start_date=${ARCHIVE_START}&end_date=${ARCHIVE_END}` +
    `&daily=${DAILY_VARS.join(',')}&timezone=${encodeURIComponent(city.timezone)}`
  const archive = await fetchJson(archiveUrl, `${city.name} archive`)
  const { daily, monthly } = processArchive(archive.daily)

  process.stdout.write(' uv…')
  const uvUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}` +
    `&hourly=uv_index&start_date=${UV_START}&end_date=${UV_END}&timezone=${encodeURIComponent(city.timezone)}`
  let uv = { daily: new Array(366).fill(null), monthly: new Array(12).fill(null) }
  try {
    const uvData = await fetchJson(uvUrl, `${city.name} uv`)
    uv = processUv(uvData.hourly)
  } catch (e) {
    process.stdout.write(` (uv unavailable: ${e.message})`)
  }
  daily.uv = uv.daily
  monthly.uv = uv.monthly

  const summary = buildSummary(monthly, daily)
  process.stdout.write(` done (avg ${summary.annualTempMean}°C, ${summary.annualRain}mm rain/yr)\n`)
  return {
    id: city.id,
    name: city.name,
    country: city.country,
    lat: city.lat,
    lon: city.lon,
    timezone: city.timezone,
    hemisphere: city.lat < 0 ? 'south' : 'north',
    daily,
    monthly,
    summary,
  }
}

function writeOut(cities) {
  const payload = {
    meta: {
      generated: new Date().toISOString(),
      source: 'Open-Meteo (ERA5 reanalysis & CAMS UV)',
      archiveStart: ARCHIVE_START,
      archiveEnd: ARCHIVE_END,
      uvStart: UV_START,
      uvEnd: UV_END,
      smoothingWindowDays: SMOOTH_HALF * 2 + 1,
      cityOrder: CITIES.map((c) => c.id),
    },
    calendar: CALENDAR,
    monthDays: DAYS_IN_MONTH,
    cities,
  }
  const json = JSON.stringify(payload)
  mkdirSync(dirname(OUT_FILE), { recursive: true })
  writeFileSync(OUT_FILE, json)
  return json.length
}

async function main() {
  console.log(`Fetching climate normals for ${CITIES.length} cities (${ARCHIVE_START}…${ARCHIVE_END})`)
  console.log('Source: Open-Meteo ERA5 reanalysis + CAMS UV. No API key required.\n')

  // Resume: keep any cities already saved so re-runs continue past a rate limit.
  let cities = {}
  if (existsSync(OUT_FILE) && !process.env.FORCE) {
    try {
      cities = JSON.parse(readFileSync(OUT_FILE, 'utf8')).cities || {}
    } catch {
      cities = {}
    }
  }

  for (let i = 0; i < CITIES.length; i++) {
    const city = CITIES[i]
    if (cities[city.id]) {
      console.log(`  ${city.name}: cached, skipping`)
      continue
    }
    const result = await processCity(city)
    cities[city.id] = result
    writeOut(cities) // save after every city so progress survives a failure
    if (i < CITIES.length - 1) await sleep(SLEEP_BETWEEN_CITIES)
  }

  const bytes = writeOut(cities)
  console.log(`\nWrote ${OUT_FILE} (${(bytes / 1024).toFixed(0)} KB, ${Object.keys(cities).length} cities)`)
}

main().catch((e) => {
  console.error('\nFETCH FAILED:', e)
  process.exit(1)
})
