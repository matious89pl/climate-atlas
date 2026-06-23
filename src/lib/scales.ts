// Minimal scale + tick helpers (no d3 dependency — these are all we need).

export type Num = number | null | undefined

/** Linear mapping from data domain [d0,d1] to pixel range [r0,r1]. */
export function linear(d0: number, d1: number, r0: number, r1: number) {
  const span = d1 - d0 || 1
  const m = (r1 - r0) / span
  return (v: number) => r0 + (v - d0) * m
}

/** Min/max across several series, ignoring nulls. */
export function extent(...series: Num[][]): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const s of series) {
    for (const v of s) {
      if (v == null || Number.isNaN(v)) continue
      if (v < min) min = v
      if (v > max) max = v
    }
  }
  if (min === Infinity) return [0, 1]
  return [min, max]
}

/** "Nice" rounded tick values between min and max. */
export function ticks(min: number, max: number, count = 5): number[] {
  if (min === max) return [min]
  const span = max - min
  const step0 = span / count
  const mag = 10 ** Math.floor(Math.log10(step0))
  const norm = step0 / mag
  let step
  if (norm >= 5) step = 5 * mag
  else if (norm >= 2) step = 2 * mag
  else if (norm >= 1) step = 1 * mag
  else step = mag
  const start = Math.ceil(min / step) * step
  const out: number[] = []
  for (let v = start; v <= max + step * 1e-6; v += step) out.push(Math.round(v * 1e6) / 1e6)
  return out
}

/** Pad a domain a little and optionally anchor it to zero. */
export function niceDomain(
  min: number,
  max: number,
  { padFrac = 0.08, zero = false }: { padFrac?: number; zero?: boolean } = {},
): [number, number] {
  let lo = min
  let hi = max
  if (zero) lo = Math.min(0, lo)
  if (lo === hi) {
    lo -= 1
    hi += 1
  }
  const pad = (hi - lo) * padFrac
  return [zero ? lo : lo - pad, hi + pad]
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
