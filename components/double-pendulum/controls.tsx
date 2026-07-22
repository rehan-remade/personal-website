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
