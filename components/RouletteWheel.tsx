'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Prize, SpinResponse } from '@/types'
import { soundEngine } from '@/lib/sounds'
import { getSavedTheme, WHEEL_THEMES, THEME_STORAGE_KEY, type WheelThemeConfig } from '@/lib/wheel-themes'
import { getEffectiveLimit, LIMITS_STORAGE_KEY } from '@/lib/daily-limits'

function getKSTToday(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

interface Props {
  prizes: Prize[]
  onSpinComplete: () => void
}

interface ConfettiParticle {
  x: number; y: number
  vx: number; vy: number
  color: string; size: number
  rotation: number; rotationSpeed: number
  opacity: number
}

const SPIN_DURATION = 5000
const MIN_ROTATIONS = 8

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

export default function RouletteWheel({ prizes, onSpinComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null)
  const confettiAnimRef = useRef<number>()
  const rotationRef = useRef(0)
  const animFrameRef = useRef<number>()
  const lastTickSegRef = useRef(-1)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<SpinResponse | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [theme, setTheme] = useState<WheelThemeConfig>(WHEEL_THEMES.fortune_gold)
  const [todayCount, setTodayCount] = useState(0)
  const [limitToast, setLimitToast] = useState(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const router = useRouter()

  // 테마 변경 감지
  useEffect(() => {
    setTheme(WHEEL_THEMES[getSavedTheme()])
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) setTheme(WHEEL_THEMES[getSavedTheme()])
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // 오늘 참여 횟수 조회
  useEffect(() => {
    fetch('/api/today-count')
      .then(r => r.json())
      .then(data => setTodayCount(data.count ?? 0))
      .catch(() => {})
  }, [])

  const drawWheel = useCallback(
    (rotation: number) => {
      const canvas = canvasRef.current
      if (!canvas || prizes.length === 0) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const size = canvas.clientWidth || canvas.width
      const cx = size / 2
      const cy = size / 2
      const radius = cx - 28
      const n = prizes.length
      const segAngle = (2 * Math.PI) / n
      const th = theme

      ctx.clearRect(0, 0, size, size)

      // 외부 원형 테두리
      ctx.beginPath()
      ctx.arc(cx, cy, radius + 14, 0, 2 * Math.PI)
      ctx.fillStyle = th.rimFill
      ctx.fill()

      // 림 링
      if (th.rimRingColor !== 'none') {
        if (th.neonGlow) {
          // 네온 멀티 레이어 글로우 링
          ctx.beginPath()
          ctx.arc(cx, cy, radius + 14, 0, 2 * Math.PI)
          ctx.shadowColor = th.rimRingColor
          ctx.shadowBlur = 50
          ctx.strokeStyle = th.rimRingColor
          ctx.lineWidth = 6
          ctx.stroke()

          ctx.beginPath()
          ctx.arc(cx, cy, radius + 14, 0, 2 * Math.PI)
          ctx.shadowColor = '#ff80ff'
          ctx.shadowBlur = 20
          ctx.strokeStyle = '#cc60ff'
          ctx.lineWidth = 3
          ctx.stroke()

          ctx.beginPath()
          ctx.arc(cx, cy, radius + 14, 0, 2 * Math.PI)
          ctx.shadowColor = '#ffffff'
          ctx.shadowBlur = 8
          ctx.strokeStyle = 'rgba(255,255,255,0.85)'
          ctx.lineWidth = 1.2
          ctx.stroke()

          ctx.shadowBlur = 0
        } else {
          ctx.beginPath()
          ctx.arc(cx, cy, radius + 14, 0, 2 * Math.PI)
          ctx.strokeStyle = th.rimRingColor
          ctx.lineWidth = 5
          ctx.stroke()
        }
      }

      // 세그먼트
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rotation)

      prizes.forEach((prize, i) => {
        const startAngle = -Math.PI / 2 - segAngle / 2 + i * segAngle
        const endAngle = startAngle + segAngle

        const segFill = th.useCustomSegColors
          ? prize.color
          : i % 2 === 0 ? th.segEvenFill : th.segOddFill
        const segText = th.useCustomSegColors
          ? '#ffffff'
          : i % 2 === 0 ? th.segEvenText : th.segOddText

        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.arc(0, 0, radius, startAngle, endAngle)
        ctx.closePath()
        if (th.segGradient) {
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
          if (i % 2 === 0) {
            grad.addColorStop(0,    '#FFFFFF')
            grad.addColorStop(0.7,  '#FFFDF5')
            grad.addColorStop(0.9,  '#FFF0C0')
            grad.addColorStop(1,    '#C8A050')
          } else {
            grad.addColorStop(0,    '#FF9898')
            grad.addColorStop(0.7,  '#FF6060')
            grad.addColorStop(0.9,  '#DD2020')
            grad.addColorStop(1,    '#8B1010')
          }
          ctx.fillStyle = grad
        } else {
          ctx.fillStyle = segFill
        }
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.arc(0, 0, radius, startAngle, endAngle)
        ctx.closePath()
        ctx.strokeStyle = th.dividerColor
        ctx.lineWidth = th.dividerWidth
        ctx.stroke()

        ctx.save()
        ctx.rotate(startAngle + segAngle / 2)
        const fontSize = Math.max(12, Math.min(22, radius * 0.14))
        ctx.font = `bold ${fontSize}px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.shadowBlur = 0
        ctx.shadowColor = 'transparent'
        ctx.fillStyle = segText
        ctx.fillText(prize.name, radius * 0.6, 0)
        ctx.restore()
      })

      ctx.restore()

      // LED 전구 (외부 링)
      const numBulbs = 32
      const bulbDist = radius + 7
      const phase = Math.floor(Date.now() / 180)
      for (let i = 0; i < numBulbs; i++) {
        const angle = -Math.PI / 2 + (i / numBulbs) * 2 * Math.PI
        const bx = cx + bulbDist * Math.cos(angle)
        const by = cy + bulbDist * Math.sin(angle)
        const isOn = (i + phase) % 2 === 0

        ctx.beginPath()
        ctx.arc(bx, by, 4.5, 0, 2 * Math.PI)
        if (isOn) {
          ctx.shadowColor = th.bulbGlowColor
          ctx.shadowBlur = th.neonGlow ? 28 : 16
          const grd = ctx.createRadialGradient(bx - 1, by - 1, 0, bx, by, 4.5)
          grd.addColorStop(0, '#FFFFFF')
          grd.addColorStop(0.4, th.bulbOnColor)
          grd.addColorStop(1, th.bulbOnColor)
          ctx.fillStyle = grd
        } else {
          ctx.shadowBlur = 0
          ctx.fillStyle = th.bulbOffColor
        }
        ctx.fill()
      }
      ctx.shadowBlur = 0

      // 중심 원
      if (th.hubPulse) {
        const HUB_R = 22
        const numSlices = 240

        // 단색 크림/아이보리
        ctx.beginPath()
        ctx.arc(cx, cy, HUB_R, 0, 2 * Math.PI)
        ctx.fillStyle = '#FFFFF0'
        ctx.fill()

        // 가장자리 어두워지는 오버레이
        const edgeDark = ctx.createRadialGradient(cx, cy, HUB_R * 0.55, cx, cy, HUB_R)
        edgeDark.addColorStop(0, 'rgba(0,0,0,0)')
        edgeDark.addColorStop(1, 'rgba(0,0,0,0.15)')
        ctx.beginPath()
        ctx.arc(cx, cy, HUB_R, 0, 2 * Math.PI)
        ctx.fillStyle = edgeDark
        ctx.fill()

        // 안쪽 테마 대표색 링
        ctx.beginPath()
        ctx.arc(cx, cy, HUB_R - 3, 0, 2 * Math.PI)
        ctx.strokeStyle = th.bulbOnColor
        ctx.lineWidth = 2
        ctx.stroke()

        // 바깥 골드 테두리
        ctx.beginPath()
        ctx.arc(cx, cy, HUB_R, 0, 2 * Math.PI)
        ctx.strokeStyle = '#D4A020'
        ctx.lineWidth = 2.5
        ctx.stroke()

      } else {
        if (th.neonGlow) {
          ctx.beginPath()
          ctx.arc(cx, cy, 24, 0, 2 * Math.PI)
          ctx.shadowColor = th.hubInnerStroke
          ctx.shadowBlur = 25
          ctx.strokeStyle = th.hubInnerStroke
          ctx.lineWidth = 3
          ctx.stroke()
          ctx.shadowBlur = 0
        }
        ctx.beginPath()
        ctx.arc(cx, cy, 22, 0, 2 * Math.PI)
        ctx.fillStyle = th.hubOuterFill
        ctx.fill()
        ctx.strokeStyle = th.hubInnerStroke
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(cx, cy, 8, 0, 2 * Math.PI)
        ctx.fillStyle = th.hubInnerFill
        ctx.fill()
      }

      // 허브 시인 — 쉬지 않고 우↔좌 왔다갔다 (코사인 파형)
      {
        const HR    = 22
        const GHALF = HR * 2.5
        const CYCLE = 2.0   // 왕복 1사이클 (초)
        const pos   = Math.cos((Date.now() / 1000) * Math.PI * 2 / CYCLE)
        const sx    = cx + HR * 1.5 * pos   // 우(+)↔좌(-) 연속 진동
        const a     = 15 * Math.PI / 180
        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, HR, 0, 2 * Math.PI)
        ctx.clip()
        const sg = ctx.createLinearGradient(
          sx - Math.cos(a) * GHALF, cy + Math.sin(a) * GHALF,
          sx + Math.cos(a) * GHALF, cy - Math.sin(a) * GHALF
        )
        sg.addColorStop(0,    'rgba(255,255,255,0)')
        sg.addColorStop(0.38, 'rgba(255,255,255,0)')
        sg.addColorStop(0.50, 'rgba(255,255,255,0.82)')
        sg.addColorStop(0.62, 'rgba(255,255,255,0)')
        sg.addColorStop(1,    'rgba(255,255,255,0)')
        ctx.fillStyle = sg
        ctx.fillRect(cx - GHALF, cy - GHALF, GHALF * 2, GHALF * 2)
        ctx.restore()
      }

      // 허브 깜빡임 + 작은 스파클 2개
      {
        const HR  = 22
        const now = Date.now() / 1000
        // 불규칙한 다중 주파수 합산 → 허브 전체 깜빡임
        const s = Math.sin(now * 3.1)        * 0.40
                + Math.sin(now * 5.7 + 1.2)  * 0.25
                + Math.sin(now * 1.8 + 2.4)  * 0.15
                + 0.55
        const alpha = Math.max(0, Math.min(1, s)) * 0.55

        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, HR, 0, 2 * Math.PI)
        ctx.clip()

        // 허브 전체 깜빡임 글로우 (흰색 유지 — 배경색 안 바뀜)
        const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, HR)
        rg.addColorStop(0,    `rgba(255,255,255,${alpha.toFixed(3)})`)
        rg.addColorStop(0.65, `rgba(255,255,210,${(alpha * 0.65).toFixed(3)})`)
        rg.addColorStop(1,    `rgba(255,245,160,${(alpha * 0.28).toFixed(3)})`)
        ctx.fillStyle = rg
        ctx.fillRect(cx - HR, cy - HR, HR * 2, HR * 2)

        // 작은 스파클 2개 (황금색)
        ctx.lineCap = 'round'
        for (const sp of [
          { dx: -7, dy: -5, f: 5.2, ph: 0.0 },
          { dx:  6, dy:  6, f: 4.0, ph: 1.8 },
        ]) {
          const v = Math.sin(now * sp.f + sp.ph)
          if (v < 0.60) continue
          const sa = (v - 0.60) / 0.40
          const sz = 0.8 + sa * 2.5
          ctx.globalAlpha = sa * 0.85
          ctx.strokeStyle = '#FFD700'
          ctx.lineWidth   = 1.0
          ctx.beginPath()
          ctx.moveTo(cx + sp.dx - sz, cy + sp.dy)
          ctx.lineTo(cx + sp.dx + sz, cy + sp.dy)
          ctx.moveTo(cx + sp.dx,      cy + sp.dy - sz)
          ctx.lineTo(cx + sp.dx,      cy + sp.dy + sz)
          ctx.stroke()
        }
        ctx.restore()
      }
    },
    [prizes, theme]
  )

  // 캔버스 크기 설정
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const displaySize = Math.min(window.innerWidth * 0.90, 480)
    canvas.width = displaySize * dpr
    canvas.height = displaySize * dpr
    canvas.style.width = `${displaySize}px`
    canvas.style.height = `${displaySize}px`
    const ctx = canvas.getContext('2d')
    ctx?.scale(dpr, dpr)
    drawWheel(rotationRef.current)
  }, [prizes, drawWheel])

  // 비회전 상태에서 LED 깜빡임을 위한 idle 루프
  useEffect(() => {
    if (spinning) return
    let frameId: number
    const loop = () => {
      drawWheel(rotationRef.current)
      frameId = requestAnimationFrame(loop)
    }
    frameId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameId)
  }, [spinning, drawWheel])

  // 컨페티 시작
  const startConfetti = useCallback(() => {
    const canvas = confettiCanvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = ['#FF4444', '#44FF88', '#4488FF', '#FFEE00', '#FF44FF', '#44FFFF', '#FF8800', '#FF69B4', '#00FA9A', '#FFD700']
    const particles: ConfettiParticle[] = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 6,
      vy: 3 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 7 + Math.random() * 9,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 14,
      opacity: 1,
    }))

    if (confettiAnimRef.current) cancelAnimationFrame(confettiAnimRef.current)

    const animate = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let hasActive = false
      for (const p of particles) {
        if (p.opacity <= 0) continue
        hasActive = true
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotationSpeed
        p.vy += 0.08
        if (p.y > canvas.height * 0.75) p.opacity -= 0.022

        ctx.save()
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.55)
        ctx.restore()
      }

      if (hasActive) {
        confettiAnimRef.current = requestAnimationFrame(animate)
      } else {
        setShowConfetti(false)
      }
    }

    setShowConfetti(true)
    confettiAnimRef.current = requestAnimationFrame(animate)
  }, [])

  const spin = async () => {
    if (spinning || prizes.length === 0) return

    const limit = getEffectiveLimit(getKSTToday())
    if (limit !== null && todayCount >= limit) {
      setLimitToast(false)
      requestAnimationFrame(() => setLimitToast(true))
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = setTimeout(() => setLimitToast(false), 2500)
      return
    }

    setSpinning(true)
    setShowModal(false)

    let spinResponse: SpinResponse
    try {
      const res = await fetch('/api/spin', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '서버 오류')
      }
      spinResponse = await res.json()
    } catch (e) {
      setSpinning(false)
      alert((e as Error).message || '추첨 중 오류가 발생했습니다.')
      return
    }

    soundEngine.spinStart()

    const { segmentIndex } = spinResponse
    const n = prizes.length
    const segAngle = (2 * Math.PI) / n

    const curNorm = ((rotationRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    const targetBase = ((-segmentIndex * segAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
    let delta = (targetBase - curNorm + 2 * Math.PI) % (2 * Math.PI)
    if (delta < 0.2) delta += 2 * Math.PI

    const finalRotation = rotationRef.current + delta + 2 * Math.PI * MIN_ROTATIONS
    const startRotation = rotationRef.current
    const startTime = performance.now()
    lastTickSegRef.current = -1

    // 등수 판별: 비꽝을 display_order 순으로 정렬
    const nonConsolation = prizes.filter(p => !p.is_consolation).sort((a, b) => a.display_order - b.display_order)
    const rank = nonConsolation.findIndex(p => p.id === spinResponse.prize.id)
    // rank 0 = 1등, rank 1 = 2등, rank 2+ = 3등 이하

    const animate = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / SPIN_DURATION, 1)
      const newRotation = startRotation + (finalRotation - startRotation) * easeOut(t)

      // 세그먼트 경계 넘을 때 틱 소리
      const curSeg = Math.floor(((newRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / segAngle)
      if (curSeg !== lastTickSegRef.current) {
        soundEngine.tick(1 - easeOut(t))
        lastTickSegRef.current = curSeg
      }

      rotationRef.current = newRotation
      drawWheel(rotationRef.current)

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        rotationRef.current = finalRotation
        setSpinning(false)
        setResult(spinResponse)
        setShowModal(true)
        if (spinResponse.prize.is_consolation) {
          soundEngine.consolation()
        } else if (rank === 0) {
          soundEngine.winGrand()
          soundEngine.playTTS('/sounds/tts_1st.mp3', 800)
        } else if (rank === 1) {
          soundEngine.win2nd()
          soundEngine.playTTS('/sounds/tts_2nd.mp3', 500)
        } else if (rank === 2) {
          soundEngine.winNormal()
          soundEngine.playTTS('/sounds/tts_3rd.mp3', 500)
        } else {
          soundEngine.winNormal()
        }
        if (!spinResponse.prize.is_consolation) startConfetti()
        setTodayCount(c => c + 1)
        onSpinComplete()
      }
    }

    animFrameRef.current = requestAnimationFrame(animate)
  }

  const isWin = result && !result.prize.is_consolation

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full h-full">
      {/* 컨페티 캔버스 */}
      <canvas
        ref={confettiCanvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 200, display: showConfetti ? 'block' : 'none' }}
      />

      {/* 휠 + 포인터 */}
      <div className="relative flex items-center justify-center" style={{ marginTop: '36px' }}>
        <div className="absolute pointer-events-none" style={{
          zIndex: 10, top: -22, left: '50%', transform: 'translateX(-50%)',
          animation: 'triGlow 1.8s ease-in-out infinite',
        }}>
          <div style={{
            position: 'absolute',
            top: -2,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '17px solid transparent',
            borderRight: '17px solid transparent',
            borderTop: '34px solid rgba(255,215,0,0.75)',
          }} />
          <div style={{
            position: 'relative',
            width: 0,
            height: 0,
            borderLeft: '13px solid transparent',
            borderRight: '13px solid transparent',
            borderTop: '28px solid #FFD700',
          }} />
        </div>
        <canvas
          ref={canvasRef}
          className="rounded-full"
          onDoubleClick={() => router.push('/admin')}
          style={{
            cursor: 'pointer',
            filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.55)) drop-shadow(0 0 28px rgba(255,255,255,0.22)) drop-shadow(0 0 55px rgba(255,255,255,0.09))',
          }}
        />
      </div>

      {/* 돌리기 버튼 */}
      <button
        onClick={spin}
        disabled={spinning}
        className="relative select-none overflow-hidden"
        style={{
          width: '100%', maxWidth: 300,
          border: spinning ? '2.5px solid #888' : '2.5px solid #f5c832',
          boxShadow: spinning ? 'none' : '0 0 0 1px #c07812, 0 0 14px 3px rgba(245,200,50,0.5)',
          cursor: spinning ? 'not-allowed' : 'pointer',
          borderRadius: 30,
          padding: '16px 20px',
          background: spinning
            ? 'linear-gradient(180deg,#888,#666 48%,#555)'
            : 'linear-gradient(180deg,#fbe08a,#f2bd3e 48%,#e29a1b)',
          color: spinning ? '#ccc' : '#3a230a',
          fontFamily: "'Noto Sans KR', sans-serif",
          fontWeight: 900,
          fontSize: 20,
          letterSpacing: '.5px',
          animation: spinning ? 'none' : 'btnGlow 2.2s ease-in-out infinite',
          transform: spinning ? 'scale(0.97)' : undefined,
          transition: 'transform .15s',
        }}
      >
        {!spinning && (
          <span style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(105deg,transparent 38%,rgba(255,255,255,.8) 50%,transparent 62%)',
            backgroundSize: '220% 100%',
            animation: 'sheen 3.2s ease-in-out infinite',
          }} />
        )}
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          {spinning ? '추첨 중…' : (
            <>
              돌리기!
              <span style={{
                display: 'inline-flex', width: 26, height: 26,
                borderRadius: '50%', background: '#3a230a',
                color: '#f2bd3e', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, lineHeight: 1, animation: 'arrowNudge 1.2s ease-in-out infinite',
              }}>
                <span style={{ position: 'relative', top: -1, left: 1, lineHeight: 1 }}>▸</span>
              </span>
            </>
          )}
        </span>
      </button>

      {/* 참여 횟수 소진 토스트 */}
      {limitToast && (
        <div
          className="limit-toast"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: '180px',
            zIndex: 300,
            background: 'rgba(20,20,20,0.93)',
            color: 'white',
            padding: '16px 28px',
            borderRadius: '20px',
            fontSize: '17px',
            fontWeight: 800,
            letterSpacing: '.3px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          ⛔ 당일 참여 횟수가 소진되었습니다
        </div>
      )}

      {/* 결과 모달 */}
      {showModal && result && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-6"
          style={{ backdropFilter: 'blur(6px)' }}
          onClick={() => setShowModal(false)}
        >
          <div
            className={`modal-bounce-in bg-white rounded-3xl p-10 w-full max-w-xs text-center shadow-2xl ${isWin ? 'win-glow' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            {result.prize.is_consolation ? (
              <>
                <div className="text-7xl mb-3 consolation-shake inline-block">😢</div>
                <p className="text-2xl text-gray-500 mb-1">아쉽네요</p>
                <p className="text-5xl font-black text-gray-400 mb-6">꽝!</p>
              </>
            ) : (
              <>
                <div className="text-7xl mb-3" style={{ filter: 'drop-shadow(0 0 14px gold)' }}>🎉</div>
                <p className="text-2xl text-green-600 font-bold mb-1">축하합니다!</p>
                <p
                  className="text-4xl font-black mb-1"
                  style={{ color: result.prize.color, textShadow: `0 0 18px ${result.prize.color}` }}
                >
                  {result.prize.name}
                </p>
                <p className="text-gray-500 mb-6">당첨되셨습니다!</p>
              </>
            )}
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-white text-xl font-bold rounded-2xl transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
