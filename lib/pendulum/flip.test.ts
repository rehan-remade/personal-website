import { expect, it } from 'vitest'
import { colToTheta1, computeFlipRow, FLIP_FORBIDDEN, FLIP_NEVER, flipTime, rowToTheta2 } from './flip'

it('grid mapping: pixel centers, θ1 left→right, θ2 top→bottom decreasing', () => {
  expect(colToTheta1(0, 4)).toBeCloseTo(-Math.PI + Math.PI / 4, 12)
  expect(colToTheta1(3, 4)).toBeCloseTo(Math.PI - Math.PI / 4, 12)
  expect(rowToTheta2(0, 4)).toBeCloseTo(Math.PI - Math.PI / 4, 12)
  expect(rowToTheta2(3, 4)).toBeCloseTo(-Math.PI + Math.PI / 4, 12)
})

it('energetically forbidden initial conditions short-circuit', () => {
  expect(flipTime(0.1, 0.1)).toBe(FLIP_FORBIDDEN)
})

it('a high-energy start flips quickly', () => {
  const t = flipTime(3.0, 3.0)
  expect(t).toBeGreaterThan(0)
  expect(t).toBeLessThan(5)
})

it('an allowed start with a tiny time budget reports NEVER', () => {
  expect(flipTime(Math.PI / 2, Math.PI / 2, { dt: 1 / 120, tMax: 0.05 })).toBe(FLIP_NEVER)
})

it('computeFlipRow returns one value per column consistent with flipTime', () => {
  const row = computeFlipRow(1, 8)
  expect(row.length).toBe(8)
  expect(row[2]).toBeCloseTo(flipTime(colToTheta1(2, 8), rowToTheta2(1, 8)), 5)
})
