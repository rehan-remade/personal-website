"use client"

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { doubleDeriv, type DoubleParams } from '@/lib/pendulum/physics'
import { stepRK4 } from '@/lib/pendulum/integrators'
import { useSimCanvas } from './useSimCanvas'
import { RingBuffer, type Pt, drawPivot, drawRod, drawBob, drawTrail, chartColor } from './drawing'
import { DemoShell, LabeledSlider } from './controls'

const THETA0 = Math.PI / 2
const ARIA_LABEL = 'Interactive double pendulum simulation'

export default function DoublePendulumSim(): React.JSX.Element {
  // Physics state [θ1, θ2, ω1, ω2], mutated in place by stepRK4. Angles are
  // never wrapped — the chaotic trajectory can wind through many turns.
  const stateRef = useRef(Float64Array.of(THETA0, THETA0, 0, 0))
  const scratchRef = useRef(new Float64Array(20)) // n=4 -> 5*n scratch for RK4
  const paramsRef = useRef<DoubleParams>({ m1: 1, m2: 1, r1: 1, r2: 1, g: 9.81 })

  // Trail of bob-2 positions stored in WORLD METERS (relative to the pivot,
  // y-down), converted to px at draw time. This means slider-driven changes
  // to r1/r2 (which change pxPerM) never corrupt already-recorded history.
  const [trailSeconds, setTrailSeconds] = useState(6)
  const trailRef = useRef(new RingBuffer<Pt>(trailSeconds * 60))
  // Reused scratch buffer for the px-converted trail, refilled every draw
  // call so we don't allocate a new RingBuffer every frame.
  const trailPxRef = useRef(new RingBuffer<Pt>(trailSeconds * 60))
  const [trailOn, setTrailOn] = useState(true)
  const trailOnRef = useRef(trailOn)
  useEffect(() => {
    trailOnRef.current = trailOn
  })

  // Resolved once on mount (getComputedStyle is unavailable during SSR, and
  // recomputing it every frame would be wasteful with a trail this large).
  // Bob 2's fill reuses the trail's color (chart-1) since the trail traces
  // its path; bob 1 gets a second chart color (chart-2) for distinction —
  // the spec only pins down the trail color explicitly.
  const trailColorRef = useRef('#404040')
  const bob1ColorRef = useRef('#404040')

  // Drag state: which bob (1 or 2) is currently being dragged, if any.
  const draggingRef = useRef(false)
  const dragTargetRef = useRef<1 | 2 | null>(null)

  // Latest canvas CSS size, captured during draw() for pointer hit-testing.
  const sizeRef = useRef({ w: 0, h: 0 })

  const [m1, setM1] = useState(1)
  const [m2, setM2] = useState(1)
  const [r1, setR1] = useState(1)
  const [r2, setR2] = useState(1)
  const [g, setG] = useState(9.81)

  function handleM1Change(v: number) {
    setM1(v)
    paramsRef.current.m1 = v
  }
  function handleM2Change(v: number) {
    setM2(v)
    paramsRef.current.m2 = v
  }
  function handleR1Change(v: number) {
    setR1(v)
    paramsRef.current.r1 = v
  }
  function handleR2Change(v: number) {
    setR2(v)
    paramsRef.current.r2 = v
  }
  function handleGChange(v: number) {
    setG(v)
    paramsRef.current.g = v
  }
  function handleTrailSecondsChange(v: number) {
    setTrailSeconds(v)
    const cap = v * 60
    trailRef.current.setCapacity(cap)
    trailPxRef.current.setCapacity(cap)
  }

  function handleReset() {
    stateRef.current[0] = THETA0
    stateRef.current[1] = THETA0
    stateRef.current[2] = 0
    stateRef.current[3] = 0
    trailRef.current.clear()
  }

  const deriv = (s: Float64Array, out: Float64Array) => doubleDeriv(s, paramsRef.current, out)

  function step(dt: number) {
    if (draggingRef.current) return // integration paused while the user drags a bob
    stepRK4(stateRef.current, deriv, dt, scratchRef.current)
  }

  // pxPerM is dynamic: chaotic motion flips overhead constantly, so the full
  // circle of radius r1+r2 must always fit inside the panel.
  function pxPerM(h: number): number {
    return (h * 0.44) / (paramsRef.current.r1 + paramsRef.current.r2)
  }

  function bobPositions() {
    const { w, h } = sizeRef.current
    const cx = w / 2
    const cy = h / 2
    const { r1: rr1, r2: rr2 } = paramsRef.current
    const k = pxPerM(h)
    const th1 = stateRef.current[0]
    const th2 = stateRef.current[1]
    const x1 = cx + rr1 * k * Math.sin(th1)
    const y1 = cy + rr1 * k * Math.cos(th1)
    const x2 = x1 + rr2 * k * Math.sin(th2)
    const y2 = y1 + rr2 * k * Math.cos(th2)
    return { cx, cy, x1, y1, x2, y2 }
  }

  function draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    sizeRef.current = { w, h }
    ctx.clearRect(0, 0, w, h)
    const cx = w / 2
    const cy = h / 2
    const { m1: mm1, m2: mm2, r1: rr1, r2: rr2 } = paramsRef.current
    const k = pxPerM(h)
    const th1 = stateRef.current[0]
    const th2 = stateRef.current[1]
    const x1 = cx + rr1 * k * Math.sin(th1)
    const y1 = cy + rr1 * k * Math.cos(th1)
    const x2 = x1 + rr2 * k * Math.sin(th2)
    const y2 = y1 + rr2 * k * Math.cos(th2)

    // One trail point per rendered frame while playing and not dragging.
    // Recorded in world meters (bob 2 relative to the pivot, y-down) so a
    // later r1/r2 change doesn't distort already-recorded history.
    if (playingRef.current && !draggingRef.current) {
      const wx = rr1 * Math.sin(th1) + rr2 * Math.sin(th2)
      const wy = rr1 * Math.cos(th1) + rr2 * Math.cos(th2)
      trailRef.current.push({ x: wx, y: wy })
    }

    if (trailOnRef.current) {
      trailPxRef.current.clear()
      trailRef.current.forEach((p) => trailPxRef.current.push({ x: cx + p.x * k, y: cy + p.y * k }))
      drawTrail(ctx, trailPxRef.current, trailColorRef.current)
    }

    drawPivot(ctx, cx, cy)
    drawRod(ctx, cx, cy, x1, y1)
    drawBob(ctx, x1, y1, 10 * Math.cbrt(mm1), bob1ColorRef.current)
    drawRod(ctx, x1, y1, x2, y2)
    drawBob(ctx, x2, y2, 10 * Math.cbrt(mm2), trailColorRef.current)
  }

  const { containerRef, canvasRef, playing, setPlaying } = useSimCanvas({ aspect: 0.75, step, draw })

  const playingRef = useRef(playing)
  useEffect(() => {
    playingRef.current = playing
  })

  useEffect(() => {
    if (canvasRef.current) {
      trailColorRef.current = chartColor(canvasRef.current, 1)
      bob1ColorRef.current = chartColor(canvasRef.current, 2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const { x, y } = pointerPos(e)
    const { x1, y1, x2, y2 } = bobPositions()
    // Hit-test bob 2 first: it overlaps bob 1 less often than the reverse.
    let target: 1 | 2 | null = null
    if (Math.hypot(x - x2, y - y2) <= 24) target = 2
    else if (Math.hypot(x - x1, y - y1) <= 24) target = 1
    if (target === null) return
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingRef.current = true
    dragTargetRef.current = target
    stateRef.current[2] = 0
    stateRef.current[3] = 0
    trailRef.current.clear()
    e.currentTarget.style.cursor = 'grabbing'
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const { x, y } = pointerPos(e)
    if (draggingRef.current) {
      const { cx, cy, x1, y1 } = bobPositions()
      if (dragTargetRef.current === 1) {
        const dx = x - cx
        const dy = y - cy
        // Degeneracy guard: too close to the pivot for atan2 to be stable.
        if (Math.hypot(dx, dy) >= 8) {
          stateRef.current[0] = Math.atan2(dx, dy) // x-offset first: angle from downward vertical
        }
      } else if (dragTargetRef.current === 2) {
        const dx = x - x1
        const dy = y - y1
        // Degeneracy guard: too close to bob 1 for atan2 to be stable.
        if (Math.hypot(dx, dy) >= 8) {
          stateRef.current[1] = Math.atan2(dx, dy)
        }
      }
      stateRef.current[2] = 0
      stateRef.current[3] = 0
      e.currentTarget.style.cursor = 'grabbing'
    } else {
      const { x1, y1, x2, y2 } = bobPositions()
      const near = Math.hypot(x - x2, y - y2) <= 24 || Math.hypot(x - x1, y - y1) <= 24
      e.currentTarget.style.cursor = near ? 'grab' : ''
    }
  }

  function endDrag(e: React.PointerEvent<HTMLCanvasElement>) {
    draggingRef.current = false
    dragTargetRef.current = null
    stateRef.current[2] = 0
    stateRef.current[3] = 0
    e.currentTarget.style.cursor = ''
  }

  function handlePointerLeave(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!draggingRef.current) e.currentTarget.style.cursor = ''
  }

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
            className="w-full touch-none rounded-lg border bg-white"
            role="img"
            aria-label={ARIA_LABEL}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerLeave={handlePointerLeave}
          />
        </div>
      }
      controls={
        <>
          <LabeledSlider label="m_1" value={m1} min={0.1} max={5} step={0.1} onChange={handleM1Change} />
          <LabeledSlider label="m_2" value={m2} min={0.1} max={5} step={0.1} onChange={handleM2Change} />
          <LabeledSlider label="r_1" value={r1} min={0.5} max={1.5} step={0.05} onChange={handleR1Change} />
          <LabeledSlider label="r_2" value={r2} min={0.5} max={1.5} step={0.05} onChange={handleR2Change} />
          <div className="sm:col-span-2">
            <LabeledSlider label="g" value={g} min={1} max={25} step={0.01} onChange={handleGChange} />
          </div>
          <div className="sm:col-span-2">
            <LabeledSlider
              label="\text{trail}"
              value={trailSeconds}
              min={2}
              max={12}
              step={1}
              onChange={handleTrailSecondsChange}
              format={(v) => `${v.toFixed(0)} s`}
            />
          </div>
          <Button
            size="sm"
            variant={trailOn ? 'default' : 'outline'}
            aria-pressed={trailOn}
            className="justify-self-start sm:col-span-2"
            onClick={() => setTrailOn((v) => !v)}
          >
            trail on/off
          </Button>
        </>
      }
    />
  )
}
