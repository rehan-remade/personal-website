import { doubleDeriv, flipForbidden, type DerivFn, type DoubleParams } from './physics'
import { stepRK4 } from './integrators'

export const FLIP_NEVER = -1
export const FLIP_FORBIDDEN = -2

export interface FlipOptions { dt: number; tMax: number }

export const FRACTAL_PARAMS: DoubleParams = { m1: 1, m2: 1, r1: 1, r2: 1, g: 9.81 }
export const FRACTAL_FLIP_OPTS: FlipOptions = { dt: 1 / 120, tMax: 30 }

export function colToTheta1(col: number, size: number): number {
  return -Math.PI + ((col + 0.5) * 2 * Math.PI) / size
}

export function rowToTheta2(row: number, size: number): number {
  return Math.PI - ((row + 0.5) * 2 * Math.PI) / size
}

const deriv: DerivFn = (s, out) => doubleDeriv(s, FRACTAL_PARAMS, out)

// Time until bob 2 first goes over the top (unwrapped |θ2| > π), released
// from rest at (th1, th2). Sentinels: FLIP_FORBIDDEN (provably impossible,
// skipped without simulating), FLIP_NEVER (no flip within opts.tMax).
export function flipTime(th1: number, th2: number, opts: FlipOptions = FRACTAL_FLIP_OPTS): number {
  if (flipForbidden(th1, th2)) return FLIP_FORBIDDEN
  const s = Float64Array.of(th1, th2, 0, 0)
  const scratch = new Float64Array(20)
  const steps = Math.round(opts.tMax / opts.dt)
  for (let i = 1; i <= steps; i++) {
    stepRK4(s, deriv, opts.dt, scratch)
    if (s[1] > Math.PI || s[1] < -Math.PI) return i * opts.dt
  }
  return FLIP_NEVER
}

export function computeFlipRow(row: number, size: number, opts: FlipOptions = FRACTAL_FLIP_OPTS): Float32Array {
  const out = new Float32Array(size)
  const th2 = rowToTheta2(row, size)
  for (let col = 0; col < size; col++) {
    out[col] = flipTime(colToTheta1(col, size), th2, opts)
  }
  return out
}
