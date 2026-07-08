"use client"

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { singleDeriv, type SingleParams } from '@/lib/pendulum/physics'
import { stepRK4 } from '@/lib/pendulum/integrators'
import { useSimCanvas } from './useSimCanvas'
import { drawPivot, drawRod, drawBob, chartColor } from './drawing'
import { DemoShell, LabeledSlider } from './controls'

const GHOST_COLOR = 'rgba(115, 115, 115, 0.4)'
const BOB_RADIUS = 14
const THETA0 = Math.PI / 3

function formatG(v: number): string {
  if (Math.abs(v - 9.81) < 0.05) return `${v.toFixed(1)} Earth`
  if (Math.abs(v - 1.62) < 0.05) return `${v.toFixed(1)} Moon`
  return v.toFixed(1)
}

export default function SinglePendulumDemo(): React.JSX.Element {
  // Physics state [θ, ω], mutated in place by stepRK4.
  const stateRef = useRef(Float64Array.of(THETA0, 0))
  const scratchRef = useRef(new Float64Array(10))
  const paramsRef = useRef<SingleParams>({ m: 1, r: 1, g: 9.81 })

  // Ghost (small-angle analytic solution) bookkeeping.
  const simTimeRef = useRef(0)
  const theta0Ref = useRef(THETA0)
  const ghostRef = useRef(true)

  // Period measurement: last two interpolated zero-crossing times of θ.
  const crossingsRef = useRef<number[]>([])

  // Drag state.
  const draggingRef = useRef(false)

  // Latest canvas CSS size, captured during draw() for pointer hit-testing.
  const sizeRef = useRef({ w: 0, h: 0 })

  // Readout text is mutated imperatively every frame (avoids a React
  // re-render at animation-frame rate); it is always kept in sync because
  // draw() runs every frame regardless of play state.
  const periodSpanRef = useRef<HTMLSpanElement | null>(null)

  const [r, setR] = useState(1)
  const [g, setG] = useState(9.81)
  const [showGhost, setShowGhost] = useState(true)

  useEffect(() => {
    ghostRef.current = showGhost
  })

  function resetMotion(theta: number) {
    stateRef.current[1] = 0
    simTimeRef.current = 0
    theta0Ref.current = theta
    crossingsRef.current = []
  }

  function handleRChange(v: number) {
    setR(v)
    paramsRef.current.r = v
    resetMotion(stateRef.current[0])
  }

  function handleGChange(v: number) {
    setG(v)
    paramsRef.current.g = v
    resetMotion(stateRef.current[0])
  }

  function handleReset() {
    stateRef.current[0] = THETA0
    stateRef.current[1] = 0
    simTimeRef.current = 0
    theta0Ref.current = THETA0
    crossingsRef.current = []
  }

  const deriv = (s: Float64Array, out: Float64Array) => singleDeriv(s, paramsRef.current, out)

  function step(dt: number) {
    if (draggingRef.current) return // integration paused while the user is dragging the bob
    const s = stateRef.current
    const prevTheta = s[0]
    const t0 = simTimeRef.current
    stepRK4(s, deriv, dt, scratchRef.current)
    simTimeRef.current = t0 + dt
    // Interpolated zero crossing of θ (same technique as the Task 2 test).
    if (prevTheta > 0 !== s[0] > 0) {
      const tCross = t0 + (dt * prevTheta) / (prevTheta - s[0])
      crossingsRef.current.push(tCross)
      if (crossingsRef.current.length > 2) crossingsRef.current.shift()
    }
  }

  function draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    sizeRef.current = { w, h }
    ctx.clearRect(0, 0, w, h)
    const cx = w / 2
    const cy = h / 2
    const { r: rr, g: gg } = paramsRef.current
    const pxPerM = (h * 0.45) / rr

    if (ghostRef.current) {
      const thetaG = theta0Ref.current * Math.cos(Math.sqrt(gg / rr) * simTimeRef.current)
      const gx = cx + rr * pxPerM * Math.sin(thetaG)
      const gy = cy + rr * pxPerM * Math.cos(thetaG)
      drawRod(ctx, cx, cy, gx, gy, GHOST_COLOR, 2)
      drawBob(ctx, gx, gy, BOB_RADIUS, GHOST_COLOR, GHOST_COLOR)
    }

    const theta = stateRef.current[0]
    const bx = cx + rr * pxPerM * Math.sin(theta)
    const by = cy + rr * pxPerM * Math.cos(theta)
    drawPivot(ctx, cx, cy)
    drawRod(ctx, cx, cy, bx, by)
    drawBob(ctx, bx, by, BOB_RADIUS, chartColor(ctx.canvas, 1))

    if (periodSpanRef.current) {
      const measured =
        crossingsRef.current.length === 2
          ? (2 * (crossingsRef.current[1] - crossingsRef.current[0])).toFixed(2)
          : '—'
      const formula = (2 * Math.PI * Math.sqrt(rr / gg)).toFixed(2)
      periodSpanRef.current.textContent = `measured period: ${measured} s · 2π√(r/g) = ${formula} s`
    }
  }

  const { containerRef, canvasRef, playing, setPlaying } = useSimCanvas({ aspect: 0.62, step, draw })

  function bobPos() {
    const { w, h } = sizeRef.current
    const cx = w / 2
    const cy = h / 2
    const rr = paramsRef.current.r
    const pxPerM = (h * 0.45) / rr
    const theta = stateRef.current[0]
    return { cx, cy, bx: cx + rr * pxPerM * Math.sin(theta), by: cy + rr * pxPerM * Math.cos(theta) }
  }

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const { x, y } = pointerPos(e)
    const { bx, by } = bobPos()
    if (Math.hypot(x - bx, y - by) <= 24) {
      e.currentTarget.setPointerCapture(e.pointerId)
      draggingRef.current = true
      e.currentTarget.style.cursor = 'grabbing'
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const { x, y } = pointerPos(e)
    if (draggingRef.current) {
      const { cx, cy } = bobPos()
      const dx = x - cx
      const dy = y - cy
      // Degeneracy guard: too close to the pivot for atan2 to give a stable angle.
      if (Math.hypot(dx, dy) >= 8) {
        stateRef.current[0] = Math.atan2(dx, dy) // x-offset first: angle from downward vertical
      }
      stateRef.current[1] = 0
      e.currentTarget.style.cursor = 'grabbing'
    } else {
      const { bx, by } = bobPos()
      e.currentTarget.style.cursor = Math.hypot(x - bx, y - by) <= 24 ? 'grab' : ''
    }
  }

  function endDrag(e: React.PointerEvent<HTMLCanvasElement>) {
    draggingRef.current = false
    stateRef.current[1] = 0
    simTimeRef.current = 0
    theta0Ref.current = stateRef.current[0]
    crossingsRef.current = []
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
      ariaLabel="Interactive single pendulum simulation"
      canvas={
        <>
          <div ref={containerRef} className="w-full">
            <canvas
              ref={canvasRef}
              className="w-full touch-none rounded-lg border bg-white"
              role="img"
              aria-label="Interactive single pendulum simulation"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onPointerLeave={handlePointerLeave}
            />
          </div>
          <div className="mt-2">
            <span ref={periodSpanRef} className="text-sm text-muted-foreground tabular-nums">
              {`measured period: — s · 2π√(r/g) = ${(2 * Math.PI * Math.sqrt(r / g)).toFixed(2)} s`}
            </span>
          </div>
        </>
      }
      controls={
        <>
          <div className="sm:col-span-2">
            <LabeledSlider label="r" value={r} min={0.5} max={2} step={0.05} onChange={handleRChange} />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <div className="flex-1">
              <LabeledSlider label="g" value={g} min={1} max={25} step={0.01} onChange={handleGChange} format={formatG} />
            </div>
            <Button size="sm" variant="outline" onClick={() => handleGChange(9.81)}>
              Earth
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleGChange(1.62)}>
              Moon
            </Button>
          </div>
          <Button
            size="sm"
            variant={showGhost ? 'default' : 'outline'}
            aria-pressed={showGhost}
            className="justify-self-start sm:col-span-2"
            onClick={() => setShowGhost((v) => !v)}
          >
            small-angle ghost
          </Button>
        </>
      }
    />
  )
}
