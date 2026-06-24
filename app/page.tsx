'use client'

import { useEffect, useState, useCallback } from 'react'
import RouletteWheel from '@/components/RouletteWheel'
import FireworksBackground from '@/components/FireworksBackground'
import { Prize } from '@/types'

const STARS = Array.from({ length: 70 }, (_, i) => ({
  id: i,
  x: (i * 37 + i * i * 7 + 13) % 97,
  y: (i * 53 + i * i * 11 + 7) % 97,
  size: 1 + (i % 3),
  delay: (i * 0.4) % 5,
  duration: 1.5 + (i % 4) * 0.7,
}))

export default function Home() {
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const fetchPrizes = useCallback(async () => {
    try {
      const res = await fetch('/api/prizes')
      const data = await res.json()
      setPrizes(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPrizes() }, [fetchPrizes])

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
      try {
        const ori = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
        await ori.lock?.(screen.orientation.type)
      } catch {}
    } else {
      try { (screen.orientation as ScreenOrientation & { unlock?: () => void }).unlock?.() } catch {}
      document.exitFullscreen()
    }
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0d2b0d 0%, #1a5c1a 60%, #0d2b0d 100%)' }}
    >
      {/* 폭죽 + 금색 리본 배경 */}
      <FireworksBackground />

      {/* 별 배경 */}
      {STARS.map(s => (
        <span
          key={s.id}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size * 2 + 1}px`,
            height: `${s.size * 2 + 1}px`,
            animation: `twinkle ${s.duration}s ${s.delay}s ease-in-out infinite`,
            zIndex: 1,
          }}
        />
      ))}

      {/* 메인 콘텐츠 */}
      <div
        className="relative flex flex-col items-center justify-center min-h-screen"
        style={{ zIndex: 2 }}
      >
        {/* 타이틀 — 클릭 시 전체화면 토글 */}
        <h1
          onClick={toggleFullscreen}
          className="text-white text-3xl font-extrabold tracking-tight mb-2 drop-shadow-lg cursor-pointer select-none"
          title={isFullscreen ? '전체화면 해제' : '전체화면'}
        >
          ⛳ 이벤트 추첨
        </h1>
        <p className="text-green-300 text-sm mb-6 opacity-80">버튼을 눌러 행운을 잡으세요!</p>

        {loading ? (
          <div className="text-white text-xl animate-pulse">불러오는 중…</div>
        ) : prizes.length === 0 ? (
          <div className="text-yellow-300 text-lg">등록된 상품이 없습니다.</div>
        ) : (
          <RouletteWheel prizes={prizes} onSpinComplete={fetchPrizes} />
        )}
      </div>
    </div>
  )
}
