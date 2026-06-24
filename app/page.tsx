'use client'

import { useEffect, useState, useCallback } from 'react'
import RouletteWheel from '@/components/RouletteWheel'
import FireworksBackground from '@/components/FireworksBackground'
import { Prize } from '@/types'

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
      style={{
        background: 'radial-gradient(130% 100% at 50% 0%, #3a1d52 0%, #2a1342 38%, #1a0d2e 72%, #0d0719 100%)',
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >
      {/* 폭죽 캔버스 */}
      <FireworksBackground />

      {/* 보라 비네트 오버레이 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: 'radial-gradient(70% 55% at 50% 42%, rgba(122,70,160,.35), transparent 70%)',
        }}
      />

      {/* 콘텐츠 */}
      <div
        className="relative flex flex-col items-center justify-center min-h-screen px-5 py-8"
        style={{ zIndex: 2 }}
      >
        {/* 헤드라인 */}
        <div
          className="flex items-center gap-3 mb-1 cursor-pointer select-none"
          onClick={toggleFullscreen}
          title={isFullscreen ? '전체화면 해제' : '전체화면'}
        >
          <span style={{
            fontSize: 42, lineHeight: 1,
            display: 'inline-block',
            transform: 'translateY(-12px)',
            filter: 'drop-shadow(0 0 10px rgba(245,200,90,.8))',
            animation: 'fukPulse 2.6s ease-in-out infinite',
          }}>⛳</span>
          <span style={{
            fontFamily: "'Black Han Sans', sans-serif",
            fontSize: 42, lineHeight: 1,
            verticalAlign: 'middle',
            color: '#fff',
            textShadow: '0 2px 6px rgba(0,0,0,.55)',
          }}>이벤트 추첨</span>
        </div>

        {loading ? (
          <div className="text-white text-xl animate-pulse">불러오는 중…</div>
        ) : prizes.length === 0 ? (
          <div style={{ color: '#f4c64a', fontSize: 18 }}>등록된 상품이 없습니다.</div>
        ) : (
          <RouletteWheel prizes={prizes} onSpinComplete={fetchPrizes} />
        )}
      </div>
    </div>
  )
}
