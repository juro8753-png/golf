'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Prize, SpinResponse } from '@/types'
import { soundEngine } from '@/lib/sounds'
import { getSavedTheme, WHEEL_THEMES, THEME_STORAGE_KEY, type WheelThemeConfig } from '@/lib/wheel-themes'

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
  const [theme, setTheme] = useState<WheelThemeConfig>(WHEEL_THEMES.burgundy_cream)
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

      // 골드 림 링 (로열골드·버건디 크림)
      if (th.rimRingColor !== 'none') {
        ctx.beginPath()
        ctx.arc(cx, cy, radius + 14, 0, 2 * Math.PI)
        ctx.strokeStyle = th.rimRingColor
        ctx.lineWidth = 5
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(cx, cy, radius + 6, 0, 2 * Math.PI)
        ctx.strokeStyle = th.rimRingColor
        ctx.lineWidth = 1.5
        ctx.globalAlpha = 0.5
        ctx.stroke()
        ctx.globalAlpha = 1
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
        ctx.fillStyle = segFill
        ctx.fill()
        ctx.strokeStyle = th.dividerColor
        ctx.lineWidth = th.dividerWidth
        ctx.stroke()

        ctx.save()
        ctx.rotate(startAngle + segAngle / 2)
        const fontSize = Math.max(12, Math.min(22, radius * 0.14))
        ctx.font = `bold ${fontSize}px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = segText
        ctx.shadowColor = 'rgba(0,0,0,0.6)'
        ctx.shadowBlur = 4
        ctx.fillText(prize.name, radius * 0.6, 0)
        ctx.restore()
      })

      ctx.restore()

      // LED 전구 (외부 링)
      const numBulbs = 32
      const bulbDist = radius + 9
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
          ctx.shadowBlur = 16
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
        <div className="absolute pointer-events-none" style={{ zIndex: 10, top: -22, left: '50%', transform: 'translateX(-50%)' }}>
          <div style={{
            position: 'absolute',
            top: -2,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '17px solid transparent',
            borderRight: '17px solid transparent',
            borderTop: '34px solid rgba(255,255,255,0.9)',
          }} />
          <div style={{
            position: 'relative',
            width: 0,
            height: 0,
            borderLeft: '13px solid transparent',
            borderRight: '13px solid transparent',
            borderTop: '28px solid #e63946',
            filter: 'drop-shadow(0 0 8px rgba(230,57,70,0.85))',
          }} />
        </div>
        <canvas
          ref={canvasRef}
          className="rounded-full"
          onDoubleClick={() => router.push('/admin')}
          style={{ cursor: 'pointer' }}
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
