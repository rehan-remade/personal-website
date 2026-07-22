import { describe, expect, it } from 'vitest'
import {
  doubleDeriv,
  doubleEnergy,
  energyScale,
  singleDeriv,
  singleEnergy,
  type DerivFn,
  type DoubleParams,
  type SingleParams,
} from './physics'
import { stepEuler, stepRK4, stepSymplecticEuler } from './integrators'

const DT = 1 / 240
const P: DoubleParams = { m1: 1, m2: 1, r1: 1, r2: 1, g: 9.81 }
const CHAOTIC_IC = () => Float64Array.of(2, 2, 0, 0)
const dDeriv: DerivFn = (s, out) => doubleDeriv(s, P, out)

it('small-angle single pendulum period matches 2π√(r/g) within 0.1%', () => {
  const sp: SingleParams = { m: 1, r: 1, g: 9.81 }
  const deriv: DerivFn = (s, out) => singleDeriv(s, sp, out)
  const s = Float64Array.of(0.01, 0)
  const scratch = new Float64Array(10)
  const crossings: number[] = []
  let prev = s[0]
  for (let i = 1; i * DT < 10 && crossings.length < 2; i++) {
    stepRK4(s, deriv, DT, scratch)
    if (prev > 0 !== s[0] > 0) {
      // linear interpolation of the zero crossing inside this step
      crossings.push((i - 1) * DT + (DT * prev) / (prev - s[0]))
    }
    prev = s[0]
  }
  expect(crossings.length).toBe(2)
  const period = 2 * (crossings[1] - crossings[0])
  const exact = 2 * Math.PI * Math.sqrt(1 / 9.81)
  expect(Math.abs(period - exact) / exact).toBeLessThan(1e-3)
})

describe('energy behavior over a chaotic trajectory (θ1=θ2=2, rest)', () => {
  it('RK4 drift stays below 1e-4 of the energy scale for 60 s', () => {
    const s = CHAOTIC_IC()
    const scratch = new Float64Array(20)
    const e0 = doubleEnergy(s, P)
    let maxErr = 0
    for (let i = 0; i * DT < 60; i++) {
      stepRK4(s, dDeriv, DT, scratch)
      maxErr = Math.max(maxErr, Math.abs(doubleEnergy(s, P) - e0))
    }
    expect(maxErr / energyScale(P)).toBeLessThan(1e-4)
  })

  it('explicit Euler gains energy: > 1% of the energy scale within 10 s', () => {
    const s = CHAOTIC_IC()
    const scratch = new Float64Array(4)
    const e0 = doubleEnergy(s, P)
    for (let i = 0; i * DT < 10; i++) stepEuler(s, dDeriv, DT, scratch)
    expect(doubleEnergy(s, P) - e0).toBeGreaterThan(0.01 * energyScale(P))
  })

  it('symplectic Euler stays bounded where explicit Euler runs away', () => {
    // IMPORTANT PHYSICS CAVEAT: semi-implicit Euler is only truly symplectic
    // for separable Hamiltonians. The double pendulum's kinetic energy has a
    // θ-dependent mass matrix (and ω is not the conjugate momentum), so the
    // update is NOT a symplectic map here and its energy error DRIFTS
    // (measured ≈ 0.64·scale at 60 s, first-order in dt) rather than
    // oscillating. The claim under test is the qualitative contrast with
    // explicit Euler's unbounded runaway — nothing stronger.
    const s = CHAOTIC_IC()
    const scratch = new Float64Array(4)
    const e0 = doubleEnergy(s, P)
    let maxErr = 0
    for (let i = 0; i * DT < 60; i++) {
      stepSymplecticEuler(s, dDeriv, DT, scratch)
      maxErr = Math.max(maxErr, Math.abs(doubleEnergy(s, P) - e0))
    }
    expect(maxErr / energyScale(P)).toBeLessThan(1.0)
  })
})

it('symplectic Euler conserves a shadow energy on the (separable) single pendulum', () => {
  const sp: SingleParams = { m: 1, r: 1, g: 9.81 }
  const deriv: DerivFn = (s, out) => singleDeriv(s, sp, out)
  const s = Float64Array.of(2.0, 0) // large swing, well beyond small-angle
  const scratch = new Float64Array(2)
  const e0 = singleEnergy(s, sp)
  let maxErr = 0
  for (let i = 0; i * DT < 60; i++) {
    stepSymplecticEuler(s, deriv, DT, scratch)
    maxErr = Math.max(maxErr, Math.abs(singleEnergy(s, sp) - e0))
  }
  // Bounded oscillation, no trend — this is where the method IS symplectic.
  expect(maxErr / (sp.m * sp.g * sp.r)).toBeLessThan(0.03)
})
