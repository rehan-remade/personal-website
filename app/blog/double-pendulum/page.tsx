/* eslint-disable react/no-unescaped-entities */
import 'katex/dist/katex.min.css'
import KatexSpan from '@/components/KatexSpan'
import Image from 'next/image'
import SinglePendulumDemo from '@/components/double-pendulum/SinglePendulumDemo'
import DoublePendulumSim from '@/components/double-pendulum/DoublePendulumSim'
import IntegratorShowdown from '@/components/double-pendulum/IntegratorShowdown'
import ChaosTwins from '@/components/double-pendulum/ChaosTwins'
import FlipFractal from '@/components/double-pendulum/FlipFractal'
import banner from '@/public/double-pendulum-banner.svg'

export default function DoublePendulumPost() {
  return (
    <>
      {/* Full-width hero section */}
      <div className="relative w-full h-[40vh] mb-16 mx-auto">
        <Image
          src={banner}
          alt="The traced path of a double pendulum, fanning out into chaos"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay content */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background">
          <div className="max-w-4xl mx-auto px-4 h-full flex flex-col justify-end pb-16">
            <h1 className="text-[64px] leading-tight font-semibold text-center md:text-[64px] text-3xl">
              My First Program Was Chaos
            </h1>
            <time
              dateTime="2026-07-07"
              className="text-muted-foreground mt-4 text-center block"
            >
              July 7, 2026
            </time>
          </div>
        </div>
      </div>
      <article className="container mx-auto px-4 py-8 prose prose-lg dark:prose-invert max-w-4xl prose-img:mx-auto prose-img:w-full">

        <p>
          The first program I ever wrote was a double pendulum simulation. Not hello world, not FizzBuzz —
          a chaotic mechanical system, integrated in real time, in a browser. That sounds far more impressive
          than it was. It was 2016, I had just discovered Daniel Shiffman's Coding Train, and{' '}
          <a href="https://thecodingtrain.com/challenges/93-double-pendulum" target="_blank" rel="noopener noreferrer">
            Coding Challenge #93
          </a>{' '}
          was a double pendulum in p5.js. I typed along, character for character, the way you copy out a recipe
          in a language you don't speak.
        </p>

        <p>
          The heart of that sketch was a pair of acceleration formulas that Shiffman — openly, cheerfully —
          pasted from{' '}
          <a href="https://www.myphysicslab.com/pendulum/double-pendulum-en.html" target="_blank" rel="noopener noreferrer">
            myphysicslab
          </a>
          . Two fractions so long they wrapped across several lines of code: sines of sums and differences of
          angles, squared velocities feeding back into one another, one denominator repeated under both like a
          chorus. I understood none of it. Not the thetas, not the omegas, not whether that denominator could
          ever reach zero and take the sketch down with it. The pendulum didn't care. It swung, it flipped, the second bob traced those
          looping, never-repeating ribbons, and I sat there completely hooked and slightly bothered.
        </p>

        <p>
          The bothered part never went away. I have been meaning to come back to this program for ten years,
          and this post is me finally doing it. This time we derive everything: the equations of motion from
          one principle and two energies, the reason the naive simulation explodes and the two-line accident
          that fixes it, what chaos means once you attach an actual number to it, and — last — a map of every
          possible double pendulum at once, which turns out to be a fractal. Every figure below is a live
          simulation. Drag them. That's what they're for.
        </p>

        <h2>One pendulum first</h2>

        <p>
          Before bolting two pendulums together, it pays to be honest about one. A single pendulum: a point
          mass <KatexSpan text="m" inline /> on a rigid, massless rod of length <KatexSpan text="r" inline />,
          swinging in a plane. One number pins down the entire configuration — the
          angle <KatexSpan text="\theta" inline /> from the vertical.
        </p>

        <figure className="my-8">
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
          <figcaption className="text-center mt-2 text-sm text-muted-foreground">
            <strong>Figure 1:</strong> The single pendulum. One coordinate, the angle <KatexSpan text="\theta" inline /> from
            the downward vertical, describes everything the system can do.
          </figcaption>
        </figure>

        <p>
          You could solve this the Newtonian way: draw the force diagram, decompose gravity along and across
          the rod, and carry the rod's tension around as a bookkeeping variable even though it does no work and
          exists purely to keep the mass on its circle. That works. It is also exactly the kind of accounting
          that turns miserable the moment a system grows joints. So instead we use the tool that was built for
          jointed things — the <strong>Lagrangian</strong>:
        </p>

        <KatexSpan text="L = T - V" className="my-4" />

        <p>
          kinetic energy minus potential energy, written in whatever coordinates genuinely describe the
          configuration. For us, that's <KatexSpan text="\theta" inline />. The equation of motion then comes
          from turning a single crank, the <strong>Euler–Lagrange equation</strong>:
        </p>

        <KatexSpan text="\frac{d}{dt}\!\left(\frac{\partial L}{\partial \dot{\theta}}\right) - \frac{\partial L}{\partial \theta} = 0" className="my-4" />

        <p>
          This is the condition for the trajectory to make the action — the time-integral
          of <KatexSpan text="L" inline /> — stationary, and any mechanics text will tell that story properly.
          What matters for this post is the practical superpower: <strong>constraint forces never appear</strong>.
          The tension does no work, so it shows up in neither <KatexSpan text="T" inline /> nor{' '}
          <KatexSpan text="V" inline />. And because we chose <KatexSpan text="\theta" inline /> as the
          coordinate, every motion we can even write down already keeps the mass on its circle. The constraint
          isn't enforced; it's built into the coordinate. Nothing to solve for, nothing to cancel.
        </p>

        <p>
          Now the two energies. The bob moves at speed <KatexSpan text="r\dot{\theta}" inline />, and —
          measuring <KatexSpan text="y" inline /> downward from the pivot, a convention that keeps signs tidy
          for the rest of this post — it hangs at depth <KatexSpan text="r\cos\theta" inline />:
        </p>

        <KatexSpan text="T = \tfrac{1}{2} m r^2 \dot{\theta}^2, \qquad V = -m g r \cos\theta" className="my-4" />

        <p>
          Feed these through the crank: <KatexSpan text="\partial L/\partial \dot{\theta} = m r^2 \dot{\theta}" inline />,
          differentiate that in time, subtract <KatexSpan text="\partial L/\partial \theta = -m g r \sin\theta" inline />:
        </p>

        <KatexSpan text="\frac{d}{dt}\left(m r^2 \dot{\theta}\right) + m g r \sin\theta = 0" className="my-4" />

        <p>and divide through by <KatexSpan text="m r^2" inline />:</p>

        <KatexSpan text="\ddot{\theta} = -\frac{g}{r} \sin\theta" className="my-4" />

        <p>
          Notice everything that didn't happen. No force diagram, no components, no tension. For one pendulum
          this saves five minutes. For two, it will save the whole derivation.
        </p>

        <p>
          At this point every textbook plays the same trick: assume the swing is small,
          replace <KatexSpan text="\sin\theta" inline /> with <KatexSpan text="\theta" inline />, and the
          equation collapses into a harmonic oscillator you can solve outright:
        </p>

        <KatexSpan text="\theta(t) \approx \theta_0 \cos(\omega t), \qquad \omega = \sqrt{g/r}, \qquad T_{\text{period}} = 2\pi\sqrt{r/g}" className="my-4" />

        <p>
          A beautiful, load-bearing lie. The period doesn't depend on the amplitude — approximately — which is
          why pendulum clocks ruled timekeeping for three centuries. But it is strictly small print. Swing
          higher and the true period stretches. Push past the small-angle regime and the exact solution stops
          being expressible in elementary functions at all: you need elliptic integrals for one rod on one
          pivot. Remember that — it matters in a minute. Meanwhile, here is an honest pendulum next to its
          small-angle ghost:
        </p>

        <figure className="my-8">
          <SinglePendulumDemo />
          <figcaption className="text-center mt-2 text-sm text-muted-foreground">
            <strong>Figure 2:</strong> A real pendulum against its own small-angle solution (the ghost). Drag
            the bob past 90° and let go: the ghost swings with the wrong, amplitude-blind period and falls a
            little further out of sync on every pass. The approximation is only good near the bottom.
          </figcaption>
        </figure>

        <h2>Now bolt a pendulum to your pendulum</h2>

        <p>
          Hang a second rod and mass from the first bob. That is the entire modification. The configuration
          now needs two angles, <KatexSpan text="\theta_1" inline /> and <KatexSpan text="\theta_2" inline />,
          both measured from the vertical:
        </p>

        <figure className="my-8">
          <svg viewBox="0 0 440 340" className="mx-auto w-full max-w-md" role="img" aria-label="Double pendulum diagram: rod of length r1 at angle theta1 from the vertical carrying mass m1, with a second rod of length r2 at angle theta2 carrying mass m2 hanging from the first bob">
            <line x1="170" y1="40" x2="270" y2="40" stroke="#171717" strokeWidth="2" />
            {Array.from({ length: 9 }, (_, i) => (
              <line key={i} x1={175 + i * 11} y1="40" x2={168 + i * 11} y2="28" stroke="#a3a3a3" strokeWidth="1.5" />
            ))}
            <line x1="220" y1="40" x2="220" y2="230" stroke="#a3a3a3" strokeWidth="1" strokeDasharray="5 5" />
            <line x1="307" y1="166" x2="307" y2="290" stroke="#a3a3a3" strokeWidth="1" strokeDasharray="5 5" />
            <line x1="220" y1="40" x2="307" y2="166" stroke="#171717" strokeWidth="2.5" />
            <line x1="307" y1="166" x2="398" y2="208" stroke="#171717" strokeWidth="2.5" />
            <path d="M 220 100 A 60 60 0 0 0 254 89" fill="none" stroke="#525252" strokeWidth="1.5" />
            <path d="M 307 221 A 55 55 0 0 0 357 189" fill="none" stroke="#525252" strokeWidth="1.5" />
            <circle cx="220" cy="40" r="4" fill="#171717" />
            <circle cx="307" cy="166" r="16" fill="#404040" stroke="#171717" strokeWidth="1.5" />
            <circle cx="398" cy="208" r="16" fill="#404040" stroke="#171717" strokeWidth="1.5" />
            <text x="230" y="122" fontSize="17" fontStyle="italic" fill="#404040">θ<tspan baselineShift="sub" fontSize="11">1</tspan></text>
            <text x="252" y="103" fontSize="15" fontStyle="italic" fill="#404040">r<tspan baselineShift="sub" fontSize="11">1</tspan></text>
            <text x="250" y="172" fontSize="17" fontStyle="italic" fill="#171717">m<tspan baselineShift="sub" fontSize="11">1</tspan></text>
            <text x="321" y="146" fontSize="14" fontStyle="italic" fill="#525252">(x<tspan baselineShift="sub" fontSize="10">1</tspan>, y<tspan baselineShift="sub" fontSize="10">1</tspan>)</text>
            <text x="318" y="246" fontSize="17" fontStyle="italic" fill="#404040">θ<tspan baselineShift="sub" fontSize="11">2</tspan></text>
            <text x="362" y="207" fontSize="15" fontStyle="italic" fill="#404040">r<tspan baselineShift="sub" fontSize="11">2</tspan></text>
            <text x="404" y="186" fontSize="17" fontStyle="italic" fill="#171717">m<tspan baselineShift="sub" fontSize="11">2</tspan></text>
            <text x="366" y="252" fontSize="14" fontStyle="italic" fill="#525252">(x<tspan baselineShift="sub" fontSize="10">2</tspan>, y<tspan baselineShift="sub" fontSize="10">2</tspan>)</text>
            <line x1="408" y1="70" x2="408" y2="120" stroke="#525252" strokeWidth="1.5" markerEnd="url(#arrow2)" />
            <defs>
              <marker id="arrow2" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                <path d="M 0 0 L 8 4 L 0 8 z" fill="#525252" />
              </marker>
            </defs>
            <text x="418" y="100" fontSize="15" fontStyle="italic" fill="#404040">g</text>
          </svg>
          <figcaption className="text-center mt-2 text-sm text-muted-foreground">
            <strong>Figure 3:</strong> The double pendulum. Two coordinates now — <KatexSpan text="\theta_1" inline /> and{' '}
            <KatexSpan text="\theta_2" inline />, each from its own vertical — and the second pivot rides on
            the first bob.
          </figcaption>
        </figure>

        <p>
          You are welcome to attempt the Newtonian route here. The tension in the second rod acts on both
          masses, along a direction that changes with both angles, while the first rod's tension responds to
          all of it at once — it's a classic exam problem precisely because the bookkeeping is punishing. The
          Lagrangian recipe doesn't flinch: same three steps, two coordinates. First, positions,
          with <KatexSpan text="y" inline /> still measured downward from the pivot:
        </p>

        <KatexSpan text="x_1 = r_1 \sin\theta_1, \qquad y_1 = r_1 \cos\theta_1" className="my-4" />

        <KatexSpan text="x_2 = x_1 + r_2 \sin\theta_2, \qquad y_2 = y_1 + r_2 \cos\theta_2" className="my-4" />

        <p>
          Bob 2 rides on bob 1: its position is bob 1's plus its own offset. That innocuous little sum is the
          whole story of this post. Differentiate in time, square, and add components to get speeds:
        </p>

        <KatexSpan text="v_1^2 = r_1^2 \dot{\theta}_1^2, \qquad v_2^2 = r_1^2 \dot{\theta}_1^2 + r_2^2 \dot{\theta}_2^2 + 2 r_1 r_2 \dot{\theta}_1 \dot{\theta}_2 \cos(\theta_1 - \theta_2)" className="my-4" />

        <p>
          There it is: the cross term. How much bob 2's motion feeds off bob 1's depends
          on <KatexSpan text="\cos(\theta_1 - \theta_2)" inline />, the alignment of the rods. Parallel rods
          add their velocities outright; perpendicular rods decouple; anti-parallel rods fight. Every ounce of
          trouble this system is about to cause traces back to that one cosine. The energies:
        </p>

        <KatexSpan text="T = \tfrac{1}{2} m_1 v_1^2 + \tfrac{1}{2} m_2 v_2^2, \qquad V = -(m_1 + m_2) g r_1 \cos\theta_1 - m_2 g r_2 \cos\theta_2" className="my-4" />

        <p>
          (Note the <KatexSpan text="m_1 + m_2" inline /> in the first potential term: rod 1 carries both
          masses, so tilting it lifts both.) Now the crank, turned twice — once
          with <KatexSpan text="\theta_1" inline /> as the coordinate, once
          with <KatexSpan text="\theta_2" inline />. This is ten minutes of careful product-rule work, because
          the cross term depends on both angles <em>and</em> both angular velocities,
          so <KatexSpan text="d/dt" inline /> keeps spawning <KatexSpan text="\sin(\theta_1 - \theta_2)" inline /> terms
          that then partially cancel against the ones from <KatexSpan text="\partial L/\partial \theta" inline />.
          If you want every intermediate line, Diego Assencio's derivation (linked below) writes them all out;
          I checked mine against his. Grouped and tidied, with the
          shorthand <KatexSpan text="\Delta = \theta_1 - \theta_2" inline />, the two Euler–Lagrange equations
          assemble into a single matrix statement:
        </p>

        <KatexSpan text="\begin{bmatrix} (m_1+m_2) r_1^2 & m_2 r_1 r_2 \cos\Delta \\ m_2 r_1 r_2 \cos\Delta & m_2 r_2^2 \end{bmatrix} \begin{bmatrix} \ddot{\theta}_1 \\ \ddot{\theta}_2 \end{bmatrix} = \begin{bmatrix} -m_2 r_1 r_2 \dot{\theta}_2^2 \sin\Delta - (m_1+m_2) g r_1 \sin\theta_1 \\ m_2 r_1 r_2 \dot{\theta}_1^2 \sin\Delta - m_2 g r_2 \sin\theta_2 \end{bmatrix}, \qquad \Delta = \theta_1 - \theta_2" className="my-4" />

        <p>
          Read it left to right: a mass matrix — how hard the configuration resists angular acceleration, and
          note that it depends on <KatexSpan text="\Delta" inline />, on where the pendulum currently <em>is</em> —
          times the accelerations, equals the applied torques: one centrifugal-flavored term from each bob's
          swing rate, plus gravity on each rod. It's Newton's second law wearing formal dress.
        </p>

        <p>
          To simulate, we need the accelerations by themselves, which means solving that 2×2 system. Do it
          symbolically — Cramer's rule, substitute, expand — and out come two towering fractions,
          full of <KatexSpan text="\sin(\theta_1 - 2\theta_2)" inline /> and{' '}
          <KatexSpan text="\cos(2\theta_1 - 2\theta_2)" inline />, with one denominator repeated under both.
          Those fractions are, character for character, the myphysicslab formulas I pasted into p5.js in 2016.
          The monsters were never monsters. They are this one tidy matrix equation, pre-solved by hand and
          flattened into ASCII. It took me ten years to find that out.
        </p>

        <p>
          Code doesn't need the flattened form — it just solves the little linear system numerically at every
          step. The only conceivable danger is that division: what if the determinant hits zero? It can't:
        </p>

        <KatexSpan text="\det M = m_2 r_1^2 r_2^2 \left(m_1 + m_2 \sin^2\Delta\right) > 0" className="my-4" />

        <p>
          Since <KatexSpan text="\sin^2\Delta \ge 0" inline />, the parenthesis is never smaller
          than <KatexSpan text="m_1" inline />, which is positive because rod 1 carries an actual mass. (This
          is no accident — <KatexSpan text="M" inline /> is the kinetic-energy metric, and kinetic energy is
          positive whenever anything moves.) The solve cannot blow up, for any angles, masses, or lengths.
          Which means we can safely hand it sliders:
        </p>

        <figure className="my-8">
          <DoublePendulumSim />
          <figcaption className="text-center mt-2 text-sm text-muted-foreground">
            <strong>Figure 4:</strong> The whole machine: the matrix equation above, solved and integrated
            live. Drag either bob to re-aim it, tune the masses, lengths and gravity, and watch the second bob
            draw. This is the sketch I copied in 2016, minus the mystery.
          </figcaption>
        </figure>

        <h2>Making it not explode</h2>

        <p>
          The matrix equation tells us the accelerations <em>right now</em>. A simulation needs the
          state <em>later</em>. Bridging that gap is numerical integration — and remember, even the single
          pendulum had no elementary closed-form solution, so numbers were always our destiny. The only
          question is how to step forward in time without lying too much. Pack the state into one vector:
        </p>

        <KatexSpan text="y = (\theta_1, \theta_2, \omega_1, \omega_2), \qquad \dot{y} = f(y)" className="my-4" />

        <p>
          where the <KatexSpan text="\omega" inline />s are angular velocities
          and <KatexSpan text="f" inline /> is everything we just derived: the rates of the angles are
          the <KatexSpan text="\omega" inline />s, and the rates of the <KatexSpan text="\omega" inline />s
          come from the matrix solve. Geometrically, <KatexSpan text="f" inline /> is a velocity field on the
          four-dimensional state space, and our pendulum's entire life is one streamline of it. An integrator
          hops along that streamline in steps of size <KatexSpan text="h" inline />. The obvious hop is{' '}
          <strong>explicit Euler</strong> — follow the tangent:
        </p>

        <KatexSpan text="y_{n+1} = y_n + h\, f(y_n)" className="my-4" />

        <p>
          For a pendulum this is slow-acting poison, and the reason is geometric. Swinging motion loops around
          a closed orbit in state space — a level curve of the energy. The tangent to a loop points to the
          outside of the loop, so every Euler step lands slightly outside the orbit it left. Always outside,
          never inside: the errors don't cancel, they compound, and the trajectory spirals outward. For the
          small-angle oscillator you can prove each step multiplies the energy
          by <KatexSpan text="1 + h^2\omega^2" inline /> — geometric growth. Your pendulum gains energy from
          nothing, every swing, until it's whipping around its pivot like a propeller.
        </p>

        <p>
          You can watch this exact failure in the original Coding Train video: left alone, the sketch's
          pendulum slowly swings itself higher than it was dropped from. And the fix that ended up in the
          code — the fix I faithfully copied without a second thought — was simply to update the
          velocity <em>first</em> and then move the position using the <em>new</em> velocity:
        </p>

        <KatexSpan text="\omega_{n+1} = \omega_n + h\, a(\theta_n, \omega_n), \qquad \theta_{n+1} = \theta_n + h\, \omega_{n+1}" className="my-4" />

        <p>
          Same arithmetic, same cost, two lines reordered. It looks like an off-by-one bug you decided to
          keep. It is actually a different algorithm with its own name — <strong>semi-implicit Euler</strong>,
          also sold as symplectic Euler — and a shockingly deep property: for systems whose energy separates
          cleanly into kinetic-of-velocity plus potential-of-position, like our single pendulum, it exactly
          conserves a slightly-perturbed "shadow" energy that sits within <KatexSpan text="O(h)" inline /> of
          the true one. It cannot drift. Its energy error just oscillates in a bounded band, forever. By
          swapping two lines of JavaScript, Shiffman reached — presumably by accident — for one of the deepest
          results in numerical analysis.
        </p>

        <p>
          Now the honesty footnote, because this is the detail everyone flattens: that ironclad guarantee is
          for <em>separable</em> systems, and the double pendulum is not one. The cross term ties kinetic
          energy to the angles — the mass matrix depends on <KatexSpan text="\theta" inline /> — and with
          that, the strict symplectic warranty is void. What survives in practice is still remarkable:
          semi-implicit Euler's energy error creeps — slowly, first-order slowly — instead of staying in a
          fixed band, but it never runs away exponentially the way explicit Euler's does. Downgraded from
          "bounded forever" to "drifts politely." You can see exactly that downgrade in the demo below.
        </p>

        <p>
          The third contender is the workhorse: classical fourth-order <strong>Runge–Kutta</strong>. Instead
          of committing to the slope at the start of the step, sample it four times — once at the start, twice
          at trial midpoints, once at a trial endpoint — and take a weighted blend:
        </p>

        <KatexSpan text="y_{n+1} = y_n + \tfrac{h}{6}\left(k_1 + 2k_2 + 2k_3 + k_4\right)" className="my-4" />

        <p>
          where <KatexSpan text="k_1, \dots, k_4" inline /> are those four slope samples, each evaluated where
          the previous one pointed. Fourth-order accuracy means halving <KatexSpan text="h" inline /> cuts the
          error sixteen-fold. RK4 knows nothing about energy — run it for geological time and it too will
          drift — but at the step sizes used here its drift is negligible, which is why every other simulation
          on this page runs on it. Here are all three on the same pendulum, at the same time step:
        </p>

        <figure className="my-8">
          <IntegratorShowdown />
          <figcaption className="text-center mt-2 text-sm text-muted-foreground">
            <strong>Figure 5:</strong> One initial condition, three integrators, one
            shared <KatexSpan text="\Delta t" inline />. The chart tracks energy error: explicit Euler (red)
            leaves almost immediately, semi-implicit Euler (teal) creeps, RK4 (dark blue) hugs zero. Raise{' '}
            <KatexSpan text="\Delta t" inline /> to make everyone worse.
          </figcaption>
        </figure>

        <h2>The part where it becomes chaos</h2>

        <p>
          Everything so far — the derivation, the integrators, the energy audit — is the orderly half of the
          story. Here is the disorderly half, the half that kept a copied p5.js sketch lodged in my head for a
          decade. The equations above are perfectly deterministic: no randomness, no hidden inputs. Given the
          state exactly, the entire future is fixed. And the system is still unpredictable — in a precise,
          quantifiable, non-hand-wavy sense.
        </p>

        <p>
          Run two copies of the pendulum, identical except for a nudge <KatexSpan text="\delta(0)" inline /> in
          one angle — the kind of nudge a rounding error in the seventh decimal place would give you. Track the
          distance between them in state space. In the systems physics students are raised on, that distance
          grows politely: linearly, maybe quadratically. Here, it grows like this:
        </p>

        <KatexSpan text="\lVert \delta(t) \rVert \approx \lVert \delta(0) \rVert\, e^{\lambda t}" className="my-4" />

        <p>
          Exponentially — with <KatexSpan text="\lambda" inline />, the <strong>Lyapunov exponent</strong>, as
          the system's built-in error-amplification rate: <KatexSpan text="1/\lambda" inline /> is the time it
          takes an uncertainty to grow by a factor of <KatexSpan text="e" inline />. On a log scale,
          exponential growth is a straight line, and you can watch that line draw itself in the demo below —
          a steady climb at slope <KatexSpan text="\lambda" inline />, until the separation saturates because
          two pendulums can only get so far apart.
        </p>

        <p>
          The consequence for prediction is brutal, and worth spelling out. Say you measure the initial state
          to some precision, and your forecast counts as good while the error stays under some tolerance. Then
          your horizon is
        </p>

        <KatexSpan text="t_{\text{horizon}} \sim \frac{1}{\lambda} \ln\!\frac{\text{tolerance}}{\text{precision}}" className="my-4" />

        <p>
          The logarithm is the villain. Measure a <em>thousand</em> times more precisely and the horizon grows
          by <KatexSpan text="\ln 1000 \approx 7" inline /> units of <KatexSpan text="1/\lambda" inline /> — a
          fixed few seconds for this pendulum, not a thousand times longer. Every additional digit of precision
          buys the same flat, modest increment of future. Determinism survives; prediction doesn't.
        </p>

        <p>
          None of this is a pendulum quirk. Edward Lorenz met the same mathematics in the early 1960s in a
          stripped-down weather model, when a run restarted from printout values — rounded to three decimal
          places — invented an entirely different month of weather. That same logarithm is why forecasts stall
          out around two weeks no matter how good the satellites get: the atmosphere's{' '}
          <KatexSpan text="1/\lambda" inline /> is a few days, and better data only ever buys logarithmically
          more horizon.
        </p>

        <figure className="my-8">
          <ChaosTwins />
          <figcaption className="text-center mt-2 text-sm text-muted-foreground">
            <strong>Figure 6:</strong> Twenty pendulums released together, adjacent starts{' '}
            <KatexSpan text="10^{-7}" inline /> radians apart — far below anything a pixel could show. The
            chart tracks the separation between the first and last on a log scale: the straight-line climb
            is <KatexSpan text="e^{\lambda t}" inline /> in person.
          </figcaption>
        </figure>

        <h2>Every possible pendulum at once</h2>

        <p>
          Figure 6 asks about one pendulum and its nearest neighbors. The natural escalation is to ask
          about <em>all</em> of them. Fix the setup — equal masses and equal
          lengths, <KatexSpan text="m_1 = m_2 = m,\; r_1 = r_2 = l" inline />, released from rest — so that a
          starting condition is nothing but a pair of angles <KatexSpan text="(\theta_1, \theta_2)" inline />.
          Then ask every start the same question, Jeremy Heyl's question: <em>how long until your second bob
          flips over the top?</em> Color each pixel of the angle–angle plane by its answer, and you get the map
          in Figure 7 — my favorite picture in this entire subject.
        </p>

        <p>
          Before simulating tens of thousands of pendulums, though, theory gets one more word, and it's a good
          one. Released from rest, the kinetic energy is zero, so the total energy is the starting potential:
        </p>

        <KatexSpan text="E = -mgl\,(2\cos\theta_1 + \cos\theta_2)" className="my-4" />

        <p>
          (the 2 because rod 1 carries both masses). To flip, the pendulum must at some instant pass through a
          configuration with the second bob over the top, <KatexSpan text="\theta_2 = \pi" inline />. Among all
          such configurations, the cheapest has bob 1 hanging straight
          down — <KatexSpan text="\theta_1 = 0" inline /> — with
          potential <KatexSpan text="-mgl\,(2 - 1) = -mgl" inline />. Energy is conserved and kinetic energy
          can't go negative, so if <KatexSpan text="E < -mgl" inline />, every flipped configuration is out of
          reach. Forever. Unpacking the inequality:
        </p>

        <KatexSpan text="V_{\text{flip}}^{\min} = -mgl \quad\Rightarrow\quad \text{no flip possible while } 2\cos\theta_1 + \cos\theta_2 > 1" className="my-4" />

        <p>
          Four lines of energy bookkeeping just proved a theorem about eternity: a pendulum released
          with <KatexSpan text="2\cos\theta_1 + \cos\theta_2 > 1" inline /> — both rods hanging low — will
          never flip, no matter how long you wait. (You'll often see this
          quoted as <KatexSpan text="3\cos\theta_1 + \cos\theta_2 > 2" inline />; that is the identical
          argument run for a <em>compound</em> pendulum built from uniform bars — Heyl's version — where the
          distributed mass shifts the coefficients.)
        </p>

        <p>
          On the map below, that inequality is the black curve, and the pale region inside it is painted
          without simulating a single step. Outside it, chaos speaks: solid basins where the pendulum flips
          almost immediately, and — hugging the boundary — filigree where neighboring pixels flip after wildly
          different times, structure inside structure as far down as you care to zoom. That's Figure 6 restated
          as geography: near the boundary, "arbitrarily close starts, arbitrarily different fates" stops being
          a warning label and becomes a texture.
        </p>

        <p>
          The theorem is also a computational free lunch. A pixel that
          never flips is the most expensive pixel there is — it burns the entire budget, thirty simulated
          seconds at 120 RK4 steps per second, just to answer "never" — and the inequality hands us about
          thirty percent of the map, precisely the pixels that would have cost the most, for free. Theory does
          the heavy lifting; the worker threads mop up.
        </p>

        <figure className="my-8">
          <FlipFractal />
          <figcaption className="text-center mt-2 text-sm text-muted-foreground">
            <strong>Figure 7:</strong> The flip-time map, computed live in your browser. Each pixel is a
            pendulum released from rest at <KatexSpan text="(\theta_1, \theta_2)" inline />, colored by how
            long its second bob takes to flip; light gray pixels never flipped within the budget, and the
            near-white region inside the black curve provably never will. Click anywhere on the map to fly
            that pixel's pendulum.
          </figcaption>
        </figure>

        <p>
          Here's the part that gets me, ten years later. The 2016 sketch and this entire page run on the same
          hundred-ish lines of physics. The matrix solve driving every figure above <em>is</em> the
          myphysicslab formulas, un-flattened; the integrators are the same handful of additions and
          multiplications, ordered with intent. Nothing became more powerful. What changed is that every line
          is now load-bearing: I know why there's a <KatexSpan text="\cos(\theta_1 - \theta_2)" inline /> in
          the kinetic energy, why the denominator that worried me can never reach zero, why swapping two
          updates tamed the energy drift, and why that trick's warranty quietly expired the moment we attached
          the second rod. The incantation became an argument.
        </p>

        <p>
          If you have a formula like that — one you've been copying since before you could read it, someone
          else's variable names fossilized inside it — I can report that going back for it is worth the trip.
          Mine took ten years and turned into the five toys on this page. Scroll back up and drag the pendulums
          around one more time. That's still the whole point.
        </p>

        <h3>References</h3>

        <ul>
          <li>
            <a href="https://thecodingtrain.com/challenges/93-double-pendulum" target="_blank" rel="noopener noreferrer">
              Daniel Shiffman, The Coding Train — Coding Challenge #93: Double Pendulum.
            </a>{' '}
            Where all of this started.
          </li>
          <li>
            <a href="https://www.myphysicslab.com/pendulum/double-pendulum-en.html" target="_blank" rel="noopener noreferrer">
              myphysicslab — Double Pendulum.
            </a>{' '}
            The hand-solved equations of motion I pasted in 2016, with their own full derivation.
          </li>
          <li>
            <a href="https://natureofcode.com/" target="_blank" rel="noopener noreferrer">
              Daniel Shiffman — The Nature of Code.
            </a>{' '}
            The book-length version of the sensibility that this post grew from.
          </li>
          <li>
            <a href="https://dassencio.org/33" target="_blank" rel="noopener noreferrer">
              Diego Assencio — Double pendulum: Lagrangian formulation.
            </a>{' '}
            Every intermediate step of the derivation, written out.
          </li>
          <li>
            <a href="https://www.famaf.unc.edu.ar/~vmarconi/fiscomp/Double.pdf" target="_blank" rel="noopener noreferrer">
              Jeremy S. Heyl — The Double Pendulum Fractal (2008).
            </a>{' '}
            The flip-time map, for the compound (uniform-bar) pendulum. PDF mirror; the original UBC page has
            gone offline.
          </li>
          <li>
            <a href="https://github.com/rehan-remade/personal-website" target="_blank" rel="noopener noreferrer">
              Source code for this post.
            </a>{' '}
            The physics core, the integrators, and all five demos live in this site's repository.
          </li>
        </ul>

      </article>
    </>
  )
}
