// TEMPORARY dev harness for the double pendulum demos. Deleted in Task 11.
import SinglePendulumDemo from '@/components/double-pendulum/SinglePendulumDemo'
import DoublePendulumSim from '@/components/double-pendulum/DoublePendulumSim'
import IntegratorShowdown from '@/components/double-pendulum/IntegratorShowdown'
import ChaosTwins from '@/components/double-pendulum/ChaosTwins'

export default function PendulumDevPage() {
  return (
    <main className="container mx-auto max-w-4xl space-y-12 px-4 py-24">
      <h1 className="text-2xl font-bold">Pendulum demo harness</h1>
      {/* Demos are appended here as they are built (Tasks 5–9). */}
      <SinglePendulumDemo />
      <DoublePendulumSim />
      <IntegratorShowdown />
      <ChaosTwins />
    </main>
  )
}
