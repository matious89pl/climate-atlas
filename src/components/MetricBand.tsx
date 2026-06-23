import type { ReactNode } from 'react'
import type { City, ViewMode } from '../lib/climate'
import type { MetricMeta } from '../lib/metrics'
import type { TempUnit } from '../lib/format'

interface Props {
  index: number
  meta: MetricMeta
  a: City
  b: City
  unit: TempUnit
  mode: ViewMode
  note?: string
  legend?: ReactNode
  children: ReactNode
}

export function MetricBand({ index, meta, a, b, unit, mode, note, legend, children }: Props) {
  return (
    <section className="band" id={`metric-${meta.key}`}>
      <div className="band-rail">
        <span className="band-index">{String(index + 1).padStart(2, '0')}</span>
        <h3 className="band-title">{meta.title}</h3>
        <p className="band-sub">{meta.subtitle}</p>
        <p className="band-insight">{meta.insight(a, b, unit)}</p>
        {legend}
        {note && <p className="band-note">{note}</p>}
      </div>
      <div className="band-chart">
        {meta.unitLabel(mode) && <div className="band-unit">{meta.unitLabel(mode)}</div>}
        {children}
      </div>
    </section>
  )
}
