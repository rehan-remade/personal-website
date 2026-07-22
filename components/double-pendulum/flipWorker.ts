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
