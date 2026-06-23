import { ChartShell } from './ChartShell'
import type { City, ViewMode } from '../../lib/climate'
import { bandPath, linePath } from '../../lib/path'
import { extent, niceDomain, ticks } from '../../lib/scales'
import { convTemp, type TempUnit } from '../../lib/format'

const cityVar = (slot: number) => (slot === 0 ? 'var(--city-a)' : 'var(--city-b)')

interface Props {
  mode: ViewMode
  hoverIndex: number | null
  onHover: (i: number | null) => void
  cities: [City, City]
  unit: TempUnit
  smooth?: boolean
}

/** Daily/monthly mean temperature line with the min–max range as a soft band. */
export function TemperatureChart({ mode, hoverIndex, onHover, cities, unit, smooth = true }: Props) {
  const series = cities.map((c) => {
    const src = mode === 'daily' ? c.daily : c.monthly
    return {
      min: src.tempMin.map((v) => convTemp(v, unit)),
      max: src.tempMax.map((v) => convTemp(v, unit)),
      mean: src.tempMean.map((v) => convTemp(v, unit)),
    }
  })

  const [lo, hi] = niceDomain(
    ...extent(series[0].min, series[1].min, series[0].max, series[1].max),
    { padFrac: 0.12 },
  )
  const yT = ticks(lo, hi, 5)

  return (
    <ChartShell
      mode={mode}
      hoverIndex={hoverIndex}
      onHover={onHover}
      yDomain={[lo, hi]}
      yTicks={yT}
      yFormat={(v) => `${Math.round(v)}°`}
      ariaLabel="Temperature range, mean with daily high–low band"
    >
      {(s) => (
        <g>
          {series.map((sd, idx) => (
            <g key={idx}>
              <path
                d={bandPath(sd.min, sd.max, s.x, s.y, smooth)}
                className="temp-band"
                style={{ fill: `color-mix(in oklch, ${cityVar(idx)} 13%, transparent)` }}
              />
              <path
                className="series-line"
                pathLength={1}
                d={linePath(sd.mean, s.x, s.y, smooth)}
                style={{ stroke: cityVar(idx) }}
                fill="none"
              />
            </g>
          ))}
          {hoverIndex != null &&
            series.map((sd, idx) => {
              const v = sd.mean[hoverIndex]
              if (v == null) return null
              return (
                <circle
                  key={idx}
                  className="dot"
                  cx={s.x(hoverIndex)}
                  cy={s.y(v)}
                  r={4}
                  style={{ fill: cityVar(idx) }}
                />
              )
            })}
        </g>
      )}
    </ChartShell>
  )
}
