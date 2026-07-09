// Generates public/double-pendulum-banner.svg: a "long-exposure photograph
// of chaos" made of 12 nearly-identical double pendulums whose bob-2 trails
// fan apart over time.
//
// Deliberately self-contained (zero imports beyond node:fs) so it keeps
// running standalone forever, independent of the app's TS module graph.
// The physics/integrator below are hand-transcribed (not imported) from:
//   - lib/pendulum/physics.ts      (doubleDeriv)
//   - lib/pendulum/integrators.ts  (stepRK4)
// Keep them in sync by eye if those files' equations ever change.
import { writeFileSync } from 'node:fs'

// ---------------------------------------------------------------------------
// Physics: transcribed from lib/pendulum/physics.ts `doubleDeriv`.
// Equations of motion in mass-matrix form M(θ)·[α1, α2]ᵀ = f(θ, ω),
// solved as a 2×2 linear system.
// ---------------------------------------------------------------------------
function doubleDeriv(s, p, out) {
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

// ---------------------------------------------------------------------------
// Integrator: transcribed from lib/pendulum/integrators.ts `stepRK4`.
// ---------------------------------------------------------------------------
function stepRK4(s, deriv, dt, scratch) {
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

// ---------------------------------------------------------------------------
// Palette: the site's own chart colors, not arbitrary hexes.
// Source: light-theme HSL triples in app/globals.css, converted to hex by
// hand once (standard HSL->RGB math) and hardcoded here.
//   --chart-1: 12 76% 61%   -> #e76e50
//   --chart-2: 173 58% 39%  -> #2a9d90
//   --chart-4: 43 74% 66%   -> #e8c468
// Used as the 3-stop ramp interpolated across the 12 pendulums below.
// ---------------------------------------------------------------------------
const RAMP = ['#e76e50', '#2a9d90', '#e8c468']

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function lerpColor(hexA, hexB, t) {
  const [ra, ga, ba] = hexToRgb(hexA)
  const [rb, gb, bb] = hexToRgb(hexB)
  const r = Math.round(ra + (rb - ra) * t)
  const g = Math.round(ga + (gb - ga) * t)
  const b = Math.round(ba + (bb - ba) * t)
  return `rgb(${r},${g},${b})`
}

// t in [0, 1] walks the 3-stop ramp: [0, 0.5] blends stop0->stop1, [0.5, 1]
// blends stop1->stop2.
function rampColor(t) {
  return t <= 0.5 ? lerpColor(RAMP[0], RAMP[1], t / 0.5) : lerpColor(RAMP[1], RAMP[2], (t - 0.5) / 0.5)
}

// ---------------------------------------------------------------------------
// Simulation + layout parameters (tune these if the composition needs it).
// ---------------------------------------------------------------------------
const PARAMS = { m1: 1, m2: 1, r1: 1, r2: 1, g: 9.81 }
const N_PENDULUMS = 12
const DT = 1 / 240
const DURATION_S = 10
const SAMPLE_EVERY = 8

// Layout was tuned from the spec's starting point of pivot (800, 290) at
// 175 px/m. Bob-2's horizontal reach is hard-capped at r1+r2 = 2 m regardless
// of simulation duration (verified: the trajectories already pass within
// 0.01% of that exact cap by ~7.5 s in), so the max possible x-span is
// 4 * PX_PER_M px. At 175 px/m that ceiling is only 700px (43.75% of a
// 1600-wide viewBox) — too tight a composition. 225 px/m raises the ceiling
// enough to fill most of the frame; the pivot was moved down to re-center
// the resulting trail cloud vertically.
const VIEW_W = 1600
const VIEW_H = 900
const PIVOT_X = 800
const PIVOT_Y = 385
const PX_PER_M = 225

const STROKE_WIDTH = 2.2
const AGE_CHUNKS = [
  { frac: 0.4, opacity: 0.15 },
  { frac: 0.35, opacity: 0.35 },
  { frac: 0.25, opacity: 0.7 },
]

function round1(x) {
  return Math.round(x * 10) / 10
}

// Runs one pendulum for DURATION_S and returns its bob-2 trail as
// [xPx, yPx] pairs already mapped into the viewBox and rounded to 1 decimal.
function simulateTrail(k) {
  const th2_0 = 2.1 + k * 1e-4
  const s = Float64Array.of(2.1, th2_0, 0, 0)
  const scratch = new Float64Array(20) // n=4 -> 5*n scratch for RK4
  const deriv = (state, out) => doubleDeriv(state, PARAMS, out)
  const nSteps = Math.round(DURATION_S / DT)

  const pts = []
  for (let i = 0; i < nSteps; i++) {
    if (i % SAMPLE_EVERY === 0) {
      const x2 = PARAMS.r1 * Math.sin(s[0]) + PARAMS.r2 * Math.sin(s[1])
      const y2 = PARAMS.r1 * Math.cos(s[0]) + PARAMS.r2 * Math.cos(s[1])
      pts.push([round1(PIVOT_X + x2 * PX_PER_M), round1(PIVOT_Y + y2 * PX_PER_M)])
    }
    stepRK4(s, deriv, DT, scratch)
  }
  return pts
}

function pathD(points) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
}

// Splits a trail into the 3 age chunks (oldest/dimmest first), sharing the
// boundary point between consecutive chunks so the <path>s join with no gap.
function chunkTrail(points) {
  const n = points.length
  const chunks = []
  let start = 0
  for (let i = 0; i < AGE_CHUNKS.length; i++) {
    const isLast = i === AGE_CHUNKS.length - 1
    const count = Math.round(AGE_CHUNKS[i].frac * n)
    const end = isLast ? n : start + count
    chunks.push(points.slice(start, end))
    start = end > start ? end - 1 : end // overlap by one point for continuity
  }
  return chunks
}

function buildSvg() {
  const trails = []
  for (let k = 0; k < N_PENDULUMS; k++) trails.push(simulateTrail(k))

  const groups = trails
    .map((points, k) => {
      const t = N_PENDULUMS === 1 ? 0 : k / (N_PENDULUMS - 1)
      const color = rampColor(t)
      const chunks = chunkTrail(points)
      const paths = chunks
        .map(
          (chunk, i) =>
            `<path d="${pathD(chunk)}" fill="none" stroke="${color}" stroke-opacity="${AGE_CHUNKS[i].opacity}" stroke-width="${STROKE_WIDTH}" stroke-linecap="round"/>`
        )
        .join('\n    ')
      return `  <g>\n    ${paths}\n  </g>`
    })
    .join('\n')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" width="${VIEW_W}" height="${VIEW_H}">
  <rect x="0" y="0" width="${VIEW_W}" height="${VIEW_H}" fill="#fafaf9"/>
${groups}
</svg>
`
  return { svg, trails }
}

function logComposition(trails) {
  const all = trails.flat()
  const xs = all.map((p) => p[0])
  const ys = all.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length
  const center = { x: VIEW_W / 2, y: VIEW_H / 2 }
  const centerDist = Math.hypot(meanX - center.x, meanY - center.y)

  console.log(`points: ${all.length} (${trails.length} pendulums x ${trails[0]?.length ?? 0})`)
  console.log(`x range: [${minX.toFixed(1)}, ${maxX.toFixed(1)}]  margins: [${minX.toFixed(1)}, ${(VIEW_W - maxX).toFixed(1)}]`)
  console.log(`y range: [${minY.toFixed(1)}, ${maxY.toFixed(1)}]  margins: [${minY.toFixed(1)}, ${(VIEW_H - maxY).toFixed(1)}]`)
  console.log(
    `span: ${(maxX - minX).toFixed(1)}px x ${(maxY - minY).toFixed(1)}px  (${(((maxX - minX) / VIEW_W) * 100).toFixed(1)}% x ${(((maxY - minY) / VIEW_H) * 100).toFixed(1)}% of viewBox)`
  )
  console.log(`mean point: (${meanX.toFixed(1)}, ${meanY.toFixed(1)})  center: (${center.x}, ${center.y})  dist: ${centerDist.toFixed(1)}px`)
}

const { svg, trails } = buildSvg()
logComposition(trails)
writeFileSync('public/double-pendulum-banner.svg', svg)
console.log(`wrote public/double-pendulum-banner.svg (${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB)`)
