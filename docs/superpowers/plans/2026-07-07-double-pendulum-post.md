# "My First Program Was Chaos" — Double Pendulum Post Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the interactive blog post at `/blog/double-pendulum` per the approved spec (`docs/superpowers/specs/2026-07-07-double-pendulum-post-design.md`): full Lagrangian derivation prose + five canvas interactives backed by a shared, unit-tested physics core.

**Architecture:** Pure-TypeScript physics in `lib/pendulum/` (derivative functions in matrix form, three integrators, flip-time computation) tested with vitest; a shared `useSimCanvas` hook + drawing/control helpers in `components/double-pendulum/`; five `"use client"` demo components; a hand-authored RSC post page in the VAE-post house style.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind + shadcn (existing `Slider`/`Button`), KaTeX via existing `KatexSpan`, plain Canvas 2D, Web Workers, vitest (new, dev-only).

## Global Constraints

- **No new runtime dependencies.** The only new dev dependency is `vitest`.
- All physics state is `Float64Array`; layout `[θ₁, θ₂, ω₁, ω₂]` (double) / `[θ, ω]` (single). Angles in radians, measured from the **downward vertical**, y-down; angles are **never wrapped/modulo-reduced**.
- Real units: meters, kilograms, seconds, default g = 9.81.
- Fixed physics timestep 1/240 s decoupled from frame rate (accumulator, frame delta clamped to 100 ms). RK4 everywhere except IntegratorShowdown's deliberate panels and the fractal workers (RK4 at dt = 1/120).
- Light "textbook figure" style: panels `rounded-xl border bg-card p-4 shadow-sm`, white canvases, chart colors from the `--chart-1..5` CSS variables. No dark-mode work.
- All demos: pause when offscreen (IntersectionObserver); start paused under `prefers-reduced-motion: reduce`; canvases get `role="img"` + `aria-label`; dragging is never the only way to reach a state.
- House style for the post: article shell, figure captions, hero exactly as in `app/blog/vae/page.tsx`.
- Every interactive-demo task must load the **dataviz skill** before writing chart/colormap code (`Skill: dataviz`) — applies to Tasks 7, 8, 9.
- Commit after every task (small, descriptive commits on branch `feat/double-pendulum-post`).
- Type-check gate for every UI task: `npx tsc --noEmit` passes.

---

### Task 1: Vitest setup + physics core

**Files:**
- Create: `lib/pendulum/physics.ts`
- Create: `lib/pendulum/physics.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (add `vitest` devDependency, `"test": "vitest run"` script)

**Interfaces:**
- Consumes: nothing (foundation).
- Produces (exact, used by every later task):
  - `interface SingleParams { m: number; r: number; g: number }`
  - `interface DoubleParams { m1: number; m2: number; r1: number; r2: number; g: number }`
  - `type DerivFn = (s: Float64Array, out: Float64Array) => void`
  - `function singleDeriv(s: Float64Array, p: SingleParams, out: Float64Array): void`
  - `function singleEnergy(s: Float64Array, p: SingleParams): number`
  - `function doubleDeriv(s: Float64Array, p: DoubleParams, out: Float64Array): void`
  - `function doubleEnergy(s: Float64Array, p: DoubleParams): number`
  - `function energyScale(p: DoubleParams): number` — returns `(m1+m2)*g*(r1+r2)`
  - `function flipForbidden(th1: number, th2: number): boolean`

- [ ] **Step 1: Install vitest and wire the test script**

```bash
npm install -D vitest
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node',
  },
})
```

In `package.json` scripts, add: `"test": "vitest run"`.

- [ ] **Step 2: Write the failing tests**

Create `lib/pendulum/physics.test.ts`:

```ts
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./physics`.

- [ ] **Step 4: Implement `lib/pendulum/physics.ts`**

```ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all `physics.test.ts` tests green).

- [ ] **Step 6: Commit**

```bash
git add lib/pendulum/physics.ts lib/pendulum/physics.test.ts vitest.config.ts package.json package-lock.json
git commit -m "feat: double pendulum physics core with vitest"
```

---

### Task 2: Integrators

**Files:**
- Create: `lib/pendulum/integrators.ts`
- Create: `lib/pendulum/integrators.test.ts`

**Interfaces:**
- Consumes: `DerivFn`, `singleDeriv`, `doubleDeriv`, `doubleEnergy`, `energyScale` from `lib/pendulum/physics`.
- Produces (used by Tasks 3–9 and the banner script’s logic):
  - `function stepEuler(s: Float64Array, deriv: DerivFn, dt: number, scratch: Float64Array): void` — scratch length ≥ n
  - `function stepSymplecticEuler(s: Float64Array, deriv: DerivFn, dt: number, scratch: Float64Array): void` — scratch length ≥ n; assumes state layout `[q…, v…]` and deriv output `[v…, a…]`
  - `function stepRK4(s: Float64Array, deriv: DerivFn, dt: number, scratch: Float64Array): void` — scratch length ≥ 5n

- [ ] **Step 1: Write the failing tests**

Create `lib/pendulum/integrators.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./integrators`.

- [ ] **Step 3: Implement `lib/pendulum/integrators.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS. (The double-pendulum symplectic bound is deliberately loose at 1.0·scale — the review panel measured ≈ 0.64·scale drift with this exact code; the tight 3% bound lives on the single pendulum where the method really is symplectic.)

- [ ] **Step 5: Commit**

```bash
git add lib/pendulum/integrators.ts lib/pendulum/integrators.test.ts
git commit -m "feat: Euler, symplectic Euler and RK4 integrators with energy tests"
```

---

### Task 3: Flip-time module

**Files:**
- Create: `lib/pendulum/flip.ts`
- Create: `lib/pendulum/flip.test.ts`

**Interfaces:**
- Consumes: `doubleDeriv`, `flipForbidden`, `DoubleParams`, `DerivFn` from `./physics`; `stepRK4` from `./integrators`.
- Produces (used by the fractal worker and component, Task 9):
  - `const FLIP_NEVER = -1`, `const FLIP_FORBIDDEN = -2`
  - `interface FlipOptions { dt: number; tMax: number }`
  - `const FRACTAL_PARAMS: DoubleParams` — `{ m1: 1, m2: 1, r1: 1, r2: 1, g: 9.81 }`
  - `const FRACTAL_FLIP_OPTS: FlipOptions` — `{ dt: 1/120, tMax: 30 }`
  - `function colToTheta1(col: number, size: number): number` — `-π + (col + 0.5)·2π/size`
  - `function rowToTheta2(row: number, size: number): number` — `π - (row + 0.5)·2π/size` (row 0 = top of image = θ₂ ≈ +π)
  - `function flipTime(th1: number, th2: number, opts?: FlipOptions): number` — seconds until unwrapped |θ₂| first exceeds π, else sentinel
  - `function computeFlipRow(row: number, size: number, opts?: FlipOptions): Float32Array`

- [ ] **Step 1: Write the failing tests**

Create `lib/pendulum/flip.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./flip`.

- [ ] **Step 3: Implement `lib/pendulum/flip.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all three test files green).

- [ ] **Step 5: Commit**

```bash
git add lib/pendulum/flip.ts lib/pendulum/flip.test.ts
git commit -m "feat: flip-time computation with energy pruning for the fractal"
```

---

### Task 4: Shared canvas/controls infrastructure + dev harness

**Files:**
- Create: `components/double-pendulum/useSimCanvas.ts`
- Create: `components/double-pendulum/drawing.ts`
- Create: `components/double-pendulum/controls.tsx`
- Create: `app/dev/pendulum/page.tsx` (temporary harness, deleted in Task 11)

**Interfaces:**
- Consumes: nothing from earlier tasks at runtime (pure UI infra); `lucide-react`, `@/components/ui/button`, `@/components/ui/slider`, `@/components/KatexSpan`.
- Produces (exact, used by Tasks 5–9):

```ts
// useSimCanvas.ts
export interface SimCanvasOptions {
  aspect: number                 // canvas CSS height = container width × aspect
  physicsDt?: number             // default 1/240; read fresh every frame (Task 7 changes it live)
  step: (dt: number) => void
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void  // w,h in CSS px
}
export interface SimCanvas {
  containerRef: React.RefObject<HTMLDivElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  playing: boolean
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>
}
export function useSimCanvas(opts: SimCanvasOptions): SimCanvas

// drawing.ts
export interface Pt { x: number; y: number }
export class RingBuffer<T> {
  constructor(capacity: number)
  push(item: T): void
  clear(): void
  get length(): number
  setCapacity(n: number): void   // keeps the newest min(n, length) items
  forEach(fn: (item: T, i: number) => void): void  // oldest → newest
}
export function drawPivot(ctx: CanvasRenderingContext2D, x: number, y: number): void
export function drawRod(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color?: string, width?: number): void
export function drawBob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke?: string): void
export function drawTrail(ctx: CanvasRenderingContext2D, trail: RingBuffer<Pt>, color: string, width?: number): void
export function chartColor(el: HTMLElement, i: number): string   // i ∈ 1..5 → 'hsl(<--chart-i>)'
export function mixHex(a: string, b: string, t: number): string  // '#rrggbb' linear mix
export interface Series { color: string; points: Pt[] }          // x = seconds, y = value
export interface ChartOpts { xLabel: string; yLabel: string; xMin: number; xMax: number; yMin: number; yMax: number }
export function drawLineChart(ctx: CanvasRenderingContext2D, px: number, py: number, w: number, h: number, series: Series[], opts: ChartOpts): void

// controls.tsx
export function DemoShell(props: {
  playing: boolean; onPlayToggle: () => void; onReset: () => void
  canvas: React.ReactNode; controls?: React.ReactNode; ariaLabel: string
}): React.JSX.Element
export function LabeledSlider(props: {
  label: string   // KaTeX source, rendered via KatexSpan
  value: number; min: number; max: number; step: number
  onChange: (v: number) => void; format?: (v: number) => string
}): React.JSX.Element
```

- [ ] **Step 1: Implement `useSimCanvas.ts`**

```ts
"use client"

import { useEffect, useRef, useState } from 'react'

export interface SimCanvasOptions {
  aspect: number
  physicsDt?: number
  step: (dt: number) => void
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
}

export interface SimCanvas {
  containerRef: React.RefObject<HTMLDivElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  playing: boolean
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>
}

export function useSimCanvas(opts: SimCanvasOptions): SimCanvas {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [playing, setPlaying] = useState(true)
  const playingRef = useRef(playing)
  const optsRef = useRef(opts)

  // Refs are synced in an effect (never during render — concurrent-rendering
  // safe). The rAF callback fires after effects, so it always sees the latest
  // step/draw/physicsDt/playing.
  useEffect(() => {
    playingRef.current = playing
    optsRef.current = opts
  })

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPlaying(false)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()
    let inView = true
    let acc = 0
    let cssW = 0
    let cssH = 0

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      cssW = container.clientWidth
      cssH = Math.round(cssW * optsRef.current.aspect)
      canvas.width = Math.round(cssW * dpr)
      canvas.height = Math.round(cssH * dpr)
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      optsRef.current.draw(ctx, cssW, cssH) // static frame even while paused/offscreen
    }
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      last = performance.now() // discard time spent offscreen
    })
    io.observe(container)

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const elapsed = (now - last) / 1000
      last = now
      if (!inView || cssW === 0) return
      if (playingRef.current) {
        const dt = optsRef.current.physicsDt ?? 1 / 240
        acc = Math.min(acc + elapsed, 0.1) // clamp: no spiral of death
        while (acc >= dt) {
          optsRef.current.step(dt)
          acc -= dt
        }
      }
      optsRef.current.draw(ctx, cssW, cssH)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [])

  return { containerRef, canvasRef, playing, setPlaying }
}
```

- [ ] **Step 2: Implement `drawing.ts`**

```ts
// Canvas drawing helpers shared by the pendulum demos. Light-theme only.

export interface Pt { x: number; y: number }

export class RingBuffer<T> {
  private buf: (T | undefined)[]
  private head = 0
  private count = 0
  constructor(private capacity: number) {
    this.buf = new Array(capacity)
  }
  push(item: T): void {
    this.buf[this.head] = item
    this.head = (this.head + 1) % this.capacity
    if (this.count < this.capacity) this.count++
  }
  clear(): void {
    this.head = 0
    this.count = 0
  }
  get length(): number {
    return this.count
  }
  setCapacity(n: number): void {
    const items: T[] = []
    this.forEach((t) => items.push(t))
    const kept = items.slice(Math.max(0, items.length - n))
    this.capacity = n
    this.buf = new Array(n)
    this.head = 0
    this.count = 0
    for (const t of kept) this.push(t)
  }
  forEach(fn: (item: T, i: number) => void): void {
    const start = (this.head - this.count + 2 * this.capacity) % this.capacity
    for (let i = 0; i < this.count; i++) {
      fn(this.buf[(start + i) % this.capacity] as T, i)
    }
  }
}

const INK = '#171717'

export function drawPivot(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x - 10, y)
  ctx.lineTo(x + 10, y)
  ctx.stroke()
  ctx.fillStyle = INK
  ctx.beginPath()
  ctx.arc(x, y, 3, 0, 2 * Math.PI)
  ctx.fill()
}

export function drawRod(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  color: string = INK, width = 2,
): void {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

export function drawBob(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number, fill: string, stroke: string = INK,
): void {
  ctx.fillStyle = fill
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(x, y, r, 0, 2 * Math.PI)
  ctx.fill()
  ctx.stroke()
}

export function drawTrail(
  ctx: CanvasRenderingContext2D,
  trail: RingBuffer<Pt>,
  color: string, width = 1.5,
): void {
  const n = trail.length
  if (n < 2) return
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  let prev: Pt | null = null
  trail.forEach((p, i) => {
    if (prev) {
      ctx.globalAlpha = 0.05 + (0.8 * i) / n
      ctx.beginPath()
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
    }
    prev = p
  })
  ctx.globalAlpha = 1
}

export function chartColor(el: HTMLElement, i: number): string {
  const raw = getComputedStyle(el).getPropertyValue(`--chart-${i}`).trim()
  return raw ? `hsl(${raw})` : '#404040'
}

export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const c = (sa: number, sb: number) => Math.round(sa + (sb - sa) * t)
  const r = c((pa >> 16) & 255, (pb >> 16) & 255)
  const g = c((pa >> 8) & 255, (pb >> 8) & 255)
  const bl = c(pa & 255, pb & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`
}

export interface Series { color: string; points: Pt[] }
export interface ChartOpts {
  xLabel: string; yLabel: string
  xMin: number; xMax: number; yMin: number; yMax: number
}

// Minimal line chart inside the given rect (CSS px). Follows the dataviz
// skill's guidance: quiet 1px gridlines, labeled axes, no chartjunk.
export function drawLineChart(
  ctx: CanvasRenderingContext2D,
  px: number, py: number, w: number, h: number,
  series: Series[], opts: ChartOpts,
): void {
  const m = { l: 52, r: 10, t: 10, b: 30 }
  const iw = w - m.l - m.r
  const ih = h - m.t - m.b
  const sx = (x: number) => px + m.l + ((x - opts.xMin) / (opts.xMax - opts.xMin)) * iw
  const sy = (y: number) => py + m.t + (1 - (y - opts.yMin) / (opts.yMax - opts.yMin)) * ih

  ctx.save()
  // gridlines + y tick labels (4 divisions)
  ctx.strokeStyle = '#e5e5e5'
  ctx.fillStyle = '#737373'
  ctx.lineWidth = 1
  ctx.font = '11px system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let i = 0; i <= 4; i++) {
    const yv = opts.yMin + ((opts.yMax - opts.yMin) * i) / 4
    const yPix = sy(yv)
    ctx.beginPath()
    ctx.moveTo(px + m.l, yPix)
    ctx.lineTo(px + m.l + iw, yPix)
    ctx.stroke()
    ctx.fillText(yv.toPrecision(3), px + m.l - 6, yPix)
  }
  // x tick labels (4 divisions)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let i = 0; i <= 4; i++) {
    const xv = opts.xMin + ((opts.xMax - opts.xMin) * i) / 4
    ctx.fillText(xv.toFixed(0), sx(xv), py + m.t + ih + 6)
  }
  // axis labels
  ctx.fillText(opts.xLabel, px + m.l + iw / 2, py + h - 14)
  ctx.save()
  ctx.translate(px + 12, py + m.t + ih / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText(opts.yLabel, 0, 0)
  ctx.restore()

  // series (clipped to the plot area; non-finite y-values break the line
  // instead of poisoning the path — spec: never propagate NaN into charts)
  ctx.beginPath()
  ctx.rect(px + m.l, py + m.t, iw, ih)
  ctx.clip()
  for (const s of series) {
    if (s.points.length < 2) continue
    ctx.strokeStyle = s.color
    ctx.lineWidth = 1.5
    ctx.beginPath()
    let started = false
    for (const p of s.points) {
      if (!Number.isFinite(p.y)) {
        started = false
        continue
      }
      if (started) ctx.lineTo(sx(p.x), sy(p.y))
      else {
        ctx.moveTo(sx(p.x), sy(p.y))
        started = true
      }
    }
    ctx.stroke()
  }
  ctx.restore()
}
```

- [ ] **Step 3: Implement `controls.tsx`**

```tsx
"use client"

import { Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import KatexSpan from '@/components/KatexSpan'

export function DemoShell({
  playing, onPlayToggle, onReset, canvas, controls, ariaLabel,
}: {
  playing: boolean
  onPlayToggle: () => void
  onReset: () => void
  canvas: React.ReactNode
  controls?: React.ReactNode
  ariaLabel: string
}) {
  return (
    <div className="not-prose rounded-xl border bg-card p-4 shadow-sm" role="group" aria-label={ariaLabel}>
      <div className="relative">
        {canvas}
        <div className="absolute right-2 top-2 flex gap-1">
          <Button variant="outline" size="icon" aria-label={playing ? 'Pause' : 'Play'} onClick={onPlayToggle}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" aria-label="Reset" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {controls && <div className="mt-4 grid gap-3 sm:grid-cols-2">{controls}</div>}
    </div>
  )
}

export function LabeledSlider({
  label, value, min, max, step, onChange, format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <span className="w-16 shrink-0 text-muted-foreground">
        <KatexSpan text={label} inline />
      </span>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} className="flex-1" />
      <span className="w-20 shrink-0 text-right tabular-nums">{format ? format(value) : value.toFixed(2)}</span>
    </label>
  )
}
```

- [ ] **Step 4: Create the dev harness `app/dev/pendulum/page.tsx`**

```tsx
// TEMPORARY dev harness for the double pendulum demos. Deleted in Task 11.
export default function PendulumDevPage() {
  return (
    <main className="container mx-auto max-w-4xl space-y-12 px-4 py-24">
      <h1 className="text-2xl font-bold">Pendulum demo harness</h1>
      {/* Demos are appended here as they are built (Tasks 5–9). */}
    </main>
  )
}
```

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit` — expected: no errors.

```bash
git add components/double-pendulum app/dev
git commit -m "feat: shared sim-canvas hook, drawing helpers and demo controls"
```

---

### Task 5: SinglePendulumDemo

**Files:**
- Create: `components/double-pendulum/SinglePendulumDemo.tsx`
- Modify: `app/dev/pendulum/page.tsx` (mount the demo)

**Interfaces:**
- Consumes: `useSimCanvas`, `DemoShell`, `LabeledSlider`, drawing helpers, `singleDeriv`/`singleEnergy` types from `lib/pendulum/physics`, `stepRK4` from `lib/pendulum/integrators`.
- Produces: `export default function SinglePendulumDemo(): React.JSX.Element` (no props).

**Behavior spec (complete):**
- State: `stateRef = useRef(Float64Array.of(Math.PI / 3, 0))`; params `r` (slider 0.5–2 m, default 1, step 0.05), `g` (slider 1–25, default 9.81, step 0.01, format 1 decimal + "Earth" when |g−9.81|<0.05, "Moon" when |g−1.62|<0.05). Params live in `useState` mirrored into a ref for the step/draw closures.
- Ghost toggle (`Button` variant default/outline, label "small-angle ghost"), default ON: a 40%-alpha gray pendulum at `θ_ghost(t) = θ₀·cos(√(g/r)·t)` where `θ₀` and `t = simTimeRef` reset on release/reset/param-change.
- Two preset `Button`s (size sm, variant outline) beside the g slider: "Earth" → g = 9.81, "Moon" → g = 1.62 (always-visible affordance; the readout still names the active preset).
- `step(dt)`: `stepRK4` on `[θ, ω]` with `singleDeriv` closure over current params; `simTimeRef.current += dt`; period measurement: detect sign changes of θ (as in the Task 2 test, interpolated), keep the last two crossing times; measured period = `2·(t₂ − t₁)`.
- `draw`: pivot **centered** at `(w/2, h/2)` (the bob must be able to swing overhead without clipping — drags past 90° and full rotations are expected); scale `pxPerM = (h·0.45) / r` (dynamic — follows the length slider, rod always fills ~45% of the panel); rod + bob (radius 14px) from θ; ghost rod+bob when enabled; readout row under the canvas (HTML, not canvas): "measured period: X.XX s · 2π√(r/g) = Y.YY s" via `<span className="text-sm text-muted-foreground tabular-nums">`.
- Drag: `onPointerDown` on the canvas — if pointer within 24 px of the bob, `setPointerCapture`, `draggingRef = true`, pause integration (skip `step` while dragging, keep drawing); `onPointerMove` → `θ = Math.atan2(px − cx, py − cy)` (x-offset first — angle from downward vertical), `ω = 0`; **degeneracy guard:** if the pointer is within 8 px of the pivot, keep the previous θ instead of calling atan2; `onPointerUp` **and `onPointerCancel`** → end the drag with `ω = 0`, reset `simTimeRef = 0`, `θ₀ = θ`, clear crossings (without pointercancel handling, a touch drag that the browser reclaims would freeze the sim forever). The canvas className must include `touch-none` (touch-action: none) or mobile browsers steal the gesture for scrolling and stop delivering pointermove — setPointerCapture does NOT prevent this. Don't "fix" page-scroll-over-the-canvas by removing the class. Cursor: `grab`/`grabbing` via inline style when hovering the bob.
- Reset: `θ = π/3, ω = 0`, simTime 0, crossings cleared.
- Canvas `aspect: 0.62`, `aria-label="Interactive single pendulum simulation"`.
- Slider changes: keep current θ, zero ω, reset ghost timer and crossings (so the readouts stay honest).

- [ ] **Step 1: Implement the component per the behavior spec** (structure: `"use client"`; refs for state/params/drag; `useSimCanvas({ aspect: 0.62, step, draw })`; `DemoShell` wrapping the canvas `<div ref={containerRef} className="w-full"><canvas ref={canvasRef} className="w-full touch-none rounded-lg border bg-white" role="img" aria-label="…" onPointerDown={…} onPointerMove={…} onPointerUp={…} onPointerCancel={…} /></div>`; controls = two `LabeledSlider`s (`label="r"`, `label="g"`) + Earth/Moon preset buttons + ghost toggle button + readout row.)

- [ ] **Step 2: Mount in the dev harness** — in `app/dev/pendulum/page.tsx` add `import SinglePendulumDemo from '@/components/double-pendulum/SinglePendulumDemo'` and render `<SinglePendulumDemo />` in the main element.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` — no errors. Then `npm run dev`, open `http://localhost:3000/dev/pendulum` and check: swings smoothly; drag works (touch and mouse); ghost superposes at small angles and dephases at θ₀ near π/2; measured period ≈ 2.01 s at r=1, g=9.81 for small θ₀; pause/reset buttons work; scrolling the demo offscreen freezes it (check via a `console.log` in `step` if in doubt, then remove).

- [ ] **Step 4: Commit**

```bash
git add components/double-pendulum/SinglePendulumDemo.tsx app/dev/pendulum/page.tsx
git commit -m "feat: single pendulum demo with small-angle ghost"
```

---

### Task 6: DoublePendulumSim (centerpiece)

**Files:**
- Create: `components/double-pendulum/DoublePendulumSim.tsx`
- Modify: `app/dev/pendulum/page.tsx` (mount)

**Interfaces:**
- Consumes: same infra as Task 5 plus `doubleDeriv`, `DoubleParams`, `RingBuffer`, `drawTrail`, `chartColor`.
- Produces: `export default function DoublePendulumSim(): React.JSX.Element` (no props).

**Behavior spec (complete):**
- State: `stateRef = useRef(Float64Array.of(Math.PI / 2, Math.PI / 2, 0, 0))`; params sliders: `m_1`, `m_2` (0.1–5 kg, step 0.1, default 1), `r_1`, `r_2` (0.5–1.5 m, step 0.05, default 1), `g` (1–25, step 0.01, default 9.81). KaTeX labels `m_1` etc.
- Trail: `RingBuffer<Pt>` of bob-2 positions in **world meters** (so slider-driven scale changes don't corrupt history — convert to px at draw time). Capacity = `trailSeconds × 60`; trail-length slider 2–12 s (default 6, step 1, plain-text label "trail" — pass `label="\text{trail}"`), toggle button "trail on/off" default ON; `setCapacity` on slider change. Push one point per **rendered frame** while playing and not dragging.
- `step(dt)`: `stepRK4` with `doubleDeriv` closure over current params (scratch `Float64Array(20)` allocated once in a ref).
- `draw`: pivot **centered** at `(w/2, h/2)` and `pxPerM = (h·0.44) / (r₁+r₂)` (dynamic — chaotic flips go overhead constantly, the full circle must always fit; the trail survives rescaling because it's stored in world meters). Trail first (under the rods), then rod1/bob1, rod2/bob2. Bob radius `10·∛m` px. Trail color `chartColor(canvas, 1)` (resolved once on mount into a ref, fallback `#404040`).
- Drag (both bobs): hit-test bob 2 first (it overlaps bob 1 less often than vice versa), radius 24 px. Dragging bob 1: `θ₁ = atan2(px − cx, py − cy)`; dragging bob 2: `θ₂ = atan2(px − x1, py − y1)`; **degeneracy guard:** if the pointer is within 8 px of the relevant joint (pivot for bob 1, bob-1 center for bob 2), keep the previous angle. In both cases all ω = 0 and the trail is cleared. No stepping while dragging; `onPointerUp` **and `onPointerCancel`** end the drag; release resumes if `playing`. Canvas className includes `touch-none` (see Task 5 for why — non-negotiable for touch drag).
- Reset: state `[π/2, π/2, 0, 0]`, clear trail.
- Canvas `aspect: 0.75`, `aria-label="Interactive double pendulum simulation"`.

- [ ] **Step 1: Implement per the behavior spec.**
- [ ] **Step 2: Mount in the dev harness.**
- [ ] **Step 3: Verify** — `npx tsc --noEmit`; in the browser: chaotic motion looks physical (no energy blow-up over minutes); both bobs draggable; every slider does what it says; trail fades and respects the length slider; unequal masses/lengths behave plausibly (heavy m₁ → bob 2 whips).
- [ ] **Step 4: Commit** — `git add …; git commit -m "feat: interactive double pendulum centerpiece sim"`

---

### Task 7: IntegratorShowdown

**Files:**
- Create: `components/double-pendulum/IntegratorShowdown.tsx`
- Modify: `app/dev/pendulum/page.tsx` (mount)

**Interfaces:**
- Consumes: infra + `stepEuler`, `stepSymplecticEuler`, `stepRK4`, `doubleDeriv`, `doubleEnergy`, `energyScale`, `drawLineChart`, `Series`, `RingBuffer`, `chartColor`.
- Produces: `export default function IntegratorShowdown(): React.JSX.Element` (no props).

**Before coding:** load the **dataviz skill** (`Skill: dataviz`) — the energy chart must follow it.

**Behavior spec (complete):**
- Fixed params `{ m1: 1, m2: 1, r1: 1, r2: 1, g: 9.81 }`; IC `[π/2, π/2, 0, 0]` for all three integrators; three independent `Float64Array` states + `frozen: [boolean, boolean, boolean]` in refs.
- dt slider: 1/240 … 1/30 s, step 1/240, default 1/60, KaTeX label `\Delta t`, format `(v*1000).toFixed(1) + " ms"`. `physicsDt` of `useSimCanvas` is this value (the hook reads it fresh each frame).
- `step(dt)`: advance each unfrozen state with its integrator; after stepping, if any component of a state is non-finite or |ω| > 10⁶, mark frozen. Track `simTimeRef += dt` and push one energy sample per rendered frame (in `draw`, throttled to when playing): `RingBuffer<{ t: number; e: [number, number, number] }>` capacity 3600 (60 s at 60 fps). **For a frozen integrator, push `NaN` as its energy component from then on** — `drawLineChart` treats non-finite y as a line break (Task 4), so the frozen line simply stops; never feed `doubleEnergy` of a non-finite state to the chart.
- Layout: **one canvas**, `aspect 0.85` (deliberate deviation from the spec's "stacked on mobile" — recorded in the spec now; the sub-viewports stay side by side at all widths and the chart carries the message on small screens). Top band (55% of height): three equal sub-viewports drawn side by side, each a mini pendulum (pivot **centered vertically in the band**, `pxPerM = bandH·0.45/2` so full rotations never clip, bob radius 7 px). Frozen panels get a 70%-alpha white overlay + centered text "energy: ∞ — integration failed" (canvas `fillText`). Bottom band (45%): `drawLineChart` of E(t), one series per integrator, rolling 60 s window (`xMin = max(0, t−60), xMax = max(60, t)`), y-domain **fixed**: `yMin = E0 − 0.8·scale`, `yMax = E0 + 1.5·scale` where `scale = energyScale(params)` — wide enough below E0 that the semi-implicit line's slow wander (it is NOT truly symplectic here, see Task 2) stays visible, while Euler's line exits the top, which is the message. Labels: x "time (s)", y "total energy (J)".
- HTML row under the canvas: three labels "explicit Euler" / "symplectic Euler" / "RK4" colored via inline `style={{ color }}` matching series colors (`chartColor(el, 1..3)`), text-sm, centered under each third.
- Restart (DemoShell reset): reset all three states to IC, unfreeze, clear history, `simTimeRef = 0`. dt slider change also restarts (stale comparison is meaningless).
- `aria-label="Three integrators racing on identical double pendulums with a live energy chart"`.

- [ ] **Step 1: Load the dataviz skill, then implement per the behavior spec.**
- [ ] **Step 2: Mount in the dev harness.**
- [ ] **Step 3: Verify** — `npx tsc --noEmit`; in browser: at default dt=1/60 Euler's energy visibly climbs within ~10 s and its pendulum goes wild (eventually freezing with the overlay, its chart line stopping without any NaN artifacts); the semi-implicit line wanders slowly (possibly by tens of percent of scale over a minute — expected, it is not truly symplectic for this system) but stays inside the chart and never runs away; RK4 flat; at dt=1/240 Euler degrades slower; at 1/30 it fails fast; restart works; chart axes/labels legible.
- [ ] **Step 4: Commit** — `git commit -m "feat: integrator showdown with live energy chart"`

---

### Task 8: ChaosTwins

**Files:**
- Create: `components/double-pendulum/ChaosTwins.tsx`
- Modify: `app/dev/pendulum/page.tsx` (mount)

**Interfaces:**
- Consumes: infra + `stepRK4`, `doubleDeriv`, `drawLineChart`, `RingBuffer`, `chartColor`, `mixHex`, `drawTrail`.
- Produces: `export default function ChaosTwins(): React.JSX.Element` (no props).

**Before coding:** load the **dataviz skill**.

**Behavior spec (complete):**
- Params fixed `{ m1: 1, m2: 1, r1: 1, r2: 1, g: 9.81 }`. `N` slider 2–50 (default 20, step 1, label `N`, format integer). Base angle `B` starts 2.0 rad; pendulum k gets IC `[B, B + k·1e-7, 0, 0]`.
- States: `Float64Array[]` in a ref, rebuilt on N-change/restart/nudge; one shared scratch. Trails: one `RingBuffer<Pt>` (world coords) per pendulum, capacity 180 (3 s at 60 fps), pushed per rendered frame.
- Colors: pendulum k gets `mixHex(cA, cB, k/(N−1))` where `cA/cB` are `chartColor(el, 1)` / `chartColor(el, 4)` converted... `chartColor` returns `hsl()` strings which `mixHex` can't mix — so instead: resolve the two endpoint colors to RGB once on mount by drawing them to a 1×1 canvas and reading back `getImageData` (helper inside this component, ~10 lines), then `mixHex` the resulting hexes. Rod/bob stroke uses the per-pendulum color at 90% alpha; bobs radius 5 px, rods 1.25 px.
- Divergence: each frame, RMS state separation `d = sqrt(Σ(s₀[i] − s_{N−1}[i])² / 4)` over the 4 components (spec says RMS — the ÷4 matters for matching its description); push `{ x: t, y: log10(max(d, 1e-12)) }` into a `RingBuffer` (capacity 2400 = 40 s); simTime in a ref.
- Layout: one canvas, `aspect 0.9`. Top 55%: the pendulum fan (single shared pivot **centered in the band** at (w/2, band·0.5), `pxPerM = band·0.45/2` — flips go overhead, full circle must fit). Bottom 45%: divergence chart, y fixed [−8, 1] labeled "log₁₀ separation", x rolling 40 s "time (s)". Prose-critical: the straight rising section is the Lyapunov exponent made visible.
- Buttons (in controls row): "Nudge" (`Button` variant outline; `B = 1.8 + ((B − 1.8 + 0.15) % 0.8)` — cycles deterministically; restart) next to the `N` slider. DemoShell reset = restart with same B.
- `aria-label="Many double pendulums with nearly identical starts diverging over time"`.

- [ ] **Step 1: Load the dataviz skill, then implement per the behavior spec.**
- [ ] **Step 2: Mount in the dev harness.**
- [ ] **Step 3: Verify** — `npx tsc --noEmit`; in browser: pendulums indistinguishable for several seconds, then fan out; divergence line rises ~linearly then saturates around log₁₀(d) ≈ 0.5–1; N slider rebuilds cleanly; Nudge gives a different but repeatable run; 50 pendulums stay at 60 fps.
- [ ] **Step 4: Commit** — `git commit -m "feat: chaos twins demo with divergence chart"`

---

### Task 9: FlipFractal (worker + component)

**Files:**
- Create: `components/double-pendulum/flipWorker.ts`
- Create: `components/double-pendulum/FlipFractal.tsx`
- Modify: `app/dev/pendulum/page.tsx` (mount)

**Interfaces:**
- Consumes: `computeFlipRow`, `colToTheta1`, `rowToTheta2`, `FLIP_NEVER`, `FLIP_FORBIDDEN`, `FRACTAL_PARAMS`, `FRACTAL_FLIP_OPTS` from `lib/pendulum/flip`; `flipForbidden` from `lib/pendulum/physics`; sim infra for the companion mini-sim.
- Produces: `export default function FlipFractal(): React.JSX.Element` (no props).

**Before coding:** load the **dataviz skill** (colormap design).

**Worker protocol (exact):**

```ts
// main → worker
interface RunMsg { type: 'run'; gen: number; size: number; rowStart: number; stride: number }
// worker → main
interface RowMsg { type: 'row'; gen: number; row: number; size: number; data: Float32Array }
interface DoneMsg { type: 'done'; gen: number }
```

`flipWorker.ts` (complete):

```ts
import { computeFlipRow } from '@/lib/pendulum/flip'

interface RunMsg { type: 'run'; gen: number; size: number; rowStart: number; stride: number }

self.onmessage = (e: MessageEvent<RunMsg>) => {
  const { gen, size, rowStart, stride } = e.data
  for (let row = rowStart; row < size; row += stride) {
    const data = computeFlipRow(row, size)
    // `as ArrayBuffer`: TS ≥5.7 types .buffer as ArrayBufferLike, which stops
    // being assignable to Transferable in newer TS — the cast is future-proof.
    ;(self as unknown as Worker).postMessage({ type: 'row', gen, row, size, data }, [data.buffer as ArrayBuffer])
  }
  ;(self as unknown as Worker).postMessage({ type: 'done', gen })
}
```

**Behavior spec (complete):**
- Quality state: `'fast'` (size 120, default) | `'fine'` (size 360); two Buttons ("Fast 120²" default-variant when active, "Fine 360²").
- Pool: **inside a `useEffect` with `[quality]` deps — never during render or in `useMemo`** (`Worker`/`navigator` don't exist during SSR of the page, and StrictMode's double-mount needs the cleanup): the effect bumps `gen`, creates `P = Math.min(4, Math.max(1, (navigator.hardwareConcurrency || 4) - 1))` workers via `new Worker(new URL('./flipWorker.ts', import.meta.url))` (this exact form — webpack statically analyzes it; verified to work in Next 15.1.5 including the `@/lib/...` alias inside the worker), posts worker i `{ type: 'run', gen, size, rowStart: i, stride: P }` (striped rows → the image fills in evenly), and **returns a cleanup that terminates all of this pool's workers**. Ignore messages whose `gen` doesn't match. `rowsDone` state drives a progress bar (`<div className="h-1 bg-primary" style={{width: pct}}>` inside a `bg-muted` track), hidden at 100%. Cleanup on unmount terminates the pool. Wrap `new Worker` in try/catch → on failure set an `error` state: render the panel with only the analytic boundary figure + note "Your browser couldn't run the computation — here's the theoretical no-flip region."
- Buffer: an offscreen `document.createElement('canvas')` at `size×size`; each RowMsg paints via `putImageData(rowImageData, 0, row)`. Colormap (per dataviz skill; exact defaults):
  - flip time t: `u = clamp((ln(t) − ln(0.1)) / (ln(30) − ln(0.1)), 0, 1)`; color = 3-stop ramp `#312e81 → #0d9488 → #fde047` (two `mixHex` segments, breakpoint u = 0.5) — dark = flips fast.
  - `FLIP_NEVER` → `#d4d4d4`; `FLIP_FORBIDDEN` → `#f5f5f4`.
- Display canvas: square, drawn each repaint (`drawImage(buffer, …)` scaled to fit; `imageSmoothingEnabled = quality === 'fine'`), then the analytic boundary: sample θ₁ ∈ [−π/2, π/2] (200 samples), θ₂ = ±arccos(1 − 2cos θ₁), map to canvas (x = (θ₁+π)/2π·W, y = (π−θ₂)/2π·H), stroke both branches `#171717` 1.5 px; then the selection crosshair if set. Axis labels (HTML, not canvas): `θ₁ →` bottom center, `θ₂ ↑` left, `text-sm text-muted-foreground` with KatexSpan.
- Hover: `onPointerMove` → tooltip div (absolute, `pointer-events-none`, `bg-popover border rounded px-2 py-1 text-xs`) showing `θ₁ = 42°, θ₂ = −108°` + "flips after 3.2 s" / "never flipped (30 s budget)" / "energetically impossible". Values from a `Float32Array[size]` per-row store kept alongside the buffer.
- Click: sets `selected = {th1, th2}` → companion mini-sim below the map (small canvas, aspect 0.6, own `useSimCanvas`, RK4 dt 1/240, `FRACTAL_PARAMS`, IC `[th1, th2, 0, 0]`), with its own reset-to-this-pixel behavior and a caption "released from θ₁=…°, θ₂=…°". Crosshair marker drawn on the map at the selected pixel.
- Recompute is NOT triggered by anything except quality change (params are fixed by design).
- `aria-label="Fractal map of initial angles colored by time until the second bob flips"`.

- [ ] **Step 1: Load the dataviz skill; implement worker + component per spec.**
- [ ] **Step 2: Mount in the dev harness.**
- [ ] **Step 3: Verify** — `npx tsc --noEmit`; in browser: Fast completes in seconds with the classic fractal structure (solid calm lobe inside the boundary curve, filigree outside); boundary curve hugs the forbidden region edge exactly; hover readouts sane at corners/center; click launches matching mini-sim (a forbidden-region pixel should visibly never flip); Fine completes with progress bar and no UI jank (main thread stays responsive while computing); switching quality mid-compute cancels cleanly (no stale rows painted).
- [ ] **Step 4: Commit** — `git commit -m "feat: progressive flip fractal with worker pool and click-to-simulate"`

---

### Task 10: Banner generation

**Files:**
- Create: `scripts/render-banner.mjs`
- Create (generated, committed): `public/double-pendulum-banner.svg`

**Interfaces:**
- Consumes: nothing (self-contained by design — throwaway artifact generator).
- Produces: `public/double-pendulum-banner.svg`, imported by Task 11's pages.

- [ ] **Step 1: Write `scripts/render-banner.mjs`** — plain Node, zero deps, self-contained RK4 double pendulum (same equations as `physics.ts`, transcribe the `doubleDeriv` matrix-solve body and the `stepRK4` loop into the script): params m1=m2=1, r1=r2=1, g=9.81; 12 pendulums, IC `[2.1, 2.1 + k·1e-4, 0, 0]`; dt 1/240 for 10 s; sample bob-2 position every 8 steps. Map to a 1600×900 viewBox: pivot (800, 290), 175 px/m. Each pendulum → 3 `<path>` age-chunks (first 40% of samples at stroke-opacity 0.15, next 35% at 0.35, final 25% at 0.7), `stroke-width 2.2`, `fill="none"`, `stroke-linecap="round"`; per-pendulum color: linear-mix hex ramp across the **site's own chart palette** — convert the light-theme `--chart-1`, `--chart-2`, `--chart-4` HSL triples from `app/globals.css` to hex and use those as the three ramp stops (comment the correspondence in the script; spec requires the banner to use the site palette, not arbitrary hexes); background rect `#fafaf9`. Round coordinates to 1 decimal to keep the file small. Write with `fs.writeFileSync('public/double-pendulum-banner.svg', svg)`.
- [ ] **Step 2: Generate** — Run: `node scripts/render-banner.mjs`; expected: file created, < 200 KB. Open it in the browser (`file://` or via `public/`) — it should read as a long-exposure photograph of chaotic trails, mostly filling the middle of the frame. If the trails leave frame or bunch up, adjust pivot y / px-per-m / T and regenerate (taste call; 2–3 iterations are expected. Check it looks good both full-size and cropped short-and-wide, since the hero crops vertically via `object-cover`.)
- [ ] **Step 3: Commit** — `git add scripts/render-banner.mjs public/double-pendulum-banner.svg && git commit -m "feat: generated long-exposure banner for the pendulum post"`

---

### Task 11: The post page + listing + cleanup

**Files:**
- Create: `app/blog/double-pendulum/page.tsx`
- Modify: `app/blog/page.tsx` (add listing entry)
- Delete: `app/dev/pendulum/page.tsx` (and `app/dev/` if empty)

**Interfaces:**
- Consumes: all five demo components (default exports, no props); `KatexSpan`; `public/double-pendulum-banner.svg`.
- Produces: the route `/blog/double-pendulum`; listing card on `/blog`.

**Page skeleton:** mirror `app/blog/vae/page.tsx` exactly — `/* eslint-disable react/no-unescaped-entities */`, `import 'katex/dist/katex.min.css'`, hero `<Image src={banner} fill priority>` with gradient overlay and `<h1 className="…text-[64px]…">My First Program Was Chaos</h1>`, `<time dateTime="2026-07-07">July 7, 2026</time>`, article shell `container mx-auto px-4 py-8 prose prose-lg dark:prose-invert max-w-4xl prose-img:mx-auto prose-img:w-full`.

**Prose beats and required display equations (KaTeX source, exact):** Write the prose fresh (first person, plain-spoken, physics-first — same register as the VAE post; short paragraphs; no headers deeper than `<h3>`). Beats, in order:

1. *Intro (no heading, ~3 paragraphs):* first program ever = this exact simulation, copied in 2016 from Coding Train challenge #93 (link `https://thecodingtrain.com/challenges/93-double-pendulum`) with formulas pasted from myphysicslab, understood none of it, been meaning to come back ever since. Thesis: this time, derive everything.
2. *`<h2>` One pendulum first* — Figure 1: inline SVG diagram (complete SVG below). Lagrangian intro; equations in this order:
   - `L = T - V`
   - `\frac{d}{dt}\!\left(\frac{\partial L}{\partial \dot{\theta}}\right) - \frac{\partial L}{\partial \theta} = 0`
   - `T = \tfrac{1}{2} m r^2 \dot{\theta}^2, \qquad V = -m g r \cos\theta`
   - `\frac{d}{dt}\left(m r^2 \dot{\theta}\right) + m g r \sin\theta = 0`
   - `\ddot{\theta} = -\frac{g}{r} \sin\theta`
   - `\theta(t) \approx \theta_0 \cos(\omega t), \qquad \omega = \sqrt{g/r}, \qquad T_{\text{period}} = 2\pi\sqrt{r/g}` (small-angle)
   Prose: why L = T − V works here without force diagrams (one coordinate, constraint handled for free); the small-angle lie; note that beyond small angles there's no elementary closed form — remember that, it matters in a minute. Then **Figure 2: `<SinglePendulumDemo />`** with caption inviting the reader to drag it past 90° and watch the ghost fall out of sync.
3. *`<h2>` Now bolt a pendulum to your pendulum* — Figure 3: inline SVG diagram (below). Derivation, equations in this order:
   - `x_1 = r_1 \sin\theta_1, \qquad y_1 = r_1 \cos\theta_1` (y measured downward)
   - `x_2 = x_1 + r_2 \sin\theta_2, \qquad y_2 = y_1 + r_2 \cos\theta_2`
   - `v_1^2 = r_1^2 \dot{\theta}_1^2, \qquad v_2^2 = r_1^2 \dot{\theta}_1^2 + r_2^2 \dot{\theta}_2^2 + 2 r_1 r_2 \dot{\theta}_1 \dot{\theta}_2 \cos(\theta_1 - \theta_2)`
   - `T = \tfrac{1}{2} m_1 v_1^2 + \tfrac{1}{2} m_2 v_2^2, \qquad V = -(m_1 + m_2) g r_1 \cos\theta_1 - m_2 g r_2 \cos\theta_2`
   - Euler–Lagrange grouped result, then the matrix form:
   - `\begin{bmatrix} (m_1+m_2) r_1^2 & m_2 r_1 r_2 \cos\Delta \\ m_2 r_1 r_2 \cos\Delta & m_2 r_2^2 \end{bmatrix} \begin{bmatrix} \ddot{\theta}_1 \\ \ddot{\theta}_2 \end{bmatrix} = \begin{bmatrix} -m_2 r_1 r_2 \dot{\theta}_2^2 \sin\Delta - (m_1+m_2) g r_1 \sin\theta_1 \\ m_2 r_1 r_2 \dot{\theta}_1^2 \sin\Delta - m_2 g r_2 \sin\theta_2 \end{bmatrix}, \qquad \Delta = \theta_1 - \theta_2`
   - `\det M = m_2 r_1^2 r_2^2 \left(m_1 + m_2 \sin^2\Delta\right) > 0`
   Prose: two coordinates now, same recipe; the myphysicslab formulas from 2016 are this exact system solved by hand (link them); det M > 0 so the solve never explodes. Then **Figure 4: `<DoublePendulumSim />`**, caption: this is the whole machine — drag, tune, break it.
4. *`<h2>` Making it not explode* — equations:
   - `y = (\theta_1, \theta_2, \omega_1, \omega_2), \qquad \dot{y} = f(y)`
   - `y_{n+1} = y_n + h\, f(y_n)` (explicit Euler)
   - `\omega_{n+1} = \omega_n + h\, a(\theta_n, \omega_n), \qquad \theta_{n+1} = \theta_n + h\, \omega_{n+1}` (symplectic Euler)
   - RK4: `y_{n+1} = y_n + \tfrac{h}{6}\left(k_1 + 2k_2 + 2k_3 + k_4\right)`
   Prose beats: Euler steps along tangents and spirals outward in energy; the original video's sketch slowly gained energy — and the fix Shiffman stumbled into (update velocity before position) is semi-implicit Euler: he reached for a deep piece of numerical analysis by reordering two lines. **Be precise here (the review panel caught this):** semi-implicit Euler is truly *symplectic* — conserving a shadow energy forever — only for separable systems like the single pendulum; the double pendulum's mass matrix depends on θ, so the strict guarantee is lost and its energy error drifts slowly (first-order) instead of oscillating. It is still dramatically better behaved than explicit Euler's exponential runaway, which is why the reordering rescued the sketch — and the demo below shows exactly this three-way hierarchy. RK4 as the workhorse everywhere else on this page. Then **Figure 5: `<IntegratorShowdown />`**, caption: same pendulum, three integrators — watch the red line leave.
5. *`<h2>` The part where it becomes chaos* — equations:
   - `\lVert \delta(t) \rVert \approx \lVert \delta(0) \rVert\, e^{\lambda t}`
   - `t_{\text{horizon}} \sim \frac{1}{\lambda} \ln\!\frac{\text{tolerance}}{\text{precision}}`
   Prose: deterministic ≠ predictable; double the precision of your measurement and you buy a fixed few extra seconds, not double the forecast; that's the straight line in the plot below. Include the weather/Lorenz connection (this is the same mathematics Lorenz found in his weather model — the reason forecasts cap out around two weeks, told in a sentence or two). Then **Figure 6: `<ChaosTwins />`**, caption: 20 pendulums, 10⁻⁷ radians apart at launch.
6. *`<h2>` Every possible pendulum at once* — equations:
   - `E = -mgl\,(2\cos\theta_1 + \cos\theta_2)` (released from rest, m₁=m₂=m, r₁=r₂=l)
   - `V_{\text{flip}}^{\min} = -mgl \quad\Rightarrow\quad \text{no flip possible while } 2\cos\theta_1 + \cos\theta_2 > 1`
   Prose: define the flip-time question; derive the forbidden region in 4 lines; aside that the often-quoted `3\cos\theta_1 + \cos\theta_2 > 2` is the *compound* (uniform-bar) pendulum's version of the same argument; the black curve on the map below is this inequality — and it's also a free lunch computationally, since the most expensive pixels to simulate are exactly the ones theory hands us for free. Then **Figure 7: `<FlipFractal />`**, caption: click anywhere on the map to fly that pendulum.
7. *Epilogue (no heading, ~2 paragraphs):* the 2016 sketch and this page run the same hundred-ish lines of physics; what changed is that every line is now load-bearing knowledge instead of incantation. Close by inviting the reader to scroll back up and drag the pendulums around one more time. Nostalgia closed.
8. *`<h3>` References* — plain `<ul>`, `target="_blank" rel="noopener noreferrer"`:
   - Coding Train, Challenge #93: Double Pendulum — `https://thecodingtrain.com/challenges/93-double-pendulum`
   - myphysicslab, Double Pendulum — `https://www.myphysicslab.com/pendulum/double-pendulum-en.html`
   - Daniel Shiffman, The Nature of Code — `https://natureofcode.com/`
   - Diego Assencio, Double pendulum: Lagrangian formulation — verify exact URL with WebFetch/WebSearch during implementation
   - Jeremy S. Heyl, The Double Pendulum Fractal (2008) — verify exact URL (UBC/arXiv) during implementation
   - Source code for this post — link to the repo on GitHub covering both `lib/pendulum` and `components/double-pendulum` (copy the repo URL pattern from the VAE post's source link)

**Figure 1 SVG (complete, drop-in):**

```tsx
<svg viewBox="0 0 400 300" className="mx-auto w-full max-w-sm" role="img" aria-label="Single pendulum diagram: rod of length r at angle theta from the vertical with mass m">
  <line x1="150" y1="40" x2="250" y2="40" stroke="#171717" strokeWidth="2" />
  {Array.from({ length: 9 }, (_, i) => (
    <line key={i} x1={155 + i * 11} y1="40" x2={148 + i * 11} y2="28" stroke="#a3a3a3" strokeWidth="1.5" />
  ))}
  <line x1="200" y1="40" x2="200" y2="230" stroke="#a3a3a3" strokeWidth="1" strokeDasharray="5 5" />
  <line x1="200" y1="40" x2="295" y2="180" stroke="#171717" strokeWidth="2.5" />
  <path d="M 200 100 A 60 60 0 0 0 233 89" fill="none" stroke="#525252" strokeWidth="1.5" />
  <circle cx="200" cy="40" r="4" fill="#171717" />
  <circle cx="295" cy="180" r="16" fill="#404040" stroke="#171717" strokeWidth="1.5" />
  <text x="212" y="120" fontSize="17" fontStyle="italic" fill="#404040">θ</text>
  <text x="232" y="105" fontSize="15" fontStyle="italic" fill="#404040">r</text>
  <text x="318" y="186" fontSize="17" fontStyle="italic" fill="#171717">m</text>
  <line x1="345" y1="70" x2="345" y2="120" stroke="#525252" strokeWidth="1.5" markerEnd="url(#arrow)" />
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
      <path d="M 0 0 L 8 4 L 0 8 z" fill="#525252" />
    </marker>
  </defs>
  <text x="355" y="100" fontSize="15" fontStyle="italic" fill="#404040">g</text>
</svg>
```

**Figure 3 SVG (complete, drop-in):** same visual language, viewBox `0 0 440 340`; pivot (220, 40); dashed vertical from pivot; rod 1 to bob 1 at (307, 166) — θ₁ ≈ 35°; second dashed vertical from bob 1 down to (307, 290); rod 2 from bob 1 to bob 2 at (398, 208) — θ₂ ≈ 65°; angle arcs at both verticals; labels: `θ₁` `r₁` `m₁` `(x₁, y₁)` at bob 1, `θ₂` `r₂` `m₂` `(x₂, y₂)` at bob 2 (subscripts via `<tspan baselineShift="sub" fontSize="11">`). Reuse the marker/hatch pattern from Figure 1. Write it by adapting Figure 1's code — every element type already appears there.

- [ ] **Step 1: Write the page** — full prose per the beats above (aim ≈ 3,000–3,800 words), all display equations as `<KatexSpan text="…" />` blocks and inline math as `<KatexSpan text="…" inline />`, both diagrams, five demo figures with captions, references. Verify the two external reference URLs (Assencio, Heyl) with WebSearch/WebFetch and use the resolved URLs; also copy the GitHub source-link pattern from the VAE post.
- [ ] **Step 2: Add the listing entry** — in `app/blog/page.tsx`: `import doublePendulumBanner from "@/public/double-pendulum-banner.svg"` and prepend `{ title: "My First Program Was Chaos", date: "July 7, 2026", slug: "double-pendulum", image: doublePendulumBanner }` to the `posts` array (newest first).
- [ ] **Step 3: Delete the dev harness** — remove `app/dev/pendulum/page.tsx` and the `app/dev/` directory.
- [ ] **Step 4: Verify** — `npx tsc --noEmit`; `npm run dev`: read the whole page top to bottom at `/blog/double-pendulum`; every equation renders (no KaTeX error boxes); all five demos work in situ; `/blog` shows the new card with the banner; the banner hero crops acceptably; no console errors.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: 'My First Program Was Chaos' interactive double pendulum post"`

---

### Task 12: Final verification pass

**Files:** none new — fixes only.

- [ ] **Step 1: Full test + lint + production build**

```bash
npm test          # expected: all vitest suites pass
npm run lint      # expected: no errors (warnings OK if pre-existing style)
npm run build     # expected: production build succeeds, /blog/double-pendulum in route list
```

- [ ] **Step 2: Production smoke test** — `npm run start`, walk `/`, `/blog`, `/blog/double-pendulum`; exercise all five demos including FlipFractal fine mode and click-to-simulate; use the `verify` skill's approach: observe real behavior, not just absence of errors.
- [ ] **Step 3: Reduced-motion check** — in DevTools, emulate `prefers-reduced-motion: reduce`, reload: all demos start paused with a sensible static frame and working play buttons.
- [ ] **Step 4: Mobile check** — DevTools iPhone viewport: canvases fit, sliders usable, touch-drag works on both pendulum sims (and page scroll still works from outside the canvases), the showdown's energy chart is legible (its three mini-viewports stay side by side by design — small is acceptable, unreadable is not), fractal tooltip doesn't overflow.
- [ ] **Step 5: Fix anything found, commit fixes, re-run step 1.**
- [ ] **Step 6: Use the superpowers:finishing-a-development-branch skill** to decide merge/PR with the user.

---

## Self-review notes (writing-plans checklist)

- **Spec coverage:** every spec section maps to a task — physics/matrix form (1), integrators + tests (2), flip module (3), infra/a11y/reduced-motion/offscreen-pause (4), five interactives (5–9), banner (10), page/listing/references/diagrams (11), verification (12). The spec's "makeAccumulator" helper was folded into `useSimCanvas` (the only consumer — YAGNI); the accumulator logic itself (clamped, fixed-dt) is inside the hook, and Task 7's live-dt requirement is why it reads `physicsDt` fresh each frame.
- **Type consistency:** demo components are default exports with no props; infra exports match between Task 4's "Produces" block and Tasks 5–9's "Consumes" blocks; sentinel constants and grid mapping live only in `lib/pendulum/flip.ts`.
- **Known judgment calls:** `mixHex` needs RGB endpoints, `chartColor` returns `hsl()` — Task 8 resolves endpoints via 1×1-canvas readback (specified inline). Two reference URLs are deliberately resolve-at-implementation (verification step included) rather than hardcoded-possibly-wrong.
- **Review-panel fixes applied (2026-07-07):** symplectic-Euler claims corrected everywhere (not symplectic for the non-separable double pendulum — shadow-energy test moved to the single pendulum, double-pendulum bound loosened to a qualitative 1.0·scale, Task 7 chart/verify expectations and §3 prose updated); flip-boundary test probes ±1e-6 off the measure-zero boundary (exact point fails in FP); cross-check tolerance set to 1e-10 relative (different trig factorizations); all four demo geometries recentered so overhead swings never clip (dynamic pxPerM in Tasks 5–6); frozen integrators push NaN and `drawLineChart` breaks lines on non-finite y; `touch-none` + `onPointerCancel` + pivot-degeneracy guards on all draggable canvases; worker pool pinned to a `useEffect`/`[quality]`/cleanup shape with the transfer cast `data.buffer as ArrayBuffer`; banner ramp uses the site chart palette; Earth/Moon presets are buttons; divergence is RMS (÷4); listing entry is prepended (spec updated to match).
