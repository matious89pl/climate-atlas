import { useMemo, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import type { ViewMode } from '../../lib/climate'
import { MONTH_DAYS, MONTH_START_INDEX } from '../../lib/climate'
import { MONTHS } from '../../lib/format'
import { useMeasure } from '../../lib/useMeasure'
import { clamp, linear } from '../../lib/scales'

export interface Scales {
  width: number
  height: number
  left: number
  top: number
  innerW: number
  innerH: number
  mode: ViewMode
  n: number
  slot: number
  x: (i: number) => number
  y: (v: number) => number
  monthCenterX: (m: number) => number
  yDomain: [number, number]
}

export interface YBand {
  from: number
  to: number
  color: string
  label?: string
}

interface ChartShellProps {
  mode: ViewMode
  height?: number
  yDomain: [number, number]
  yTicks: number[]
  yFormat: (v: number) => string
  yBands?: YBand[]
  hoverIndex: number | null
  onHover: (i: number | null) => void
  ariaLabel: string
  children: (s: Scales) => ReactNode
}

const M = { left: 40, right: 16, top: 14, bottom: 26 }

export function ChartShell({
  mode,
  height = 248,
  yDomain,
  yTicks,
  yFormat,
  yBands,
  hoverIndex,
  onHover,
  ariaLabel,
  children,
}: ChartShellProps) {
  const [ref, width] = useMeasure<HTMLDivElement>()

  const scales = useMemo<Scales | null>(() => {
    if (width <= 0) return null
    const innerW = width - M.left - M.right
    const innerH = height - M.top - M.bottom
    const n = mode === 'daily' ? 366 : 12
    const slot = innerW / 12
    const xDaily = linear(0, 365, M.left, M.left + innerW)
    const x = (i: number) =>
      mode === 'daily' ? xDaily(i) : M.left + (i + 0.5) * slot
    const y = linear(yDomain[0], yDomain[1], M.top + innerH, M.top)
    const monthCenterX = (m: number) =>
      mode === 'daily' ? xDaily(MONTH_START_INDEX[m] + MONTH_DAYS[m] / 2) : x(m)
    return { width, height, left: M.left, top: M.top, innerW, innerH, mode, n, slot, x, y, monthCenterX, yDomain }
  }, [width, height, mode, yDomain])

  function handleMove(e: ReactPointerEvent<SVGRectElement>) {
    if (!scales) return
    const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect()
    const frac = clamp((e.clientX - rect.left) / rect.width, 0, 1)
    const i = mode === 'daily' ? Math.round(frac * 365) : clamp(Math.floor(frac * 12), 0, 11)
    onHover(i)
  }

  return (
    <div className="chart" ref={ref} style={{ height }}>
      {scales && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          {/* horizontal risk / context bands (e.g. UV) */}
          {yBands?.map((b, k) => {
            const yTo = scales.y(Math.min(b.to, yDomain[1]))
            const yFrom = scales.y(Math.max(b.from, yDomain[0]))
            return (
              <rect
                key={k}
                x={scales.left}
                y={yTo}
                width={scales.innerW}
                height={Math.max(0, yFrom - yTo)}
                fill={b.color}
              />
            )
          })}

          {/* y gridlines + labels */}
          {yTicks.map((t) => {
            const yy = scales.y(t)
            return (
              <g key={t} className="grid-y">
                <line x1={scales.left} x2={scales.left + scales.innerW} y1={yy} y2={yy} />
                <text x={scales.left - 8} y={yy} dominantBaseline="middle" textAnchor="end" className="tick-label">
                  {yFormat(t)}
                </text>
              </g>
            )
          })}

          {/* month axis */}
          {MONTHS.map((mn, m) => {
            const cx = scales.monthCenterX(m)
            const active = hoverIndex != null && (mode === 'daily'
              ? hoverIndex >= MONTH_START_INDEX[m] && hoverIndex < MONTH_START_INDEX[m] + MONTH_DAYS[m]
              : hoverIndex === m)
            return (
              <text
                key={mn}
                x={cx}
                y={scales.top + scales.innerH + 17}
                textAnchor="middle"
                className={`month-label${active ? ' is-active' : ''}`}
              >
                {mode === 'monthly' ? mn : mn.charAt(0)}
              </text>
            )
          })}

          {/* crosshair line */}
          {hoverIndex != null && (
            <line
              className="crosshair"
              x1={scales.x(hoverIndex)}
              x2={scales.x(hoverIndex)}
              y1={scales.top}
              y2={scales.top + scales.innerH}
            />
          )}

          {children(scales)}

          {/* pointer capture */}
          <rect
            x={scales.left}
            y={scales.top}
            width={scales.innerW}
            height={scales.innerH}
            fill="transparent"
            style={{ touchAction: 'none' }}
            onPointerMove={handleMove}
            onPointerDown={handleMove}
            onPointerLeave={() => onHover(null)}
          />
        </svg>
      )}
    </div>
  )
}
