// Canvas drawing helpers shared by the pendulum demos. Light-theme only.

export interface Pt { x: number; y: number }

export class RingBuffer<T> {
  private buf: (T | undefined)[]
  private head = 0
  private count = 0
  constructor(private capacity: number) {
    this.buf = new Array(capacity)
  }
  push(item: T): void {
    this.buf[this.head] = item
    this.head = (this.head + 1) % this.capacity
    if (this.count < this.capacity) this.count++
  }
  clear(): void {
    this.head = 0
    this.count = 0
  }
  get length(): number {
    return this.count
  }
  setCapacity(n: number): void {
    const items: T[] = []
    this.forEach((t) => items.push(t))
    const kept = items.slice(Math.max(0, items.length - n))
    this.capacity = n
    this.buf = new Array(n)
    this.head = 0
    this.count = 0
    for (const t of kept) this.push(t)
  }
  forEach(fn: (item: T, i: number) => void): void {
    const start = (this.head - this.count + 2 * this.capacity) % this.capacity
    for (let i = 0; i < this.count; i++) {
      fn(this.buf[(start + i) % this.capacity] as T, i)
    }
  }
}

const INK = '#171717'

export function drawPivot(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x - 10, y)
  ctx.lineTo(x + 10, y)
  ctx.stroke()
  ctx.fillStyle = INK
  ctx.beginPath()
  ctx.arc(x, y, 3, 0, 2 * Math.PI)
  ctx.fill()
}

export function drawRod(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  color: string = INK, width = 2,
): void {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

export function drawBob(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number, fill: string, stroke: string = INK,
): void {
  ctx.fillStyle = fill
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(x, y, r, 0, 2 * Math.PI)
  ctx.fill()
  ctx.stroke()
}

export function drawTrail(
  ctx: CanvasRenderingContext2D,
  trail: RingBuffer<Pt>,
  color: string, width = 1.5,
): void {
  const n = trail.length
  if (n < 2) return
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  let prev: Pt | null = null
  trail.forEach((p, i) => {
    if (prev) {
      ctx.globalAlpha = 0.05 + (0.8 * i) / n
      ctx.beginPath()
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
    }
    prev = p
  })
  ctx.globalAlpha = 1
}

export function chartColor(el: HTMLElement, i: number): string {
  const raw = getComputedStyle(el).getPropertyValue(`--chart-${i}`).trim()
  return raw ? `hsl(${raw})` : '#404040'
}

export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const c = (sa: number, sb: number) => Math.round(sa + (sb - sa) * t)
  const r = c((pa >> 16) & 255, (pb >> 16) & 255)
  const g = c((pa >> 8) & 255, (pb >> 8) & 255)
  const bl = c(pa & 255, pb & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`
}

export interface Series { color: string; points: Pt[] }
export interface ChartOpts {
  xLabel: string; yLabel: string
  xMin: number; xMax: number; yMin: number; yMax: number
}

// Minimal line chart inside the given rect (CSS px). Follows the dataviz
// skill's guidance: quiet 1px gridlines, labeled axes, no chartjunk.
export function drawLineChart(
  ctx: CanvasRenderingContext2D,
  px: number, py: number, w: number, h: number,
  series: Series[], opts: ChartOpts,
): void {
  const m = { l: 52, r: 10, t: 10, b: 30 }
  const iw = w - m.l - m.r
  const ih = h - m.t - m.b
  const sx = (x: number) => px + m.l + ((x - opts.xMin) / (opts.xMax - opts.xMin)) * iw
  const sy = (y: number) => py + m.t + (1 - (y - opts.yMin) / (opts.yMax - opts.yMin)) * ih

  ctx.save()
  // gridlines + y tick labels (4 divisions)
  ctx.strokeStyle = '#e5e5e5'
  ctx.fillStyle = '#737373'
  ctx.lineWidth = 1
  ctx.font = '11px system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let i = 0; i <= 4; i++) {
    const yv = opts.yMin + ((opts.yMax - opts.yMin) * i) / 4
    const yPix = sy(yv)
    ctx.beginPath()
    ctx.moveTo(px + m.l, yPix)
    ctx.lineTo(px + m.l + iw, yPix)
    ctx.stroke()
    ctx.fillText(yv.toPrecision(3), px + m.l - 6, yPix)
  }
  // x tick labels (4 divisions)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let i = 0; i <= 4; i++) {
    const xv = opts.xMin + ((opts.xMax - opts.xMin) * i) / 4
    ctx.fillText(xv.toFixed(0), sx(xv), py + m.t + ih + 6)
  }
  // axis labels
  ctx.fillText(opts.xLabel, px + m.l + iw / 2, py + h - 14)
  ctx.save()
  ctx.translate(px + 12, py + m.t + ih / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText(opts.yLabel, 0, 0)
  ctx.restore()

  // series (clipped to the plot area; non-finite y-values break the line
  // instead of poisoning the path — spec: never propagate NaN into charts)
  ctx.beginPath()
  ctx.rect(px + m.l, py + m.t, iw, ih)
  ctx.clip()
  for (const s of series) {
    if (s.points.length < 2) continue
    ctx.strokeStyle = s.color
    ctx.lineWidth = 1.5
    ctx.beginPath()
    let started = false
    for (const p of s.points) {
      if (!Number.isFinite(p.y)) {
        started = false
        continue
      }
      if (started) ctx.lineTo(sx(p.x), sy(p.y))
      else {
        ctx.moveTo(sx(p.x), sy(p.y))
        started = true
      }
    }
    ctx.stroke()
  }
  ctx.restore()
}
