import { useMemo, useState, type CSSProperties } from 'react'
import { CALENDAR, DATA, DATA_YEARS, getCity, type City, type ViewMode } from './lib/climate'
import { METRICS, UV_BANDS } from './lib/metrics'
import { todayIndex, type TempUnit } from './lib/format'
import { Controls } from './components/Controls'
import { Readout } from './components/Readout'
import { CityPortrait } from './components/CityPortrait'
import { MetricBand } from './components/MetricBand'
import { Legend, type LegendItem } from './components/Legend'
import { TemperatureChart } from './components/charts/TemperatureChart'
import { LineChart } from './components/charts/LineChart'
import { BarChart } from './components/charts/BarChart'

const CITY_COLORS = {
  '--city-a': 'oklch(0.635 0.158 42)', // sun-baked terracotta
  '--city-b': 'oklch(0.555 0.095 242)', // cool slate blue
} as CSSProperties

function UvScale() {
  return (
    <div className="uv-scale" aria-hidden="true">
      {UV_BANDS.map((b) => (
        <span key={b.label} className="uv-step" style={{ background: b.color }}>
          {b.label}
        </span>
      ))}
    </div>
  )
}

export default function App() {
  const [aId, setAId] = useState('sydney')
  const [bId, setBId] = useState('london')
  const [mode, setMode] = useState<ViewMode>('daily')
  const [unit, setUnit] = useState<TempUnit>('c')
  const [hover, setHover] = useState<number | null>(null)

  const a = getCity(aId)
  const b = getCity(bId)
  const cities: [City, City] = [a, b]

  const defaultIndex = useMemo(
    () => (mode === 'daily' ? todayIndex(CALENDAR) : new Date().getMonth()),
    [mode],
  )
  const activeIndex = hover ?? defaultIndex
  const pinned = hover == null

  const onA = (id: string) => {
    if (id === bId) setBId(aId)
    setAId(id)
  }
  const onB = (id: string) => {
    if (id === aId) setAId(bId)
    setBId(id)
  }
  const onSwap = () => {
    setAId(bId)
    setBId(aId)
  }

  const cityItems: LegendItem[] = [
    { label: a.name, color: 'var(--city-a)' },
    { label: b.name, color: 'var(--city-b)' },
  ]

  const common = { mode, hoverIndex: activeIndex, onHover: setHover, cities }

  function chartFor(key: string) {
    switch (key) {
      case 'temp':
        return <TemperatureChart {...common} unit={unit} />
      case 'feels':
        return (
          <LineChart
            {...common}
            temp
            unit={unit}
            getSeries={(c, m) => (m === 'daily' ? c.daily.feelsLike : c.monthly.feelsLike)}
            getGhost={(c, m) => (m === 'daily' ? c.daily.tempMean : c.monthly.tempMean)}
            tickFormat={(v) => `${Math.round(v)}°`}
            ariaLabel="Feels-like temperature comparison"
          />
        )
      case 'sun':
        return mode === 'daily' ? (
          <LineChart
            {...common}
            fill
            zero
            getSeries={(c) => c.daily.sunHours}
            tickFormat={(v) => `${v.toFixed(0)}h`}
            ariaLabel="Daily sunshine hours comparison"
          />
        ) : (
          <BarChart
            hoverIndex={activeIndex}
            onHover={setHover}
            cities={cities}
            getMain={(c) => c.monthly.sunHoursTotal}
            tickFormat={(v) => `${v.toFixed(0)}h`}
            ariaLabel="Monthly sunshine hours comparison"
          />
        )
      case 'rain':
        return mode === 'daily' ? (
          <LineChart
            {...common}
            fill
            zero
            getSeries={(c) => c.daily.rain}
            tickFormat={(v) => `${v.toFixed(0)}`}
            ariaLabel="Daily rainfall comparison"
          />
        ) : (
          <BarChart
            hoverIndex={activeIndex}
            onHover={setHover}
            cities={cities}
            getMain={(c) => c.monthly.rainTotal}
            getStack={(c) => c.monthly.snowTotal}
            tickFormat={(v) => `${v.toFixed(0)}`}
            ariaLabel="Monthly rain and snow comparison"
          />
        )
      case 'wind':
        return (
          <LineChart
            {...common}
            zero
            getSeries={(c, m) => (m === 'daily' ? c.daily.wind : c.monthly.wind)}
            getGhost={(c, m) => (m === 'daily' ? c.daily.windGust : c.monthly.windGust)}
            tickFormat={(v) => `${v.toFixed(0)}`}
            ariaLabel="Wind speed comparison"
          />
        )
      case 'uv':
        return (
          <LineChart
            {...common}
            zero
            yBands={UV_BANDS}
            yMax={12}
            getSeries={(c, m) => (m === 'daily' ? c.daily.uv : c.monthly.uv)}
            tickFormat={(v) => `${v.toFixed(0)}`}
            ariaLabel="UV index comparison"
          />
        )
      default:
        return null
    }
  }

  function noteFor(key: string): string | undefined {
    switch (key) {
      case 'temp':
        return 'Shaded band spans the average daily high and low.'
      case 'feels':
        return 'Dashed line marks the actual average temperature.'
      case 'sun':
        return mode === 'monthly' ? 'Total bright-sunshine hours per month.' : 'Average bright-sunshine hours per day.'
      case 'rain':
        return mode === 'monthly'
          ? 'Bars are monthly rainfall; the pale cap is snowfall (cm).'
          : 'Average rainfall per day.'
      case 'wind':
        return 'Dashed line marks the average daily peak gust.'
      case 'uv':
        return 'Background bands follow the WHO UV-risk scale.'
      default:
        return undefined
    }
  }

  return (
    <div className="page" style={CITY_COLORS}>
      <header className="masthead">
        <p className="kicker">Climate Atlas</p>
        <h1 className="headline">
          <span className="city-a">{a.name}</span>
          <span className="vs">versus</span>
          <span className="city-b">{b.name}</span>
        </h1>
        <p className="lede">
          Two cities laid over one calendar year. Twelve years of reanalysis data ({DATA_YEARS}) distilled into a
          single typical year — scrub any day to compare them, measure for measure.
        </p>
      </header>

      <div className="topbar">
        <Controls
          aId={aId}
          bId={bId}
          onA={onA}
          onB={onB}
          onSwap={onSwap}
          mode={mode}
          onMode={setMode}
          unit={unit}
          onUnit={setUnit}
        />
        <Readout a={a} b={b} mode={mode} index={activeIndex} unit={unit} calendar={CALENDAR} pinned={pinned} />
      </div>

      <CityPortrait a={a} b={b} unit={unit} />

      <main className="bands">
        {METRICS.map((meta, i) => (
          <MetricBand
            key={meta.key}
            index={i}
            meta={meta}
            a={a}
            b={b}
            unit={unit}
            mode={mode}
            note={noteFor(meta.key)}
            legend={
              meta.key === 'uv' ? (
                <Legend items={cityItems} extra={<UvScale />} />
              ) : (
                <Legend items={cityItems} />
              )
            }
          >
            {chartFor(meta.key)}
          </MetricBand>
        ))}
      </main>

      <footer className="footnote">
        <p>
          Data: <strong>{DATA.meta.source}</strong>. Daily normals averaged over {DATA_YEARS}; UV from{' '}
          {DATA.meta.uvStart.slice(0, 4)}–{DATA.meta.uvEnd.slice(0, 4)}. Curves are smoothed with a{' '}
          {DATA.meta.smoothingWindowDays}-day window. Values are climatological averages, not a forecast.
        </p>
        <p className="footnote-meta">Open-Meteo · ERA5 &amp; CAMS · built {DATA.meta.generated.slice(0, 10)}</p>
      </footer>
    </div>
  )
}
