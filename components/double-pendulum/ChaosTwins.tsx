"use client"

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { doubleDeriv, type DoubleParams, type DerivFn } from '@/lib/pendulum/physics'
import { stepRK4 } from '@/lib/pendulum/integrators'
import { useSimCanvas } from './useSimCanvas'
import {
  RingBuffer, type Pt, type Series,
  drawPivot, drawRod, drawBob, drawTrail, chartColor, mixHex, drawLineChart,
} from './drawing'
import { DemoShell, LabeledSlider } from './controls'

// Fixed scenario: every pendulum shares these params and differs only in its
// initial θ2, by as little as 1e-7 rad — the point is watching that single
// tiny offset amplify into visible divergence (sensitive dependence on
// initial conditions, i.e. chaos).
const PARAMS: DoubleParams = { m1: 1, m2: 1, r1: 1, r2: 1, g: 9.81 }
const deriv: DerivFn = (s, out) => doubleDeriv(s, PARAMS, out)

const N_MIN = 2
const N_MAX = 50
const N_DEFAULT = 20
const B_START = 2.0 // base angle (rad); pendulum k's IC is [B, B + k*IC_EPS, 0, 0]
const IC_EPS = 1e-7
const TRAIL_CAPACITY = 180 // 3 s at 60 fps
const DIVERGENCE_WINDOW = 40 // rolling x-axis window, seconds
const DIVERGENCE_CAPACITY = 2400 // 40 s at 60 fps
const BOB_RADIUS = 5
const ROD_WIDTH = 1.25
const PENDULUM_ALPHA = 0.9
const ARIA_LABEL = 'Many double pendulums with nearly identical starts diverging over time'

function buildStates(n: number, b: number): Float64Array[] {
  const states: Float64Array[] = []
  for (let k = 0; k < n; k++) states.push(Float64Array.of(b, b + k * IC_EPS, 0, 0))
  return states
}

function buildTrails(n: number): RingBuffer<Pt>[] {
  return Array.from({ length: n }, () => new RingBuffer<Pt>(TRAIL_CAPACITY))
}

// RMS separation between two [θ1, θ2, ω1, ω2] states — divide by the number
// of components (4) under the square root, per spec.
function rmsSeparation(a: Float64Array, b: Float64Array): number {
  let sumSq = 0
  for (let i = 0; i < 4; i++) {
    const diff = a[i] - b[i]
    sumSq += diff * diff
  }
  return Math.sqrt(sumSq / 4)
}

// chartColor() returns an hsl(...) string — fine as a canvas strokeStyle
// directly, but mixHex only understands '#rrggbb'. Resolve to hex once, on
// mount, by drawing a 1x1 swatch and reading the pixel back.
function toHex(color: string): string {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) return '#404040'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

export default function ChaosTwins(): React.JSX.Element {
  const [n, setN] = useState(N_DEFAULT)

  // Base angle shared by every pendulum's θ1 (and the θ2-offset origin).
  // Only Nudge changes it and nothing renders its value, so a ref suffices.
  const bRef = useRef(B_START)

  // One [θ1, θ2, ω1, ω2] per pendulum, plus one shared RK4 scratch (sized for
  // n=4 -> 5*4=20) reused across all of them since stepRK4 fully consumes its
  // scratch before returning — nothing survives between pendulums.
  const statesRef = useRef<Float64Array[]>(buildStates(N_DEFAULT, B_START))
  const scratchRef = useRef(new Float64Array(20))

  // Per-pendulum trail (world meters, bob-2 relative to the shared pivot) and
  // its reused px-space scratch buffer, refilled from the world trail every
  // draw call — same conversion DoublePendulumSim does for its one trail,
  // just repeated per pendulum.
  const trailsRef = useRef<RingBuffer<Pt>[]>(buildTrails(N_DEFAULT))
  const trailsPxRef = useRef<RingBuffer<Pt>[]>(buildTrails(N_DEFAULT))

  // log10(RMS separation between pendulum 0 and pendulum N-1) over time.
  const divergenceRef = useRef(new RingBuffer<Pt>(DIVERGENCE_CAPACITY))
  const seriesPointsRef = useRef<Pt[]>([])
  const simTimeRef = useRef(0)

  // Per-pendulum color cache: mixHex(chart-1, chart-4, k/(N-1)), rebuilt
  // whenever N changes. Seeded with neutral gray until the mount effect below
  // resolves the real endpoint hexes (avoids an undefined color for the very
  // first frame, drawn before that effect runs).
  const colorsRef = useRef<string[]>(new Array(N_DEFAULT).fill('#404040'))
  const endpointHexRef = useRef<[string, string]>(['#404040', '#404040'])
  const divergenceColorRef = useRef('#404040')

  function rebuildColors(nn: number) {
    const [cA, cB] = endpointHexRef.current
    const colors = new Array<string>(nn)
    for (let k = 0; k < nn; k++) colors[k] = mixHex(cA, cB, nn > 1 ? k / (nn - 1) : 0)
    colorsRef.current = colors
  }

  function restart(nn: number, b: number) {
    statesRef.current = buildStates(nn, b)
    trailsRef.current = buildTrails(nn)
    trailsPxRef.current = buildTrails(nn)
    divergenceRef.current.clear()
    simTimeRef.current = 0
    rebuildColors(nn)
  }

  function handleNChange(v: number) {
    const nn = Math.round(v)
    setN(nn)
    restart(nn, bRef.current)
  }

  // Deterministic cycle through base angles 0.15 rad apart, wrapping inside
  // [1.8, 2.6) — a different (but repeatable) chaotic run each press.
  function handleNudge() {
    bRef.current = 1.8 + ((bRef.current - 1.8 + 0.15) % 0.8)
    restart(n, bRef.current)
  }

  function handleReset() {
    restart(n, bRef.current)
  }

  function step(dt: number) {
    const states = statesRef.current
    const scratch = scratchRef.current
    for (let k = 0; k < states.length; k++) stepRK4(states[k], deriv, dt, scratch)
    simTimeRef.current += dt
  }

  function draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.clearRect(0, 0, w, h)
    const bandH = h * 0.55
    const chartH = h - bandH
    const cx = w / 2
    const cy = bandH * 0.5
    const pxPerM = (bandH * 0.45) / 2
    const states = statesRef.current
    const colors = colorsRef.current
    const trails = trailsRef.current
    const trailsPx = trailsPxRef.current
    const nn = states.length

    if (playingRef.current) {
      for (let k = 0; k < nn; k++) {
        const s = states[k]
        const wx = PARAMS.r1 * Math.sin(s[0]) + PARAMS.r2 * Math.sin(s[1])
        const wy = PARAMS.r1 * Math.cos(s[0]) + PARAMS.r2 * Math.cos(s[1])
        trails[k].push({ x: wx, y: wy })
      }
      const d = rmsSeparation(states[0], states[nn - 1])
      divergenceRef.current.push({ x: simTimeRef.current, y: Math.log10(Math.max(d, 1e-12)) })
    }

    // Trails first (behind everything), then the shared pivot fixture, then
    // the live rods/bobs on top.
    for (let k = 0; k < nn; k++) {
      trailsPx[k].clear()
      trails[k].forEach((p) => trailsPx[k].push({ x: cx + p.x * pxPerM, y: cy + p.y * pxPerM }))
      drawTrail(ctx, trailsPx[k], colors[k], 1)
    }

    drawPivot(ctx, cx, cy)

    ctx.globalAlpha = PENDULUM_ALPHA
    for (let k = 0; k < nn; k++) {
      const s = states[k]
      const color = colors[k]
      const x1 = cx + pxPerM * Math.sin(s[0])
      const y1 = cy + pxPerM * Math.cos(s[0])
      const x2 = x1 + pxPerM * Math.sin(s[1])
      const y2 = y1 + pxPerM * Math.cos(s[1])
      drawRod(ctx, cx, cy, x1, y1, color, ROD_WIDTH)
      drawRod(ctx, x1, y1, x2, y2, color, ROD_WIDTH)
      drawBob(ctx, x1, y1, BOB_RADIUS, color, color)
      drawBob(ctx, x2, y2, BOB_RADIUS, color, color)
    }
    ctx.globalAlpha = 1

    const t = simTimeRef.current
    const xMin = Math.max(0, t - DIVERGENCE_WINDOW)
    const xMax = Math.max(DIVERGENCE_WINDOW, t)
    const sp = seriesPointsRef.current
    sp.length = 0
    divergenceRef.current.forEach((p) => sp.push(p))
    const series: Series[] = [{ color: divergenceColorRef.current, points: sp }]
    drawLineChart(ctx, 0, bandH, w, chartH, series, {
      xLabel: 'time (s)',
      yLabel: 'log₁₀ separation',
      xMin, xMax,
      yMin: -8, yMax: 1,
    })
  }

  const { containerRef, canvasRef, playing, setPlaying } = useSimCanvas({ aspect: 0.9, step, draw })

  const playingRef = useRef(playing)
  useEffect(() => {
    playingRef.current = playing
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const hexA = toHex(chartColor(canvas, 1))
    const hexB = toHex(chartColor(canvas, 4))
    endpointHexRef.current = [hexA, hexB]
    divergenceColorRef.current = chartColor(canvas, 1)
    rebuildColors(statesRef.current.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <DemoShell
      playing={playing}
      onPlayToggle={() => setPlaying((p) => !p)}
      onReset={handleReset}
      ariaLabel={ARIA_LABEL}
      canvas={
        <div ref={containerRef} className="w-full">
          <canvas
            ref={canvasRef}
            className="w-full rounded-lg border bg-white"
            role="img"
            aria-label={ARIA_LABEL}
          />
        </div>
      }
      controls={
        <div className="flex items-center gap-2 sm:col-span-2">
          <div className="flex-1">
            <LabeledSlider
              label="N"
              value={n}
              min={N_MIN}
              max={N_MAX}
              step={1}
              onChange={handleNChange}
              format={(v) => v.toFixed(0)}
            />
          </div>
          <Button size="sm" variant="outline" onClick={handleNudge}>
            Nudge
          </Button>
        </div>
      }
    />
  )
}
