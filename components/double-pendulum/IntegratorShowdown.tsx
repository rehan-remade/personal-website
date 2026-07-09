"use client"

import { useEffect, useRef, useState } from 'react'
import { doubleDeriv, doubleEnergy, energyScale, type DoubleParams, type DerivFn } from '@/lib/pendulum/physics'
import { stepEuler, stepSymplecticEuler, stepRK4 } from '@/lib/pendulum/integrators'
import { useSimCanvas } from './useSimCanvas'
import { RingBuffer, type Pt, type Series, drawPivot, drawRod, drawBob, chartColor, drawLineChart } from './drawing'
import { DemoShell, LabeledSlider } from './controls'

// Fixed scenario: all three integrators race the same IC under the same
// params, so only the integration scheme differs. E0 is exactly 0 for this
// IC (release from rest with both rods horizontal — see physics.ts), but we
// derive it instead of hardcoding so the y-domain math stays legible.
const IC = Float64Array.of(Math.PI / 2, Math.PI / 2, 0, 0)
const PARAMS: DoubleParams = { m1: 1, m2: 1, r1: 1, r2: 1, g: 9.81 }
const E0 = doubleEnergy(IC, PARAMS)
const SCALE = energyScale(PARAMS)
const Y_MIN = E0 - 0.8 * SCALE
const Y_MAX = E0 + 1.5 * SCALE
const BOB_RADIUS = 7
const HISTORY_CAPACITY = 3600 // 60 s at 60 fps
const ARIA_LABEL = 'Three integrators racing on identical double pendulums with a live energy chart'
const LABELS = ['explicit Euler', 'symplectic Euler', 'RK4'] as const

const deriv: DerivFn = (s, out) => doubleDeriv(s, PARAMS, out)

type StepFn = (s: Float64Array, deriv: DerivFn, dt: number, scratch: Float64Array) => void
// Index 0/1/2 <-> explicit Euler / symplectic Euler / RK4 throughout this file.
const STEPPERS: StepFn[] = [stepEuler, stepSymplecticEuler, stepRK4]

interface EnergySample { t: number; e: [number, number, number] }

// Divergence test applied after every step: a blown-up state either goes
// non-finite outright, or (for the unstable explicit-Euler case) its angular
// velocity runs away while θ is still a large-but-finite number. Either way
// the trajectory is physically meaningless from here on.
function isDiverged(s: Float64Array): boolean {
  for (let i = 0; i < s.length; i++) if (!Number.isFinite(s[i])) return true
  return Math.abs(s[2]) > 1e6 || Math.abs(s[3]) > 1e6
}

export default function IntegratorShowdown(): React.JSX.Element {
  // Three independent [θ1, θ2, ω1, ω2] states, one per integrator, mutated
  // in place by their respective stepper. Scratch is sized for RK4 (5n, n=4)
  // and reused as-is for the cheaper integrators, which only touch the first n.
  const statesRef = useRef<[Float64Array, Float64Array, Float64Array]>([
    new Float64Array(IC), new Float64Array(IC), new Float64Array(IC),
  ])
  const scratchesRef = useRef<[Float64Array, Float64Array, Float64Array]>([
    new Float64Array(20), new Float64Array(20), new Float64Array(20),
  ])
  const frozenRef = useRef<[boolean, boolean, boolean]>([false, false, false])
  const simTimeRef = useRef(0)

  // One energy sample per rendered frame while playing; capacity matches a
  // rolling 60 s window at 60 fps. Frozen integrators contribute NaN energy
  // (never doubleEnergy of a non-finite state) so drawLineChart's line-break
  // handling stops their series cleanly instead of drawing garbage.
  const historyRef = useRef(new RingBuffer<EnergySample>(HISTORY_CAPACITY))
  // Reused per-series point buffers, refilled from history every draw call
  // (avoids allocating three fresh arrays at 60fps).
  const seriesPointsRef = useRef<[Pt[], Pt[], Pt[]]>([[], [], []])

  const [dt, setDt] = useState(1 / 60)

  // Resolved once on mount (matches chart-line colors and drives the HTML
  // legend row below the canvas via inline style).
  const [colors, setColors] = useState<[string, string, string]>(['#404040', '#404040', '#404040'])

  function resetAll() {
    const states = statesRef.current
    for (let i = 0; i < 3; i++) states[i].set(IC)
    frozenRef.current = [false, false, false]
    historyRef.current.clear()
    simTimeRef.current = 0
  }

  function handleReset() {
    resetAll()
  }

  function handleDtChange(v: number) {
    setDt(v)
    resetAll() // comparing integrators across a dt change would be meaningless
  }

  function step(dt: number) {
    const states = statesRef.current
    const scratches = scratchesRef.current
    const frozen = frozenRef.current
    for (let i = 0; i < 3; i++) {
      if (frozen[i]) continue
      STEPPERS[i](states[i], deriv, dt, scratches[i])
      if (isDiverged(states[i])) frozen[i] = true
    }
    simTimeRef.current += dt
  }

  function draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.clearRect(0, 0, w, h)
    const bandH = h * 0.55
    const panelW = w / 3
    // Full r1+r2 = 2 m reach must fit inside half the band (pivot is
    // vertically centered), so pxPerM leaves headroom: 2 * (bandH*0.45/2) = 0.45*bandH < 0.5*bandH.
    const pxPerM = (bandH * 0.45) / 2
    const cy = bandH / 2
    const states = statesRef.current
    const frozen = frozenRef.current

    if (playingRef.current) {
      const e: [number, number, number] = [
        frozen[0] ? NaN : doubleEnergy(states[0], PARAMS),
        frozen[1] ? NaN : doubleEnergy(states[1], PARAMS),
        frozen[2] ? NaN : doubleEnergy(states[2], PARAMS),
      ]
      historyRef.current.push({ t: simTimeRef.current, e })
    }

    for (let i = 0; i < 3; i++) {
      const panelX0 = panelW * i
      const cx = panelX0 + panelW / 2
      // Clip each mini-viewport to its own third: an exploding integrator's
      // rod can swing far enough to reach a neighboring panel otherwise.
      ctx.save()
      ctx.beginPath()
      ctx.rect(panelX0, 0, panelW, bandH)
      ctx.clip()

      const th1 = states[i][0]
      const th2 = states[i][1]
      const x1 = cx + pxPerM * Math.sin(th1)
      const y1 = cy + pxPerM * Math.cos(th1)
      const x2 = x1 + pxPerM * Math.sin(th2)
      const y2 = y1 + pxPerM * Math.cos(th2)
      // Canvas path methods no-op on non-finite coordinates (WHATWG spec),
      // so a fully-diverged state simply fails to draw here — no guard needed.
      drawPivot(ctx, cx, cy)
      drawRod(ctx, cx, cy, x1, y1)
      drawBob(ctx, x1, y1, BOB_RADIUS, colors[i])
      drawRod(ctx, x1, y1, x2, y2)
      drawBob(ctx, x2, y2, BOB_RADIUS, colors[i])

      if (frozen[i]) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
        ctx.fillRect(panelX0, 0, panelW, bandH)
        ctx.fillStyle = '#171717'
        ctx.font = '12px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('energy: ∞', cx, cy - 8)
        ctx.fillText('— integration failed', cx, cy + 8)
      }
      ctx.restore()
    }

    const t = simTimeRef.current
    const xMin = Math.max(0, t - 60)
    const xMax = Math.max(60, t)
    const sp = seriesPointsRef.current
    sp[0].length = 0
    sp[1].length = 0
    sp[2].length = 0
    historyRef.current.forEach((sample) => {
      sp[0].push({ x: sample.t, y: sample.e[0] })
      sp[1].push({ x: sample.t, y: sample.e[1] })
      sp[2].push({ x: sample.t, y: sample.e[2] })
    })
    const series: Series[] = [
      { color: colors[0], points: sp[0] },
      { color: colors[1], points: sp[1] },
      { color: colors[2], points: sp[2] },
    ]
    drawLineChart(ctx, 0, bandH, w, h - bandH, series, {
      xLabel: 'time (s)',
      yLabel: 'total energy (J)',
      xMin, xMax,
      yMin: Y_MIN, yMax: Y_MAX,
    })
  }

  const { containerRef, canvasRef, playing, setPlaying } = useSimCanvas({ aspect: 0.85, physicsDt: dt, step, draw })

  const playingRef = useRef(playing)
  useEffect(() => {
    playingRef.current = playing
  })

  useEffect(() => {
    if (canvasRef.current) {
      setColors([chartColor(canvasRef.current, 1), chartColor(canvasRef.current, 2), chartColor(canvasRef.current, 3)])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <DemoShell
      playing={playing}
      onPlayToggle={() => setPlaying((p) => !p)}
      onReset={handleReset}
      ariaLabel={ARIA_LABEL}
      canvas={
        <>
          <div ref={containerRef} className="w-full">
            <canvas
              ref={canvasRef}
              className="w-full rounded-lg border bg-white"
              role="img"
              aria-label={ARIA_LABEL}
            />
          </div>
          <div className="mt-2 grid grid-cols-3 text-center text-sm">
            {LABELS.map((label, i) => (
              <span key={label} style={{ color: colors[i] }}>
                {label}
              </span>
            ))}
          </div>
        </>
      }
      controls={
        <div className="sm:col-span-2">
          <LabeledSlider
            label="\Delta t"
            value={dt}
            min={1 / 240}
            max={1 / 30}
            step={1 / 240}
            onChange={handleDtChange}
            format={(v) => `${(v * 1000).toFixed(1)} ms`}
          />
        </div>
      }
    />
  )
}
