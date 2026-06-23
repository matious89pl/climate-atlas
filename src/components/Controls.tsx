import type { ViewMode } from '../lib/climate'
import { CITY_LIST } from '../lib/climate'
import type { TempUnit } from '../lib/format'
import { SegmentedControl } from './SegmentedControl'

interface Props {
  aId: string
  bId: string
  onA: (id: string) => void
  onB: (id: string) => void
  onSwap: () => void
  mode: ViewMode
  onMode: (m: ViewMode) => void
  unit: TempUnit
  onUnit: (u: TempUnit) => void
}

function CitySelect({ value, onChange, slot }: { value: string; onChange: (id: string) => void; slot: 'a' | 'b' }) {
  return (
    <span className={`city-select city-select--${slot}`}>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={`City ${slot.toUpperCase()}`}>
        {CITY_LIST.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <svg className="city-select-caret" viewBox="0 0 10 6" aria-hidden="true">
        <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  )
}

export function Controls({ aId, bId, onA, onB, onSwap, mode, onMode, unit, onUnit }: Props) {
  return (
    <div className="controls">
      <div className="controls-cities">
        <CitySelect value={aId} onChange={onA} slot="a" />
        <button className="swap" onClick={onSwap} aria-label="Swap the two cities" title="Swap cities">
          <svg viewBox="0 0 24 24" aria-hidden="true" width="17" height="17">
            <path d="M7 4L3 8l4 4M3 8h13M17 20l4-4-4-4M21 16H8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <CitySelect value={bId} onChange={onB} slot="b" />
      </div>
      <div className="controls-toggles">
        <SegmentedControl
          ariaLabel="Time resolution"
          value={mode}
          onChange={onMode}
          options={[
            { value: 'daily', label: 'Day by day' },
            { value: 'monthly', label: 'Month by month' },
          ]}
        />
        <SegmentedControl
          ariaLabel="Temperature units"
          value={unit}
          onChange={onUnit}
          options={[
            { value: 'c', label: '°C' },
            { value: 'f', label: '°F' },
          ]}
        />
      </div>
    </div>
  )
}
