'use client'

import { useEffect, useRef } from 'react'

interface Rocket {
  x: number; y: number
  vy: number; targetY: number
  color: string
  trail: Array<{ x: number; y: number }>
}

interface Particle {
  x: number; y: number
  vx: number; vy: number
  color: string; opacity: number
  size: number; glow: number
  fadeSpeed: number
}

const FIREWORK_COLORS = [
  '#FF2222', '#FF6600', '#FFD700', '#FFFF00',
  '#00FFAA', '#00CCFF', '#AA44FF', '#FF44CC',
  '#FF88BB', '#FFFFFF',
]
const GOLD_COLORS = ['#FFD700', '#FFA500', '#FFEC8B', '#FFB300', '#FFE066']

export default function FireworksBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const setSize = () => {
      canvas.width = canvas.offsetWidth || window.innerWidth
      canvas.height = canvas.offsetHeight || window.innerHeight
    }
    setTimeout(setSize, 50)
    window.addEventListener('resize', setSize)

    const rockets: Rocket[] = []
    const particles: Particle[] = []

    const W = () => canvas.width
    const H = () => canvas.height

    const launchRocket = () => {
      rockets.push({
        x: W() * (0.12 + Math.random() * 0.76),
        y: H(),
        vy: -(15 + Math.random() * 9),
        targetY: H() * (0.06 + Math.random() * 0.44),
        color: FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)],
        trail: [],
      })
    }

    const explode = (x: number, y: number, color: string) => {
      const count = 90 + Math.floor(Math.random() * 40)
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.35
        const isBig = Math.random() < 0.15
        const speed = isBig ? 1 + Math.random() * 2.5 : 1.5 + Math.random() * 6
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: Math.random() > 0.3 ? color : GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)],
          opacity: 1,
          size: isBig ? 4.5 + Math.random() * 4 : 0.8 + Math.random() * 2.5,
          glow: isBig ? 22 : 8,
          fadeSpeed: isBig ? 0.009 : 0.015,
        })
      }
    }

    let lastLaunch = 0
    let frameId: number

    const animate = (now: number) => {
      const ctx = canvas.getContext('2d')
      if (!ctx) { frameId = requestAnimationFrame(animate); return }

      ctx.clearRect(0, 0, W(), H())

      // 로켓 발사
      if (now - lastLaunch > 1400 + Math.random() * 900) {
        launchRocket()
        if (Math.random() > 0.4) setTimeout(launchRocket, 220)
        lastLaunch = now
      }

      // 로켓 그리기
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i]
        r.trail.push({ x: r.x, y: r.y })
        if (r.trail.length > 14) r.trail.shift()
        r.y += r.vy
        r.vy += 0.28

        for (let t = 0; t < r.trail.length; t++) {
          const pt = r.trail[t]
          const frac = t / r.trail.length
          ctx.beginPath()
          ctx.arc(pt.x, pt.y, 2.5 * frac, 0, Math.PI * 2)
          ctx.fillStyle = r.color
          ctx.globalAlpha = frac * 0.9
          ctx.shadowColor = r.color
          ctx.shadowBlur = 10 * frac
          ctx.fill()
        }
        ctx.globalAlpha = 1
        ctx.shadowBlur = 0

        ctx.beginPath()
        ctx.arc(r.x, r.y, 5, 0, Math.PI * 2)
        ctx.fillStyle = r.color
        ctx.shadowColor = r.color
        ctx.shadowBlur = 22
        ctx.globalAlpha = 0.7
        ctx.fill()

        ctx.beginPath()
        ctx.arc(r.x, r.y, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = '#FFFFFF'
        ctx.shadowColor = '#FFFFFF'
        ctx.shadowBlur = 10
        ctx.globalAlpha = 1
        ctx.fill()
        ctx.shadowBlur = 0

        if (r.y <= r.targetY || r.vy >= 0) {
          explode(r.x, r.y, r.color)
          rockets.splice(i, 1)
        }
      }

      // 파티클 그리기
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.07
        p.vx *= 0.99
        p.opacity -= p.fadeSpeed
        if (p.opacity <= 0) { particles.splice(i, 1); continue }

        // 외부 글로우
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity * 0.2
        ctx.shadowColor = p.color
        ctx.shadowBlur = p.glow * 1.5
        ctx.fill()

        // 코어
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.size > 4 ? '#FFFFFF' : p.color
        ctx.globalAlpha = p.opacity
        ctx.shadowColor = p.color
        ctx.shadowBlur = p.glow
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0

      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', setSize)
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
