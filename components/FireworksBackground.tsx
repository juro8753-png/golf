'use client'

import { useEffect, useRef } from 'react'

const GOLD = ['#ffd700', '#f4c64a', '#ffd76a', '#ffb347', '#ffa500']

interface Rocket {
  x: number; y: number
  tx: number; ty: number
  vy: number
  trail: Array<{ x: number; y: number }>
}

interface Spark {
  x: number; y: number
  vx: number; vy: number
  life: number; age: number
  color: string; size: number; glow: boolean
}

interface Star {
  x: number; y: number
  r: number; p: number; s: number
}

export default function FireworksBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rand = (a: number, b: number) => a + Math.random() * (b - a)

    const rockets: Rocket[] = []
    const sparks: Spark[] = []
    let stars: Star[] = []
    let frameId: number
    let t = 0

    const init = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const W = canvas.offsetWidth || window.innerWidth
      const H = canvas.offsetHeight || window.innerHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)

      stars = Array.from({ length: 38 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H * 0.75,
        r: Math.random() * 1.3 + 0.3,
        p: Math.random() * Math.PI * 2,
        s: Math.random() * 0.04 + 0.01,
      }))
    }

    const launch = () => {
      const W = canvas.offsetWidth || window.innerWidth
      const H = canvas.offsetHeight || window.innerHeight
      rockets.push({
        x: rand(W * 0.15, W * 0.85),
        y: H + 10,
        tx: rand(W * 0.15, W * 0.85),
        ty: rand(-H * 0.05, H * 0.12),
        vy: rand(-10, -8),
        trail: [],
      })
    }

    const explode = (x: number, y: number) => {
      const n = Math.floor(rand(46, 72))
      const speed = rand(1.5, 2.9)
      const ring = Math.random() < 0.4
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + rand(-0.05, 0.05)
        const sp = ring ? speed : speed * rand(0.35, 1)
        sparks.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: rand(64, 104),
          age: 0,
          color: GOLD[Math.floor(Math.random() * GOLD.length)],
          size: rand(1.2, 2.4),
          glow: Math.random() < 0.3,
        })
      }
    }

    const tick = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) { frameId = requestAnimationFrame(tick); return }

      const W = canvas.offsetWidth || window.innerWidth
      const H = canvas.offsetHeight || window.innerHeight

      t++

      // 잔상 페이드 (source-over 로 반투명 덮기)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.fillStyle = 'rgba(13,7,25,0.22)'
      ctx.fillRect(0, 0, W, H)

      // 발광 합성 (lighter)
      ctx.globalCompositeOperation = 'lighter'

      // 별
      for (const s of stars) {
        s.p += s.s
        const tw = (Math.sin(s.p) + 1) / 2
        ctx.beginPath()
        ctx.fillStyle = `rgba(255,240,200,${(0.15 + tw * 0.55).toFixed(2)})`
        ctx.arc(s.x, s.y, s.r * (0.6 + tw * 0.7), 0, Math.PI * 2)
        ctx.fill()
      }

      // 로켓 자동 발사
      if (t % 52 === 0) launch()
      if (t % 150 === 0) { launch(); launch() }

      // 로켓
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i]
        r.x += (r.tx - r.x) * 0.03
        r.y += r.vy
        r.vy += 0.055
        r.trail.push({ x: r.x, y: r.y })
        if (r.trail.length > 9) r.trail.shift()

        for (let j = 0; j < r.trail.length; j++) {
          const p = r.trail[j]
          ctx.beginPath()
          ctx.fillStyle = `rgba(255,225,150,${((j / r.trail.length) * 0.7).toFixed(2)})`
          ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2)
          ctx.fill()
        }

        if (r.y <= r.ty || r.vy >= 0) {
          explode(r.x, r.y)
          rockets.splice(i, 1)
        }
      }

      // 스파크
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i]
        p.age++
        p.x += p.vx; p.y += p.vy
        p.vy += 0.03; p.vx *= 0.99; p.vy *= 0.99
        const k = 1 - p.age / p.life
        if (k <= 0) { sparks.splice(i, 1); continue }

        ctx.beginPath()
        ctx.globalAlpha = Math.max(0, k)
        ctx.fillStyle = p.color
        ctx.arc(p.x, p.y, p.size * (p.glow ? 1.6 : 1), 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }

      ctx.globalCompositeOperation = 'source-over'
      frameId = requestAnimationFrame(tick)
    }

    setTimeout(() => {
      init()
      tick()
    }, 50)

    const onResize = () => init()
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
