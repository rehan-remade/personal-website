import { describe, expect, it } from 'vitest'
import {
  doubleDeriv,
  doubleEnergy,
  energyScale,
  flipForbidden,
  singleEnergy,
  type DoubleParams,
} from './physics'

// Deterministic PRNG so failures reproduce exactly.
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Independent transcription of the closed-form accelerations from
// myphysicslab (the formulas used in Coding Train challenge #93).
function explicitAccel(s: Float64Array, p: DoubleParams): [number, number] {
  const { m1, m2, r1, r2, g } = p
  const th1 = s[0], th2 = s[1], w1 = s[2], w2 = s[3]
  const den = 2 * m1 + m2 - m2 * Math.cos(2 * th1 - 2 * th2)
  const a1 =
    (-g * (2 * m1 + m2) * Math.sin(th1) -
      m2 * g * Math.sin(th1 - 2 * th2) -
      2 * Math.sin(th1 - th2) * m2 *
        (w2 * w2 * r2 + w1 * w1 * r1 * Math.cos(th1 - th2))) /
    (r1 * den)
  const a2 =
    (2 * Math.sin(th1 - th2) *
      (w1 * w1 * r1 * (m1 + m2) +
        g * (m1 + m2) * Math.cos(th1) +
        w2 * w2 * r2 * m2 * Math.cos(th1 - th2))) /
    (r2 * den)
  return [a1, a2]
}

describe('doubleDeriv', () => {
  it('matches the independent myphysicslab closed-form accelerations', () => {
    const rand = mulberry32(42)
    const out = new Float64Array(4)
    for (let i = 0; i < 200; i++) {
      const p: DoubleParams = {
        m1: 0.1 + 5 * rand(), m2: 0.1 + 5 * rand(),
        r1: 0.5 + 1.5 * rand(), r2: 0.5 + 1.5 * rand(),
        g: 1 + 24 * rand(),
      }
      const s = Float64Array.of(
        (rand() - 0.5) * 2 * Math.PI, (rand() - 0.5) * 2 * Math.PI,
        (rand() - 0.5) * 10, (rand() - 0.5) * 10,
      )
      doubleDeriv(s, p, out)
      const [a1, a2] = explicitAccel(s, p)
      expect(out[0]).toBe(s[2])
      expect(out[1]).toBe(s[3])
      // 1e-10 relative: the two derivations use different trig factorizations
      // (cos²Δ vs cos 2Δ), so exact 1e-12 agreement is not guaranteed in FP.
      expect(Math.abs(out[2] - a1)).toBeLessThan(1e-10 * Math.max(1, Math.abs(a1)))
      expect(Math.abs(out[3] - a2)).toBeLessThan(1e-10 * Math.max(1, Math.abs(a2)))
    }
  })
})

describe('energies', () => {
  const p: DoubleParams = { m1: 1, m2: 1, r1: 1, r2: 1, g: 9.81 }

  it('double pendulum at rest hanging straight down has E = -(m1+m2)gr1 - m2gr2', () => {
    const E = doubleEnergy(Float64Array.of(0, 0, 0, 0), p)
    expect(E).toBeCloseTo(-(1 + 1) * 9.81 * 1 - 1 * 9.81 * 1, 12)
  })

  it('single pendulum at rest at the bottom has E = -mgr', () => {
    const E = singleEnergy(Float64Array.of(0, 0), { m: 2, r: 1.5, g: 9.81 })
    expect(E).toBeCloseTo(-2 * 9.81 * 1.5, 12)
  })

  it('energyScale is (m1+m2)g(r1+r2)', () => {
    expect(energyScale(p)).toBeCloseTo(2 * 9.81 * 2, 12)
  })
})

describe('flipForbidden (m1=m2, r1=r2, released from rest)', () => {
  it('is forbidden hanging straight down and allowed at (π/2, π/2)', () => {
    expect(flipForbidden(0, 0)).toBe(true)
    expect(flipForbidden(Math.PI / 2, Math.PI / 2)).toBe(false)
  })

  it('flips sign just either side of the 2cosθ1 + cosθ2 = 1 boundary', () => {
    // Exactly ON the boundary is measure-zero and FP-rounding-dependent
    // (2·Math.cos(Math.PI/3) + Math.cos(Math.PI/2) === 1.0000000000000002),
    // so probe clearly off it instead.
    expect(flipForbidden(Math.PI / 3 + 1e-6, Math.PI / 2)).toBe(false)
    expect(flipForbidden(Math.PI / 3 - 1e-6, Math.PI / 2)).toBe(true)
  })

  it('is consistent with the potential energy function: allowed points have rest energy ≥ the cheapest flipped configuration', () => {
    const p2: DoubleParams = { m1: 1, m2: 1, r1: 1, r2: 1, g: 9.81 }
    const vFlipMin = doubleEnergy(Float64Array.of(0, Math.PI, 0, 0), p2)
    for (let i = 0; i < 60; i++) {
      for (let j = 0; j < 60; j++) {
        const th1 = -Math.PI + ((i + 0.5) * 2 * Math.PI) / 60
        const th2 = -Math.PI + ((j + 0.5) * 2 * Math.PI) / 60
        const eRest = doubleEnergy(Float64Array.of(th1, th2, 0, 0), p2)
        if (!flipForbidden(th1, th2)) {
          expect(eRest).toBeGreaterThanOrEqual(vFlipMin - 1e-9)
        } else {
          expect(eRest).toBeLessThan(vFlipMin)
        }
      }
    }
  })
})
