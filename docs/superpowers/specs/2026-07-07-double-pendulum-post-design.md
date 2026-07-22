# Design: "My First Program Was Chaos" — interactive double pendulum post

**Date:** 2026-07-07
**Route:** `/blog/double-pendulum`
**Status:** Approved design, pending implementation plan

## Goal

A physics-first interactive blog post on the double pendulum, in the house style of the VAE post (`app/blog/vae/page.tsx`): hand-authored React Server Component with the `prose` article shell, KaTeX for every equation, numbered figures, and `"use client"` interactives embedded as figures. The nostalgic frame (the author's first program, via Coding Train challenge #93) opens and closes the post; the body is a rigorous build-up — Lagrangian mechanics → equations of motion → numerical integration → chaos → the flip fractal.

Reader outcome: someone comfortable with calculus can re-derive the double pendulum's equations of motion, understands why naive integration fails, and has *seen* (not just read) what sensitive dependence on initial conditions means.

## Non-goals

- No dark-mode toggle work (site has none today; canvases are light "textbook figure" style, full stop).
- No 3D, no sound, no MDX migration, no new runtime dependencies.
- No general-purpose charting library — the two small charts are drawn with a shared canvas helper.

## Post narrative (section by section)

Article shell identical to the VAE post: `<article className="container mx-auto px-4 py-8 prose prose-lg dark:prose-invert max-w-4xl prose-img:mx-auto prose-img:w-full">`, hero banner with gradient overlay `from-transparent to-background`, `text-[64px]` title, `<time>`. Figure captions: `text-center mt-2 text-sm text-muted-foreground` with `<strong>Figure N:</strong>` prefix. Interactives wrapped in `not-prose`.

1. **Hero + intro.** Banner: generated long-exposure multi-trail render (see Banner). Title "My First Program Was Chaos", date July 7, 2026. Intro (~3 paragraphs): first program ever written was a double pendulum copied from Coding Train challenge #93; it worked before it was understood; this post is the understanding. Link the challenge.

2. **§1 The single pendulum, done properly.**
   - Inline SVG diagram (Figure 1): pivot, rod length r, mass m, angle θ from the downward vertical, gravity vector.
   - Introduce Lagrangian mechanics gently: L = T − V, the Euler–Lagrange equation, one-paragraph intuition for why generalized coordinates beat force diagrams for constrained systems (the rod tension never has to be computed).
   - Derivation, every step in display KaTeX: T = ½mr²θ̇², V = −mgr cos θ → **θ̈ = −(g/r) sin θ**.
   - Small-angle approximation sin θ ≈ θ → SHM, θ(t) = θ₀cos(ωt), ω = √(g/r), period T = 2π√(r/g). Note: no elementary closed form for large amplitudes — foreshadows numerical integration.
   - **Interactive 1 — `SinglePendulumDemo` (Figure 2).**

3. **§2 The double pendulum.**
   - Inline SVG diagram (Figure 3): both angles from the downward vertical (θ₁, θ₂), lengths r₁, r₂, masses m₁, m₂, points (x₁,y₁), (x₂,y₂). Same convention as the Coding Train video.
   - Full derivation in display KaTeX, with y measured downward from the pivot:
     - Positions: x₁ = r₁sin θ₁, y₁ = r₁cos θ₁; x₂ = x₁ + r₂sin θ₂, y₂ = y₁ + r₂cos θ₂.
     - Velocities → v₁² = r₁²θ̇₁²; v₂² = r₁²θ̇₁² + r₂²θ̇₂² + 2r₁r₂θ̇₁θ̇₂cos(θ₁−θ₂).
     - T, V = −(m₁+m₂)gr₁cos θ₁ − m₂gr₂cos θ₂, then L = T − V.
     - Euler–Lagrange for each angle. Show the algebra in grouped steps (∂L/∂θ̇ᵢ, d/dt, ∂L/∂θᵢ), landing on the coupled equations.
   - Present the result in **matrix form** with Δ = θ₁ − θ₂:

     ```
     M(θ) θ̈ = f(θ, θ̇)

     M = [ (m₁+m₂)r₁²      m₂r₁r₂cos Δ ]
         [ m₂r₁r₂cos Δ     m₂r₂²       ]

     f = [ −m₂r₁r₂ θ̇₂² sin Δ − (m₁+m₂) g r₁ sin θ₁ ]
         [  m₂r₁r₂ θ̇₁² sin Δ − m₂ g r₂ sin θ₂       ]
     ```

     Note det M = m₂r₁²r₂²(m₁ + m₂sin²Δ) > 0 always, so the 2×2 solve never blows up. Prose aside: the sprawling explicit formulas on the myphysicslab page (the ones transcribed line-by-line in the 2016 sketch, parenthesis bugs and all) are exactly this system solved symbolically by hand — the matrix solve is what you'd write today.
   - **Interactive 2 — `DoublePendulumSim` (Figure 4), the centerpiece.**

4. **§3 Making it not explode (integrators).**
   - The EOMs only give accelerations; animation requires time-stepping. Define the state y = (θ₁, θ₂, ω₁, ω₂) and the derivative function.
   - Explicit Euler: what it is, why its energy grows (it steps along tangents that spiral outward on curved orbits). This is the mystery instability in the original video.
   - The aside that pays for the whole section: Shiffman's "weird reordering that fixed it" — updating velocity before position — is **semi-implicit Euler**. For separable systems (like the single pendulum) it is truly symplectic and conserves a shadow energy forever; the double pendulum's θ-dependent mass matrix breaks the strict guarantee, so its energy error drifts slowly (first-order) instead of oscillating — but it still never runs away the way explicit Euler does, which is why the reordering rescued the sketch. He reached for a deep piece of numerical analysis by accident, live.
   - RK4 in brief: sample the derivative four times per step, weighted average, O(h⁴) error. Everything else in the post runs RK4 at fixed dt.
   - **Interactive 3 — `IntegratorShowdown` (Figure 5).**

5. **§4 Chaos.**
   - What chaos is and isn't: deterministic (same input → same trajectory, always), bounded, yet unpredictable in practice because nearby states diverge exponentially. Weather/Lorenz mention.
   - Lyapunov exponent as "the slope of the divergence line" on a log plot: ‖δ(t)‖ ≈ ‖δ(0)‖e^{λt}, horizon of predictability ~ (1/λ)·ln(tolerance/precision).
   - **Interactive 4 — `ChaosTwins` (Figure 6).**

6. **§5 The flip fractal (finale).**
   - Question: release from rest at (θ₁, θ₂) — how long until the second bob flips over the top? Color every initial condition by that time.
   - Energy argument, derived in KaTeX for m₁=m₂, r₁=r₂ (the demo's fixed configuration): released from rest, E = −mgl(2cos θ₁ + cos θ₂). The cheapest flipped configuration for bob 2 (θ₂ = π, θ₁ = 0) has V = −mgl. So bob 2 **can never flip when 2cos θ₁ + cos θ₂ > 1**. (Note: the widely-quoted 3cos θ₁ + cos θ₂ > 2 condition is the compound/uniform-bar variant on Wikipedia — ours is the point-mass version; say so in a footnote-style aside.)
   - The analytic boundary curve 2cos θ₁ + cos θ₂ = 1 is drawn on top of the computed heatmap — theory overlaid on experiment — and it also *prunes* the computation: pixels inside the forbidden region are provably "never", so the worker skips simulating exactly the pixels that would otherwise cost the full time budget.
   - **Interactive 5 — `FlipFractal` (Figure 7).**

7. **Epilogue** (~2 paragraphs). Same hundred lines, eight years later; the pendulum didn't change, the understanding did. Invitation to drag the pendulums around one more time.

8. **References** — house style, plain `<ul>` of external links: Coding Train challenge #93; myphysicslab double pendulum (source of the 2016 formulas); The Nature of Code; Diego Assencio's "Double pendulum: Lagrangian formulation" (the derivation reference); Heyl, "The Double Pendulum Fractal" (2008); source code link into this repo (`components/double-pendulum` + `lib/pendulum` on GitHub, matching the VAE post's "view code" pattern).

## The five interactives

Shared conventions (all five): wrapped in `<figure>` + numbered `<figcaption>`; `not-prose`; light panel — `rounded-xl border bg-card` around a white canvas; play/pause and reset icon buttons (lucide `Play`/`Pause`/`RotateCcw`) in a control row; shadcn `Slider` with `KatexSpan` labels and live numeric readout; canvas is responsive (fills container width, fixed aspect ratio, DPR-scaled backing store). Autoplay on load **except** when `prefers-reduced-motion: reduce` — then start paused showing a static first frame. Dragging a bob pauses integration and re-launches on release from the dragged angles with zero angular velocity.

1. **`SinglePendulumDemo`** — one pendulum, drag bob to set θ₀. Controls: length r (0.5–2 m), gravity g (1–25, default 9.81, with "Earth" (9.81) and "Moon" (1.62) preset buttons beside the slider). Toggle: "show small-angle ghost" (default on) — a translucent second pendulum following θ₀cos(ωt) exactly; at small θ₀ they superpose, at large θ₀ they visibly dephase within a few swings. Readout: measured period vs 2π√(r/g).
2. **`DoublePendulumSim`** — the centerpiece. Drag either bob (inverse kinematics from pointer: θ₁ from pivot→bob1, θ₂ from bob1→bob2). Sliders: m₁, m₂ (0.1–5 kg), r₁, r₂ (0.5–1.5 m), g (1–25). Trail: toggle + length slider (up to ~12 s of bob-2 path, drawn as a polyline fading with age, colored from the chart tokens). Buttons: pause/play, reset (to θ₁=θ₂=π/2 at rest). Bob radius scales with ∛m.
3. **`IntegratorShowdown`** — three mini-viewports side by side on one shared canvas (they remain side by side on mobile; the energy chart below carries the message on small screens): explicit Euler / semi-implicit Euler / RK4, identical initial conditions (θ₁=θ₂=π/2, rest), each labeled. One shared timestep slider (dt from 1/240 s up to 1/30 s) and restart button. Below: a live line chart, total energy E(t) vs t for all three (one line per integrator, chart-token colors, ~60 s rolling window, y fixed to a window around E₀ — wide enough below to show the semi-implicit line's slow wander, with Euler's line deliberately exiting the top). Expected reading: Euler climbs and eventually goes wild, semi-implicit drifts slowly but stays tame, RK4 flat. If a state goes non-finite (Euler at large dt will), freeze that panel with an "energy: ∞ — integration failed" overlay instead of NaN-crashing; its energy line stops.
4. **`ChaosTwins`** — N pendulums, slider N (2–50, default 20), all launched from θ₁=θ₂=2 (rad, well into the chaotic regime) with bob-2 initial angle offsets of k·δ, δ = 10⁻⁷ rad. Color: interpolated gradient across the chart tokens. Below: divergence chart — log₁₀ of the RMS state separation between pendulum 0 and pendulum N−1 vs time; exponential divergence reads as a straight line, saturating near the attractor diameter. Restart button re-randomizes nothing (deterministic — that's the point); a "nudge" button restarts with a different base angle.
5. **`FlipFractal`** — heatmap over (θ₁, θ₂) ∈ [−π, π]², released from rest, colored by time until bob 2 first flips over the top — with unwrapped angles, the first time |θ₂| exceeds π. Log-scaled sequential colormap; "never within budget" = neutral gray; energetically-forbidden region = slightly distinct neutral, with the analytic curve 2cos θ₁ + cos θ₂ = 1 stroked on top. Fixed physics: m₁=m₂=1, r₁=r₂=1, g=9.81. Quality toggle: Fast 120×120 (default) / Fine 360×360. Compute: pool of `min(4, navigator.hardwareConcurrency − 1)` Web Workers, rows striped across workers, RK4 at dt = 1/120 to T_max = 30 s sim time, energy-pruned as above; results streamed back in row chunks (transferable Float32Array) and painted incrementally; thin progress bar; generation token cancels stale runs when quality changes. Hover (pointer) shows (θ₁°, θ₂°, flip time); **click any pixel to launch that initial condition** in a small companion pendulum panel beside/below the heatmap (its own mini sim + "this pixel" marker on the map).

## Architecture

```
lib/pendulum/
  physics.ts        types (DoubleParams, state tuples), derivative functions for
                    single & double pendulum (matrix form + 2×2 solve), total
                    energy functions, flipForbidden(θ1, θ2) boundary predicate
  integrators.ts    stepEuler / stepSymplecticEuler / stepRK4 — generic over a
                    derivative fn on Float64Array states (the fixed-timestep
                    accumulator, clamping frame delta to 100 ms, lives inside
                    useSimCanvas — its only consumer)
  physics.test.ts   vitest unit tests (see Testing)
components/double-pendulum/
  useSimCanvas.ts   hook: DPR-scaled responsive canvas + rAF loop with fixed
                    physics dt via accumulator + IntersectionObserver pause when
                    offscreen + prefers-reduced-motion initial pause
  drawing.ts        draw helpers: rod/bob/pivot, fading trail polyline,
                    mini line chart (axes, series, rolling window), shared
                    color constants read from the --chart-* CSS variables
  SinglePendulumDemo.tsx
  DoublePendulumSim.tsx
  IntegratorShowdown.tsx
  ChaosTwins.tsx
  FlipFractal.tsx
  flipWorker.ts     worker entry (new Worker(new URL('./flipWorker.ts',
                    import.meta.url))), imports lib/pendulum only
app/blog/double-pendulum/page.tsx    the post (RSC, prose shell, KatexSpan,
                                     inline SVG diagrams, five interactives)
app/blog/page.tsx                    add listing entry {title, date, slug, image}
public/double-pendulum-banner.svg    generated banner (committed artifact)
scripts/render-banner.mjs            throwaway generator (plain Node, no deps)
```

- `lib/pendulum` is framework-free pure TypeScript — the "view source" link target.
- Physics state is `Float64Array` of (θ₁, θ₂, ω₁, ω₂); derivative functions allocate nothing per step (write into caller-provided output arrays) so ChaosTwins at 50 pendulums and the fractal workers stay allocation-free in the hot loop.
- All five demo components are `"use client"`; the post page itself stays a server component.
- No new runtime dependencies. Dev dependencies added: `vitest` only.

## Numerics

- Fixed physics timestep **dt = 1/240 s**, decoupled from display rate via accumulator; frame delta clamped to 100 ms (no spiral of death after tab-switch). RK4 everywhere except IntegratorShowdown's deliberate Euler/symplectic panels and the fractal workers (RK4 at dt = 1/120 for throughput).
- Real units: meters, kilograms, g = 9.81 m/s² default — so the prose's period formula matches the demo's measured period. World-to-screen scale chosen per demo so the fully-extended pendulum fits with margin.
- Angles unwrapped (not modulo-reduced) so flip detection and divergence measurement are well-defined.

## Banner

`scripts/render-banner.mjs`: plain Node, zero dependencies, ~100 lines. Re-implements the double-pendulum RK4 step (self-contained by design — it's a throwaway artifact generator, not production code), simulates ~12 pendulums with 10⁻⁴-offset initial conditions for ~10 s, and writes `public/double-pendulum-banner.svg`: bob-2 trail polylines, stroke colors interpolated across the site's chart palette, opacity fading with age, on a near-white background — a long-exposure photograph of chaos. 1600×900 viewBox. Run once, output committed; the script stays in the repo for regeneration. (SVG works with `next/image` static imports; if the hero gradient/legibility disappoints in review, rasterize to PNG manually as a fallback.)

## Listing entry

Prepend to the `posts` array in `app/blog/page.tsx` (newest first — the grid renders in array order):
`{ title: "My First Program Was Chaos", date: "July 7, 2026", slug: "double-pendulum", image: doublePendulumBanner }` with the corresponding static import. Hero `<time dateTime="2026-07-07">`.

## Testing (vitest, dev-only)

Add `vitest` + `"test": "vitest run"` script + minimal `vitest.config.ts` (node environment, `lib/**/*.test.ts`). Tests target only `lib/pendulum` (pure functions, no DOM):

1. **Small-angle period:** single pendulum, θ₀ = 0.01, RK4 dt = 1/240; measured half-period via zero crossings ≈ π√(r/g) within 0.1%.
2. **RK4 energy conservation:** double pendulum, chaotic IC (θ₁=θ₂=2 rad, rest), 60 s: |E(t) − E(0)| < 10⁻⁴ · E_scale throughout, where E_scale = (m₁+m₂)g(r₁+r₂). (Normalizing by |E(0)| is a trap — E(0) is exactly zero for release at (π/2, π/2).)
3. **Explicit Euler drifts:** same IC, 10 s: E(10 s) − E(0) > 1% of E_scale — documents the bug the post explains.
4. **Semi-implicit Euler bounded (two-part):** (a) on the *single* pendulum (separable, truly symplectic): θ₀ = 2 rad, 60 s, energy error < 3% of mgr — bounded oscillation, no trend; (b) on the double pendulum: same chaotic IC, 60 s, energy error < 1.0 · E_scale — the method is NOT symplectic here (θ-dependent mass matrix) and drifts ≈ 0.64·E_scale at dt = 1/240, so only the qualitative contrast with explicit Euler's runaway is asserted.
5. **Cross-check against the explicit formulas:** the myphysicslab closed-form accelerations (independently transcribed in the test file only) agree with the matrix-solve derivative to 10⁻¹⁰ relative across randomized states (the two derivations use different trig factorizations, so exact 10⁻¹² FP agreement isn't guaranteed) — two independent derivations, one truth.
6. **Flip boundary consistency:** for points with 2cos θ₁ + cos θ₂ > 1, rest energy < the minimum flip potential computed from the V function itself.

Interactive behavior is verified manually via the dev server (and the `verify` skill) — no DOM test infrastructure in this repo, not worth adding for one post.

## Performance & accessibility

- Every sim pauses when offscreen (IntersectionObserver) and when the tab is hidden (rAF stops naturally).
- ChaosTwins worst case: 50 pendulums × 240 RK4 steps/s × 4 evals — trivial (<1 ms/frame). Trails capped by length slider; stored as ring buffers.
- FlipFractal: worker pool + energy pruning + early exit on flip; Fast preset completes in a few seconds on a mid laptop, Fine shows a progress bar and streams rows incrementally. Main thread never simulates.
- Sliders/buttons are Radix/shadcn — keyboard accessible out of the box. Canvases get `role="img"` + `aria-label` describing the demo. Dragging is an enhancement, never the only way to set state (reset/nudge buttons + sliders cover it).
- `prefers-reduced-motion: reduce` → all demos start paused on a static frame; play affordance visible.

## Error handling

- Non-finite state (intentional in Euler panels at large dt): detect per step, freeze that panel with an "integration failed" overlay; never propagate NaN into drawing or charts.
- Worker construction failure (ancient browser, CSP): FlipFractal renders the analytic-boundary-only figure with a "your browser can't run the computation" note instead of a broken panel.
- Pointer math degeneracies (pointer exactly on pivot): guard atan2 inputs; clamp drag radius.

## Out of scope

Dark-mode enablement, MDX migration, syntax-highlighted code blocks, sharing the physics core beyond this post, mobile-app anything, SEO/OG plumbing beyond what the VAE post has.
