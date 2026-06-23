'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Prize, SpinResponse } from '@/types'

interface Props {
  prizes: Prize[]
  onSpinComplete: () => void
}

const SPIN_DURATION = 5000
const MIN_ROTATIONS = 8

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

export default function RouletteWheel({ prizes, onSpinComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rotationRef = useRef(0)
  const animFrameRef = useRef<number>()
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<SpinResponse | null>(null)
  const [showModal, setShowModal] = useState(false)

  const drawWheel = useCallback(
    (rotation: number) => {
      const canvas = canvasRef.current
      if (!canvas || prizes.length === 0) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // canvas.width는 물리 픽셀 — ctx.scale(dpr,dpr) 이후엔 CSS 픽셀 기준으로 계산해야 함
      const size = canvas.clientWidth || canvas.width
      const cx = size / 2
      const cy = size / 2
      const radius = cx - 28
      const n = prizes.length
      const segAngle = (2 * Math.PI) / n

      ctx.clearRect(0, 0, size, size)

      // --- 외부 원형 테두리 ---
      ctx.beginPath()
      ctx.arc(cx, cy, radius + 14, 0, 2 * Math.PI)
      ctx.fillStyle = '#1a3a1a'
      ctx.fill()

      // --- 세그먼트 그리기 ---
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rotation)

      // 등수 라벨 계산 (비꽝 prizes만 1등, 2등... 순서 부여)
      let rankIdx = 1
      const labelMap = new Map<number, string>()
      prizes.forEach((p) => {
        labelMap.set(p.id, p.is_consolation ? '꽝' : `${rankIdx++}등`)
      })

      prizes.forEach((prize, i) => {
        const startAngle = -Math.PI / 2 - segAngle / 2 + i * segAngle
        const endAngle = startAngle + segAngle

        // 세그먼트 채우기 — 소진 여부 무관하게 원래 색상 유지
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.arc(0, 0, radius, startAngle, endAngle)
        ctx.closePath()
        ctx.fillStyle = prize.color
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()

        // 텍스트 — 세그먼트 중앙에 배치
        ctx.save()
        ctx.rotate(startAngle + segAngle / 2)
        const fontSize = Math.max(12, Math.min(22, radius * 0.14))
        ctx.font = `bold ${fontSize}px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#ffffff'
        ctx.shadowColor = 'rgba(0,0,0,0.7)'
        ctx.shadowBlur = 4
        ctx.fillText(labelMap.get(prize.id) ?? '꽝', radius * 0.6, 0)
        ctx.restore()
      })

      ctx.restore()

      // --- 중심 원 ---
      ctx.beginPath()
      ctx.arc(cx, cy, 22, 0, 2 * Math.PI)
      ctx.fillStyle = '#1a3a1a'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.stroke()

      // 중심 골프공 모양 점
      ctx.beginPath()
      ctx.arc(cx, cy, 8, 0, 2 * Math.PI)
      ctx.fillStyle = '#ffffff'
      ctx.fill()

    },
    [prizes]
  )

  // 캔버스 크기를 DPR 고려해 설정
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

    const { segmentIndex } = spinResponse
    const n = prizes.length
    const segAngle = (2 * Math.PI) / n

    // 현재 회전 정규화
    const curNorm = ((rotationRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    // 당첨 세그먼트를 포인터 위치로 오게 하는 목표 각도
    const targetBase = ((-segmentIndex * segAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
    let delta = (targetBase - curNorm + 2 * Math.PI) % (2 * Math.PI)
    if (delta < 0.2) delta += 2 * Math.PI

    const finalRotation = rotationRef.current + delta + 2 * Math.PI * MIN_ROTATIONS
    const startRotation = rotationRef.current
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / SPIN_DURATION, 1)
      rotationRef.current = startRotation + (finalRotation - startRotation) * easeOut(t)
      drawWheel(rotationRef.current)

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        rotationRef.current = finalRotation
        setSpinning(false)
        setResult(spinResponse)
        setShowModal(true)
        onSpinComplete()
      }
    }

    animFrameRef.current = requestAnimationFrame(animate)
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full h-full">
      {/* 휠 + 고정 결정선 포인터 */}
      <div className="relative flex items-center justify-center" style={{ marginTop: '36px' }}>
        {/* 12시 방향 고정 삼각형 포인터 (아래를 향함) */}
        <div className="absolute pointer-events-none" style={{ zIndex: 10, top: -22, left: '50%', transform: 'translateX(-50%)' }}>
          {/* 흰색 외곽선 레이어 */}
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
          {/* 빨간 삼각형 */}
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
        <canvas ref={canvasRef} className="rounded-full" />
      </div>

      {/* 돌리기 버튼 */}
      <button
        onClick={spin}
        disabled={spinning}
        className={`
          px-14 py-5 text-2xl font-extrabold rounded-full shadow-2xl
          transition-all duration-150 select-none
          ${spinning
            ? 'bg-gray-500 text-gray-300 cursor-not-allowed scale-95'
            : 'bg-green-500 hover:bg-green-400 active:scale-95 text-white shadow-green-900/50'}
        `}
        style={{ letterSpacing: '0.05em' }}
      >
        {spinning ? '추첨 중…' : '🎯  돌리기!'}
      </button>

      {/* 결과 모달 */}
      {showModal && result && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-6"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-10 w-full max-w-xs text-center shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {result.prize.is_consolation ? (
              <>
                <div className="text-7xl mb-3">😢</div>
                <p className="text-2xl text-gray-500 mb-1">아쉽네요</p>
                <p className="text-5xl font-black text-gray-400 mb-6">꽝!</p>
              </>
            ) : (
              <>
                <div className="text-7xl mb-3">🎉</div>
                <p className="text-2xl text-green-600 font-bold mb-1">축하합니다!</p>
                <p
                  className="text-4xl font-black mb-1"
                  style={{ color: result.prize.color }}
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
