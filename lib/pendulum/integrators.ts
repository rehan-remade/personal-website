import type { DerivFn } from './physics'

export function stepEuler(s: Float64Array, deriv: DerivFn, dt: number, scratch: Float64Array): void {
  deriv(s, scratch)
  for (let i = 0; i < s.length; i++) s[i] += dt * scratch[i]
}

// Semi-implicit ("symplectic") Euler — the accidental fix in Coding Train #93:
// update the velocities first, then advance the positions with the NEW velocities.
// Assumes state [q…, v…] with deriv output [v…, a…].
export function stepSymplecticEuler(s: Float64Array, deriv: DerivFn, dt: number, scratch: Float64Array): void {
  const n = s.length
  const h = n >> 1
  deriv(s, scratch)
  for (let i = h; i < n; i++) s[i] += dt * scratch[i]
  for (let i = 0; i < h; i++) s[i] += dt * s[h + i]
}

export function stepRK4(s: Float64Array, deriv: DerivFn, dt: number, scratch: Float64Array): void {
  const n = s.length
  const k1 = scratch.subarray(0, n)
  const k2 = scratch.subarray(n, 2 * n)
  const k3 = scratch.subarray(2 * n, 3 * n)
  const k4 = scratch.subarray(3 * n, 4 * n)
  const tmp = scratch.subarray(4 * n, 5 * n)
  deriv(s, k1)
  for (let i = 0; i < n; i++) tmp[i] = s[i] + 0.5 * dt * k1[i]
  deriv(tmp, k2)
  for (let i = 0; i < n; i++) tmp[i] = s[i] + 0.5 * dt * k2[i]
  deriv(tmp, k3)
  for (let i = 0; i < n; i++) tmp[i] = s[i] + dt * k3[i]
  deriv(tmp, k4)
  for (let i = 0; i < n; i++) s[i] += (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
}
