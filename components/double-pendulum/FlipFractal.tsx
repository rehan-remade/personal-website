"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import KatexSpan from '@/components/KatexSpan'
import { doubleDeriv, flipForbidden, type DerivFn } from '@/lib/pendulum/physics'
import { stepRK4 } from '@/lib/pendulum/integrators'
import {
  FLIP_NEVER, FLIP_FORBIDDEN, FRACTAL_PARAMS, FRACTAL_FLIP_OPTS,
  colToTheta1, rowToTheta2,
} from '@/lib/pendulum/flip'
import { useSimCanvas } from './useSimCanvas'
import { drawPivot, drawRod, drawBob, chartColor, mixHex } from './drawing'

// Worker protocol (mirrors flipWorker.ts). Rows stream back as transferred
// Float32Arrays; `done` is informational (progress hides itself at 100%).
interface RunMsg { type: 'run'; gen: number; size: number; rowStart: number; stride: number }
interface RowMsg { type: 'row'; gen: number; row: number; size: number; data: Float32Array }
interface DoneMsg { type: 'done'; gen: number }

type Quality = 'fast' | 'fine'
interface Selected { th1: number; th2: number }
interface Hover { px: number; py: number; line1: string; line2: string; flip: boolean }

const ARIA_LABEL = 'Fractal map of initial angles colored by time until the second bob flips'
const INK = '#171717'
const NEVER_COLOR = '#d4d4d4'
const FORBIDDEN_COLOR = '#f5f5f4'
const BOUNDARY_SAMPLES = 200

// Fixed scenario for the companion sim — identical to the compute grid's
// params (see flip.ts), released from rest at the clicked pixel's angles.
const fractalDeriv: DerivFn = (s, out) => doubleDeriv(s, FRACTAL_PARAMS, out)

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

// Sequential log-scale ramp for flip time (dark indigo = flips fast → teal →
// yellow = slow), plus two out-of-ramp neutrals for the sentinel classes so
// "never" and "impossible" never read as data. Breakpoint at u = 0.5.
const LN_LO = Math.log(0.1)
const LN_HI = Math.log(FRACTAL_FLIP_OPTS.tMax)
function flipColor(t: number): string {
  if (t === FLIP_NEVER) return NEVER_COLOR
  if (t === FLIP_FORBIDDEN) return FORBIDDEN_COLOR
  const u = clamp01((Math.log(t) - LN_LO) / (LN_HI - LN_LO))
  return u <= 0.5
    ? mixHex('#312e81', '#0d9488', u / 0.5)
    : mixHex('#0d9488', '#fde047', (u - 0.5) / 0.5)
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Degrees, rounded, with a proper Unicode minus sign.
function degStr(rad: number): string {
  return `${Math.round((rad * 180) / Math.PI)}`.replace('-', '−')
}

// Analytic no-flip boundary 2cosθ1 + cosθ2 = 1 → θ2 = ±arccos(1 − 2cosθ1),
// real only for θ1 ∈ [−π/2, π/2]. Same θ→pixel mapping as the grid (col→θ1
// left→right over [−π,π]; row→θ2 top→bottom over [+π,−π]).
function drawBoundary(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.5
  ctx.lineJoin = 'round'
  for (const sign of [1, -1]) {
    ctx.beginPath()
    for (let i = 0; i <= BOUNDARY_SAMPLES; i++) {
      const th1 = -Math.PI / 2 + (i / BOUNDARY_SAMPLES) * Math.PI
      const arg = Math.max(-1, Math.min(1, 1 - 2 * Math.cos(th1)))
      const th2 = sign * Math.acos(arg)
      const x = ((th1 + Math.PI) / (2 * Math.PI)) * w
      const y = ((Math.PI - th2) / (2 * Math.PI)) * h
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

// Crosshair marker (white halo under dark strokes so it reads on any color).
function drawCrosshair(ctx: CanvasRenderingContext2D, sel: Selected, w: number, h: number): void {
  const x = ((sel.th1 + Math.PI) / (2 * Math.PI)) * w
  const y = ((Math.PI - sel.th2) / (2 * Math.PI)) * h
  const r = 8
  const gap = 3
  const arms: [number, number, number, number][] = [
    [x - r, y, x - gap, y], [x + gap, y, x + r, y],
    [x, y - r, x, y - gap], [x, y + gap, x, y + r],
  ]
  ctx.lineCap = 'round'
  for (const [style, width] of [['rgba(255,255,255,0.9)', 3.5], [INK, 1.5]] as const) {
    ctx.strokeStyle = style
    ctx.lineWidth = width
    ctx.beginPath()
    for (const [x0, y0, x1, y1] of arms) {
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
    }
    ctx.stroke()
  }
}

export default function FlipFractal(): React.JSX.Element {
  const [quality, setQuality] = useState<Quality>('fast')
  const [rowsDone, setRowsDone] = useState(0)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<Selected | null>(null)
  const [hover, setHover] = useState<Hover | null>(null)

  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)

  // Offscreen size×size heatmap buffer + a per-row value store for hover
  // readouts, both replaced whenever quality (and therefore size) changes.
  const bufferRef = useRef<HTMLCanvasElement | null>(null)
  const valuesRef = useRef<(Float32Array | undefined)[]>([])
  const sizeRef = useRef(120)

  // Monotonic generation counter: each pool run gets a fresh gen so a stale
  // pool's still-in-flight message (compared against the LIVE gen) is dropped
  // instead of painting onto the current buffer or bumping rowsDone.
  const genRef = useRef(0)

  // Refs read by the stable repaint() (which must not close over state).
  const qualityRef = useRef<Quality>('fast')
  const errorRef = useRef(false)
  const selectedRef = useRef<Selected | null>(null)
  const mapSizeRef = useRef({ cssW: 0, cssH: 0 })

  const gridSize = quality === 'fine' ? 360 : 120

  // Redraw the visible canvas from the buffer, then the analytic boundary,
  // then the selection crosshair. Stable (reads only refs) so the resize and
  // per-row paths can call it without re-subscribing.
  const repaint = useCallback(() => {
    const canvas = mapCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { cssW, cssH } = mapSizeRef.current
    if (cssW === 0) return
    ctx.clearRect(0, 0, cssW, cssH)
    const buffer = bufferRef.current
    if (buffer && !errorRef.current) {
      ctx.imageSmoothingEnabled = qualityRef.current === 'fine'
      ctx.drawImage(buffer, 0, 0, cssW, cssH)
    }
    drawBoundary(ctx, cssW, cssH)
    const sel = selectedRef.current
    if (sel) drawCrosshair(ctx, sel, cssW, cssH)
  }, [])

  // Size the visible canvas to its container (square) at device resolution,
  // redrawing on every resize. Not useSimCanvas — the map has no animation.
  useEffect(() => {
    const canvas = mapCanvasRef.current
    const container = mapContainerRef.current
    if (!canvas || !container) return
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const cssW = container.clientWidth
      const cssH = cssW
      canvas.width = Math.round(cssW * dpr)
      canvas.height = Math.round(cssH * dpr)
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      mapSizeRef.current = { cssW, cssH }
      repaint()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    resize()
    return () => ro.disconnect()
  }, [repaint])

  // Worker pool, rebuilt on every quality change. Everything worker-related
  // lives here (SSR-safe: Worker/navigator only touched inside the effect;
  // StrictMode-safe: the cleanup terminates this exact pool).
  useEffect(() => {
    const size = quality === 'fine' ? 360 : 120
    sizeRef.current = size
    qualityRef.current = quality

    const buffer = document.createElement('canvas')
    buffer.width = size
    buffer.height = size
    const bctx = buffer.getContext('2d')
    bufferRef.current = buffer
    valuesRef.current = new Array(size)
    setRowsDone(0)
    setError(false)
    repaint()

    const myGen = ++genRef.current

    // Coalesce the per-row display repaints to one per frame.
    let rafId = 0
    let pending = false
    const schedule = () => {
      if (pending) return
      pending = true
      rafId = requestAnimationFrame(() => {
        pending = false
        repaint()
      })
    }

    const workers: Worker[] = []
    let rows = 0
    try {
      const P = Math.min(4, Math.max(1, (navigator.hardwareConcurrency || 4) - 1))
      for (let i = 0; i < P; i++) {
        const worker = new Worker(new URL('./flipWorker.ts', import.meta.url))
        worker.onmessage = (e: MessageEvent<RowMsg | DoneMsg>) => {
          const msg = e.data
          if (msg.gen !== genRef.current) return // stale pool — drop it
          if (msg.type !== 'row' || !bctx) return
          valuesRef.current[msg.row] = msg.data
          const img = new ImageData(size, 1)
          for (let col = 0; col < size; col++) {
            const [r, g, b] = hexToRgb(flipColor(msg.data[col]))
            const o = col * 4
            img.data[o] = r
            img.data[o + 1] = g
            img.data[o + 2] = b
            img.data[o + 3] = 255
          }
          bctx.putImageData(img, 0, msg.row)
          rows++
          setRowsDone(rows)
          schedule()
        }
        worker.postMessage({ type: 'run', gen: myGen, size, rowStart: i, stride: P } satisfies RunMsg)
        workers.push(worker)
      }
    } catch {
      workers.forEach((w) => w.terminate())
      setError(true)
    }

    return () => {
      cancelAnimationFrame(rafId)
      workers.forEach((w) => w.terminate())
    }
  }, [quality, repaint])

  // Mirror state into refs and repaint on change (repaint is ref-only).
  useEffect(() => {
    selectedRef.current = selected
    repaint()
  }, [selected, repaint])
  useEffect(() => {
    errorRef.current = error
    repaint()
  }, [error, repaint])

  // Pixel → grid cell, using the exact same mapping the worker computed with.
  function cellFromEvent(e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) {
    const canvas = mapCanvasRef.current
    const { cssW, cssH } = mapSizeRef.current
    if (!canvas || cssW === 0) return null
    const rect = canvas.getBoundingClientRect()
    const size = sizeRef.current
    const col = Math.max(0, Math.min(size - 1, Math.floor(((e.clientX - rect.left) / cssW) * size)))
    const row = Math.max(0, Math.min(size - 1, Math.floor(((e.clientY - rect.top) / cssH) * size)))
    return { col, row, size, th1: colToTheta1(col, size), th2: rowToTheta2(row, size) }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === 'touch') return // no hover on touch — tap selects instead
    const cell = cellFromEvent(e)
    if (!cell) return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const v = valuesRef.current[cell.row]?.[cell.col]
    let line2: string
    if (v === undefined) {
      if (flipForbidden(cell.th1, cell.th2)) line2 = 'energetically impossible'
      else line2 = error ? 'computation unavailable' : 'computing…'
    } else if (v === FLIP_FORBIDDEN) line2 = 'energetically impossible'
    else if (v === FLIP_NEVER) line2 = `never flipped (${FRACTAL_FLIP_OPTS.tMax} s budget)`
    else line2 = `flips after ${v.toFixed(1)} s`
    setHover({
      px,
      py,
      line1: `θ₁ = ${degStr(cell.th1)}°, θ₂ = ${degStr(cell.th2)}°`,
      line2,
      flip: px > mapSizeRef.current.cssW * 0.6,
    })
  }

  function handlePointerLeave() {
    setHover(null)
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const cell = cellFromEvent(e)
    if (!cell) return
    setSelected({ th1: cell.th1, th2: cell.th2 })
  }

  const computing = !error && rowsDone < gridSize

  return (
    <div
      className="not-prose rounded-xl border bg-card p-4 shadow-sm"
      role="group"
      aria-label={ARIA_LABEL}
    >
      <div className="mb-3 flex items-center gap-2">
        <Button
          size="sm"
          variant={quality === 'fast' ? 'default' : 'outline'}
          aria-pressed={quality === 'fast'}
          onClick={() => setQuality('fast')}
        >
          Fast 120²
        </Button>
        <Button
          size="sm"
          variant={quality === 'fine' ? 'default' : 'outline'}
          aria-pressed={quality === 'fine'}
          onClick={() => setQuality('fine')}
        >
          Fine 360²
        </Button>
      </div>

      {error && (
        <p className="mb-2 text-sm text-muted-foreground">
          Your browser couldn&rsquo;t run the computation — here&rsquo;s the theoretical no-flip region.
        </p>
      )}

      <div className="flex gap-1">
        <div className="relative w-6 shrink-0">
          <span
            className="absolute left-1/2 top-1/2 whitespace-nowrap text-sm text-muted-foreground"
            style={{ transform: 'translate(-50%, -50%) rotate(-90deg)' }}
          >
            <KatexSpan text="\theta_2 \uparrow" inline />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div ref={mapContainerRef} className="relative w-full">
            <canvas
              ref={mapCanvasRef}
              className="w-full touch-none rounded-lg border bg-white"
              role="img"
              aria-label={ARIA_LABEL}
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              onClick={handleClick}
            />
            {hover && (
              <div
                className="pointer-events-none absolute z-10 rounded border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm"
                style={{
                  left: hover.px,
                  top: hover.py,
                  transform: `translate(${hover.flip ? 'calc(-100% - 12px)' : '12px'}, -50%)`,
                }}
              >
                <div>{hover.line1}</div>
                <div className="text-muted-foreground">{hover.line2}</div>
              </div>
            )}
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted" style={{ visibility: computing ? 'visible' : 'hidden' }}>
            <div
              className="h-1 rounded-full bg-primary transition-[width] duration-150"
              style={{ width: `${(rowsDone / gridSize) * 100}%` }}
            />
          </div>
          <div className="mt-1 text-center text-sm text-muted-foreground">
            <KatexSpan text="\theta_1 \rightarrow" inline />
          </div>
        </div>
      </div>

      {selected && (
        <div className="mt-4 border-t pt-4">
          <CompanionSim key={`${selected.th1},${selected.th2}`} th1={selected.th1} th2={selected.th2} />
        </div>
      )}
    </div>
  )
}

// Small released-from-rest sim for the clicked initial condition. Keyed on the
// angles by the parent, so a new selection remounts it fresh; Reset re-seeds
// the same pixel. Own controls (not DemoShell — that would nest a second card).
function CompanionSim({ th1, th2 }: { th1: number; th2: number }): React.JSX.Element {
  const stateRef = useRef(Float64Array.of(th1, th2, 0, 0))
  const scratchRef = useRef(new Float64Array(20))
  const bob1ColorRef = useRef('#404040')
  const bob2ColorRef = useRef('#404040')

  function step(dt: number) {
    stepRK4(stateRef.current, fractalDeriv, dt, scratchRef.current)
  }

  function draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.clearRect(0, 0, w, h)
    const cx = w / 2
    const cy = h / 2
    const pxPerM = (h * 0.45) / 2
    const s = stateRef.current
    const x1 = cx + pxPerM * Math.sin(s[0])
    const y1 = cy + pxPerM * Math.cos(s[0])
    const x2 = x1 + pxPerM * Math.sin(s[1])
    const y2 = y1 + pxPerM * Math.cos(s[1])
    drawPivot(ctx, cx, cy)
    drawRod(ctx, cx, cy, x1, y1)
    drawBob(ctx, x1, y1, 7, bob1ColorRef.current)
    drawRod(ctx, x1, y1, x2, y2)
    drawBob(ctx, x2, y2, 7, bob2ColorRef.current)
  }

  const { containerRef, canvasRef, playing, setPlaying } = useSimCanvas({
    aspect: 0.6,
    physicsDt: 1 / 240,
    step,
    draw,
  })

  useEffect(() => {
    if (canvasRef.current) {
      bob1ColorRef.current = chartColor(canvasRef.current, 2)
      bob2ColorRef.current = chartColor(canvasRef.current, 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleReset() {
    stateRef.current.set([th1, th2, 0, 0])
  }

  const caption = `released from θ₁ = ${degStr(th1)}°, θ₂ = ${degStr(th2)}°`

  return (
    <div>
      <div ref={containerRef} className="relative w-full">
        <canvas ref={canvasRef} className="w-full rounded-lg border bg-white" role="img" aria-label={caption} />
        <div className="absolute right-2 top-2 flex gap-1">
          <Button variant="outline" size="icon" aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" aria-label="Reset to this pixel" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="mt-2 text-center text-sm text-muted-foreground">{caption}</p>
    </div>
  )
}
