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
