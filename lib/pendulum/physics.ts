// Pure physics for the double pendulum post. No framework imports.
// Conventions: angles from the downward vertical, y measured downward,
// state layouts [θ, ω] (single) and [θ1, θ2, ω1, ω2] (double).

export interface SingleParams { m: number; r: number; g: number }
export interface DoubleParams { m1: number; m2: number; r1: number; r2: number; g: number }
export type DerivFn = (s: Float64Array, out: Float64Array) => void

export function singleDeriv(s: Float64Array, p: SingleParams, out: Float64Array): void {
  out[0] = s[1]
  out[1] = -(p.g / p.r) * Math.sin(s[0])
}

export function singleEnergy(s: Float64Array, p: SingleParams): number {
  const T = 0.5 * p.m * p.r * p.r * s[1] * s[1]
  const V = -p.m * p.g * p.r * Math.cos(s[0])
  return T + V
}

// Equations of motion in mass-matrix form M(θ)·[α1, α2]ᵀ = f(θ, ω),
// solved as a 2×2 linear system. det M = m2·r1²·r2²·(m1 + m2·sin²Δ) > 0.
export function doubleDeriv(s: Float64Array, p: DoubleParams, out: Float64Array): void {
  const { m1, m2, r1, r2, g } = p
  const th1 = s[0], th2 = s[1], w1 = s[2], w2 = s[3]
  const d = th1 - th2
  const cd = Math.cos(d)
  const sd = Math.sin(d)
  const a11 = (m1 + m2) * r1 * r1
  const a12 = m2 * r1 * r2 * cd
  const a22 = m2 * r2 * r2
  const f1 = -m2 * r1 * r2 * w2 * w2 * sd - (m1 + m2) * g * r1 * Math.sin(th1)
  const f2 = m2 * r1 * r2 * w1 * w1 * sd - m2 * g * r2 * Math.sin(th2)
  const det = a11 * a22 - a12 * a12
  out[0] = w1
  out[1] = w2
  out[2] = (f1 * a22 - f2 * a12) / det
  out[3] = (f2 * a11 - f1 * a12) / det
}

export function doubleEnergy(s: Float64Array, p: DoubleParams): number {
  const { m1, m2, r1, r2, g } = p
  const th1 = s[0], th2 = s[1], w1 = s[2], w2 = s[3]
  const cd = Math.cos(th1 - th2)
  const T =
    0.5 * m1 * r1 * r1 * w1 * w1 +
    0.5 * m2 * (r1 * r1 * w1 * w1 + r2 * r2 * w2 * w2 + 2 * r1 * r2 * w1 * w2 * cd)
  const V = -(m1 + m2) * g * r1 * Math.cos(th1) - m2 * g * r2 * Math.cos(th2)
  return T + V
}

// Characteristic energy for normalizing drift measurements. Never zero,
// unlike E(0) itself (release at (π/2, π/2) has exactly E = 0).
export function energyScale(p: DoubleParams): number {
  return (p.m1 + p.m2) * p.g * (p.r1 + p.r2)
}

// Point-mass double pendulum with m1 = m2 and r1 = r2, released from rest:
// bob 2 can never flip over the top when 2cosθ1 + cosθ2 > 1 (energy argument;
// the cheapest flipped configuration is θ1 = 0, θ2 = π with V = -mgl).
export function flipForbidden(th1: number, th2: number): boolean {
  return 2 * Math.cos(th1) + Math.cos(th2) > 1
}
