import type { City } from '../lib/climate'
import { DATA_YEARS } from '../lib/climate'
import { MONTHS, convTemp, fmtTemp, type TempUnit } from '../lib/format'
import { uvWord } from '../lib/metrics'

const G = (n: number | null) => (n == null ? '–' : Math.round(n).toLocaleString('en-US'))

interface Row {
  label: string
  av: number | null
  bv: number | null
  fa: string
  fb: string
  /** Which direction reads as the headline value, for emphasis only. */
  emphasize?: 'high' | 'low'
}

interface Props {
  a: City
  b: City
  unit: TempUnit
}

export function CityPortrait({ a, b, unit }: Props) {
  const rows: Row[] = [
    {
      label: 'Average temperature',
      av: a.summary.annualTempMean,
      bv: b.summary.annualTempMean,
      fa: fmtTemp(a.summary.annualTempMean, unit, 1),
      fb: fmtTemp(b.summary.annualTempMean, unit, 1),
      emphasize: 'high',
    },
    {
      label: 'Warm-season high',
      av: a.summary.annualTempMax,
      bv: b.summary.annualTempMax,
      fa: fmtTemp(a.summary.annualTempMax, unit, 0),
      fb: fmtTemp(b.summary.annualTempMax, unit, 0),
      emphasize: 'high',
    },
    {
      label: 'Cool-season low',
      av: a.summary.annualTempMin,
      bv: b.summary.annualTempMin,
      fa: fmtTemp(a.summary.annualTempMin, unit, 0),
      fb: fmtTemp(b.summary.annualTempMin, unit, 0),
      emphasize: 'low',
    },
    {
      label: 'Sunshine',
      av: a.summary.annualSunHours,
      bv: b.summary.annualSunHours,
      fa: `${G(a.summary.annualSunHours)} h`,
      fb: `${G(b.summary.annualSunHours)} h`,
      emphasize: 'high',
    },
    {
      label: 'Rainfall',
      av: a.summary.annualRain,
      bv: b.summary.annualRain,
      fa: `${G(a.summary.annualRain)} mm`,
      fb: `${G(b.summary.annualRain)} mm`,
      emphasize: 'high',
    },
    {
      label: 'Wet days a year',
      av: a.summary.annualRainDays,
      bv: b.summary.annualRainDays,
      fa: `${G(a.summary.annualRainDays)}`,
      fb: `${G(b.summary.annualRainDays)}`,
      emphasize: 'high',
    },
    {
      label: 'Snowfall',
      av: a.summary.annualSnow,
      bv: b.summary.annualSnow,
      fa: a.summary.annualSnow >= 0.5 ? `${G(a.summary.annualSnow)} cm` : '—',
      fb: b.summary.annualSnow >= 0.5 ? `${G(b.summary.annualSnow)} cm` : '—',
      emphasize: 'high',
    },
    {
      label: 'Peak UV index',
      av: a.summary.peakUv,
      bv: b.summary.peakUv,
      fa: `${a.summary.peakUv.toFixed(0)} · ${uvWord(a.summary.peakUv)}`,
      fb: `${b.summary.peakUv.toFixed(0)} · ${uvWord(b.summary.peakUv)}`,
      emphasize: 'high',
    },
    {
      label: 'Windiness',
      av: a.summary.avgWind,
      bv: b.summary.avgWind,
      fa: `${a.summary.avgWind.toFixed(0)} km/h`,
      fb: `${b.summary.avgWind.toFixed(0)} km/h`,
      emphasize: 'high',
    },
  ]

  const lead = (r: Row): 'a' | 'b' | null => {
    if (r.av == null || r.bv == null || r.av === r.bv) return null
    const aWins = r.emphasize === 'low' ? r.av < r.bv : r.av > r.bv
    return aWins ? 'a' : 'b'
  }

  const head = (c: City) => (
    <div className="cmp-city">
      <span className="cmp-city-name">{c.name}</span>
      <span className="cmp-city-meta">
        {c.country} · warmest {MONTHS[c.summary.warmestMonth]}, coolest {MONTHS[c.summary.coldestMonth]}
      </span>
    </div>
  )

  return (
    <section className="portrait" aria-label="Annual climate at a glance">
      <div className="portrait-intro">
        <p className="kicker">At a glance</p>
        <h2>A year, side by side</h2>
        <p className="portrait-note">
          Climate normals from {DATA_YEARS}. Hover any chart below to scrub a single day across every measure.
        </p>
      </div>
      <div className="cmp">
        <div className="cmp-headrow">
          <div className="cmp-rowlabel" />
          <div className="cmp-val cmp-head city-a">{head(a)}</div>
          <div className="cmp-val cmp-head city-b">{head(b)}</div>
        </div>
        {rows.map((r) => {
          const l = lead(r)
          return (
            <div className="cmp-row" key={r.label}>
              <div className="cmp-rowlabel">{r.label}</div>
              <div className={`cmp-val${l === 'a' ? ' is-lead city-a' : ''}`}>{r.fa}</div>
              <div className={`cmp-val${l === 'b' ? ' is-lead city-b' : ''}`}>{r.fb}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
