import type { ReactNode } from 'react'

export interface LegendItem {
  label: string
  color: string
  kind?: 'line' | 'dash' | 'swatch'
}

export function Legend({ items, extra }: { items: LegendItem[]; extra?: ReactNode }) {
  return (
    <div className="legend-wrap">
      <ul className="legend">
        {items.map((it, i) => (
          <li key={i} className="legend-item">
            <span
              className={`legend-mark legend-${it.kind ?? 'line'}`}
              style={it.kind === 'swatch' ? { background: it.color } : { color: it.color }}
            />
            {it.label}
          </li>
        ))}
      </ul>
      {extra}
    </div>
  )
}
