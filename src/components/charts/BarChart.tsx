import { ChartShell } from './ChartShell'
import type { City } from '../../lib/climate'
import { extent, niceDomain, ticks } from '../../lib/scales'

const cityVar = (slot: number) => (slot === 0 ? 'var(--city-a)' : 'var(--city-b)')

interface Props {
  hoverIndex: number | null
  onHover: (i: number | null) => void
  cities: [City, City]
  getMain: (c: City) => (number | null)[]
  getStack?: (c: City) => (number | null)[]
  tickFormat: (v: number) => string
  ariaLabel: string
}

/** Grouped monthly bars for the two cities, with an optional stacked second
 *  series (used to put snowfall on top of rainfall). */
export function BarChart({ hoverIndex, onHover, cities, getMain, getStack, tickFormat, ariaLabel }: Props) {
  const main = cities.map((c) => getMain(c))
  const stack = getStack ? cities.map((c) => getStack(c)) : null

  const totals = main.map((arr, i) =>
    arr.map((v, m) => (v == null ? null : (v ?? 0) + (stack ? (stack[i][m] ?? 0) : 0))),
  )
  const [, hiRaw] = extent(...totals)
  const [lo, hi] = niceDomain(0, hiRaw, { padFrac: 0.1, zero: true })
  const yT = ticks(lo, hi, 5)

  return (
    <ChartShell
      mode="monthly"
      hoverIndex={hoverIndex}
      onHover={onHover}
      yDomain={[lo, hi]}
      yTicks={yT}
      yFormat={tickFormat}
      ariaLabel={ariaLabel}
    >
      {(s) => {
        const barW = s.slot * 0.3
        const gap = s.slot * 0.06
        const base = s.y(0)
        return (
          <g>
            {Array.from({ length: 12 }, (_, m) => {
              const center = s.monthCenterX(m)
              const dim = hoverIndex != null && hoverIndex !== m
              return (
                <g key={m} style={{ opacity: dim ? 0.38 : 1 }} className="bar-group">
                  {cities.map((_, idx) => {
                    const x = idx === 0 ? center - gap / 2 - barW : center + gap / 2
                    const rainV = main[idx][m] ?? 0
                    const snowV = stack ? (stack[idx][m] ?? 0) : 0
                    const yRain = s.y(rainV)
                    const ySnow = s.y(rainV + snowV)
                    return (
                      <g key={idx} className="bar">
                        <rect
                          x={x}
                          y={yRain}
                          width={barW}
                          height={Math.max(0, base - yRain)}
                          rx={1.5}
                          style={{ fill: cityVar(idx) }}
                        />
                        {snowV > 0 && (
                          <rect
                            x={x}
                            y={ySnow}
                            width={barW}
                            height={Math.max(0, yRain - ySnow)}
                            rx={1.5}
                            className="snow-bar"
                            style={{ fill: `color-mix(in oklch, ${cityVar(idx)} 32%, white)` }}
                          />
                        )}
                      </g>
                    )
                  })}
                </g>
              )
            })}
          </g>
        )
      }}
    </ChartShell>
  )
}
