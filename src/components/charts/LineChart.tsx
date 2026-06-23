import { ChartShell, type YBand } from './ChartShell'
import type { City, ViewMode } from '../../lib/climate'
import { areaPath, linePath } from '../../lib/path'
import { extent, niceDomain, ticks } from '../../lib/scales'
import { convTemp, type TempUnit } from '../../lib/format'

const cityVar = (slot: number) => (slot === 0 ? 'var(--city-a)' : 'var(--city-b)')

type Pick = (c: City, mode: ViewMode) => (number | null)[]

interface Props {
  mode: ViewMode
  hoverIndex: number | null
  onHover: (i: number | null) => void
  cities: [City, City]
  getSeries: Pick
  getGhost?: Pick
  temp?: boolean
  unit?: TempUnit
  tickFormat: (v: number) => string
  yBands?: YBand[]
  yMax?: number
  zero?: boolean
  fill?: boolean
  smooth?: boolean
  ariaLabel: string
}

/** Generic two-city line chart: optional fill, faint "ghost" reference line, and
 *  optional horizontal context bands (used for UV risk levels). */
export function LineChart({
  mode,
  hoverIndex,
  onHover,
  cities,
  getSeries,
  getGhost,
  temp = false,
  unit = 'c',
  tickFormat,
  yBands,
  yMax,
  zero = false,
  fill = false,
  smooth = true,
  ariaLabel,
}: Props) {
  const conv = (arr: (number | null)[]) => (temp ? arr.map((v) => convTemp(v, unit)) : arr)
  const main = cities.map((c) => conv(getSeries(c, mode)))
  const ghost = getGhost ? cities.map((c) => conv(getGhost(c, mode))) : null

  const domainArrays = [...main, ...(ghost ?? [])]
  let [lo, hi] = niceDomain(...extent(...domainArrays), { padFrac: 0.12, zero })
  if (yMax != null) hi = Math.max(hi, yMax)
  const yT = ticks(lo, hi, 5)

  return (
    <ChartShell
      mode={mode}
      hoverIndex={hoverIndex}
      onHover={onHover}
      yDomain={[lo, hi]}
      yTicks={yT}
      yFormat={tickFormat}
      yBands={yBands}
      ariaLabel={ariaLabel}
    >
      {(s) => (
        <g>
          {fill &&
            main.map((arr, idx) => (
              <path
                key={`f${idx}`}
                d={areaPath(arr, s.x, s.y, s.y(lo), smooth)}
                style={{ fill: `color-mix(in oklch, ${cityVar(idx)} 16%, transparent)` }}
              />
            ))}
          {ghost &&
            ghost.map((arr, idx) => (
              <path
                key={`g${idx}`}
                className="ghost-line"
                d={linePath(arr, s.x, s.y, smooth)}
                style={{ stroke: cityVar(idx) }}
                fill="none"
              />
            ))}
          {main.map((arr, idx) => (
            <path
              key={`m${idx}`}
              className="series-line"
              pathLength={1}
              d={linePath(arr, s.x, s.y, smooth)}
              style={{ stroke: cityVar(idx) }}
              fill="none"
            />
          ))}
          {hoverIndex != null &&
            main.map((arr, idx) => {
              const v = arr[hoverIndex]
              if (v == null) return null
              return (
                <circle
                  key={`d${idx}`}
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
