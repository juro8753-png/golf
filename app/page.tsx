'use client'

import { useEffect, useState, useCallback } from 'react'
import RouletteWheel from '@/components/RouletteWheel'
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

  useEffect(() => {
    fetchPrizes()
  }, [fetchPrizes])

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
      // 전체화면 진입 시 현재 방향 그대로 고정 (자동 회전 방지)
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
    <main
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #0d2b0d 0%, #1a5c1a 60%, #0d2b0d 100%)' }}
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
    </main>
  )
}
