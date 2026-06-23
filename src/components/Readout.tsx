import type { City, ViewMode } from '../lib/climate'
import { METRICS } from '../lib/metrics'
import { dayLabel, MONTHS_FULL, type TempUnit } from '../lib/format'

interface Props {
  a: City
  b: City
  mode: ViewMode
  index: number
  unit: TempUnit
  calendar: string[]
  pinned: boolean
}

/** The synchronized scrubber readout: whatever calendar day (or month) the pointer
 *  is over on any chart, every metric for both cities updates here at once. */
export function Readout({ a, b, mode, index, unit, calendar, pinned }: Props) {
  const dateText = mode === 'daily' ? dayLabel(calendar, index) : MONTHS_FULL[index]
  return (
    <div className="readout">
      <div className="readout-date">
        <span className="readout-kicker">{pinned ? (mode === 'daily' ? 'Today' : 'This month') : 'Reading'}</span>
        <span className="readout-day">{dateText}</span>
      </div>
      <div className="readout-metrics">
        {METRICS.map((m) => (
          <div className="readout-metric" key={m.key}>
            <span className="readout-label">{m.title}</span>
            <span className="readout-values">
              <span className="rv rv-a">{m.format(m.get(a, mode, index), unit)}</span>
              <span className="rv-sep">·</span>
              <span className="rv rv-b">{m.format(m.get(b, mode, index), unit)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
