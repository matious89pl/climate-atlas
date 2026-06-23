// SVG path builders. All handle null gaps by breaking the path into runs.

type Num = number | null | undefined

/** Catmull-Rom -> cubic Bézier for a smooth curve through points. */
function smoothSegment(pts: Array<[number, number]>): string {
  if (pts.length < 2) return ''
  if (pts.length === 2) return `M${pts[0][0]},${pts[0][1]} L${pts[1][0]},${pts[1][1]}`
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`
  }
  return d
}

function straightSegment(pts: Array<[number, number]>): string {
  if (!pts.length) return ''
  return 'M' + pts.map((p) => `${p[0]},${p[1]}`).join(' L')
}

/** Build a line path from values, splitting at nulls. */
export function linePath(
  values: Num[],
  x: (i: number) => number,
  y: (v: number) => number,
  smooth = false,
): string {
  let run: Array<[number, number]> = []
  const out: string[] = []
  const flush = () => {
    if (run.length) out.push(smooth ? smoothSegment(run) : straightSegment(run))
    run = []
  }
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (v == null || Number.isNaN(v)) flush()
    else run.push([x(i), y(v)])
  }
  flush()
  return out.join(' ')
}

/** Filled area between a baseline (y of 0 or domain floor) and the series. */
export function areaPath(
  values: Num[],
  x: (i: number) => number,
  y: (v: number) => number,
  baseY: number,
  smooth = false,
): string {
  let run: Array<{ i: number; v: number }> = []
  const out: string[] = []
  const flush = () => {
    if (run.length < 1) {
      run = []
      return
    }
    const top = run.map((p) => [x(p.i), y(p.v)] as [number, number])
    const line = smooth ? smoothSegment(top) : straightSegment(top)
    const first = top[0]
    const last = top[top.length - 1]
    out.push(`${line} L${last[0]},${baseY} L${first[0]},${baseY} Z`)
    run = []
  }
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (v == null || Number.isNaN(v)) flush()
    else run.push({ i, v })
  }
  flush()
  return out.join(' ')
}

/** Filled band between a low and high series (e.g. daily min..max). */
export function bandPath(
  lo: Num[],
  hi: Num[],
  x: (i: number) => number,
  y: (v: number) => number,
  smooth = false,
): string {
  let run: Array<{ i: number; lo: number; hi: number }> = []
  const out: string[] = []
  const flush = () => {
    if (run.length < 1) {
      run = []
      return
    }
    const topPts = run.map((p) => [x(p.i), y(p.hi)] as [number, number])
    const botPts = run.map((p) => [x(p.i), y(p.lo)] as [number, number]).reverse()
    const topLine = smooth ? smoothSegment(topPts) : straightSegment(topPts)
    // continue into the reversed bottom line
    const botLine = (smooth ? smoothSegment(botPts) : straightSegment(botPts)).replace(/^M/, 'L')
    out.push(`${topLine} ${botLine} Z`)
    run = []
  }
  const n = Math.min(lo.length, hi.length)
  for (let i = 0; i < n; i++) {
    const l = lo[i]
    const h = hi[i]
    if (l == null || h == null || Number.isNaN(l) || Number.isNaN(h)) flush()
    else run.push({ i, lo: l, hi: h })
  }
  flush()
  return out.join(' ')
}
