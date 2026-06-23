// Units, number + date formatting.

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export type TempUnit = 'c' | 'f'

export const cToF = (c: number) => (c * 9) / 5 + 32

export function convTemp(c: number | null | undefined, unit: TempUnit): number | null {
  if (c == null || Number.isNaN(c)) return null
  return unit === 'f' ? cToF(c) : c
}

export function fmtTemp(c: number | null | undefined, unit: TempUnit, digits = 0): string {
  const v = convTemp(c, unit)
  return v == null ? '–' : `${v.toFixed(digits)}°`
}

export function fmt(v: number | null | undefined, digits = 0, suffix = ''): string {
  if (v == null || Number.isNaN(v)) return '–'
  return `${v.toFixed(digits)}${suffix}`
}

/** Pretty integer with thin-space thousands grouping. */
export function fmtInt(v: number | null | undefined, suffix = ''): string {
  if (v == null || Number.isNaN(v)) return '–'
  return `${Math.round(v).toLocaleString('en-US').replace(/,/g, ' ')}${suffix}`
}

/** Calendar is an array of 'MM-DD' strings, 366 entries (leap year). */
export function dayLabel(calendar: string[], i: number): string {
  const cell = calendar[i]
  if (!cell) return ''
  const [m, d] = cell.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

export function monthOfIndex(calendar: string[], i: number): number {
  const cell = calendar[i]
  if (!cell) return 0
  return parseInt(cell.slice(0, 2), 10) - 1
}

/** Index into the 366-day calendar for "today" in the viewer's local timezone. */
export function todayIndex(calendar: string[]): number {
  const now = new Date()
  const key = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const i = calendar.indexOf(key)
  return i < 0 ? 0 : i
}
