'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ColorfulFireworksBackground from '@/components/ColorfulFireworksBackground'
import SparklesOverlay from '@/components/SparklesOverlay'
import { soundEngine } from '@/lib/sounds'
import { BG_THEMES, getSavedBg, LANDING_BG_KEY } from '@/lib/bg-themes'


function playChime() {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return
  const ctx = new AudioCtx()

  const notes = [523, 659, 784, 1047]
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08)
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08)
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.08 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.35)
    osc.start(ctx.currentTime + i * 0.08)
    osc.stop(ctx.currentTime + i * 0.08 + 0.4)
  })
}

export default function LandingPage() {
  const router = useRouter()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [bgGradient, setBgGradient] = useState(BG_THEMES.emerald_black.gradient)

  useEffect(() => {
    setBgGradient(BG_THEMES[getSavedBg(LANDING_BG_KEY)].gradient)
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
      style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        background: bgGradient,
        fontFamily: "'Noto Sans KR', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* 레이어 0: 컬러 폭죽 */}
      <ColorfulFireworksBackground />

      {/* 레이어 1: 십자 반짝이 */}
      <SparklesOverlay />

      {/* 레이어 1: 콘텐츠 */}
      <div
        className="landing-center-mobile"
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 440,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 28px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '100%' }}>
          {/* 로고 영역 */}
          <div
            className="logo-fixed-mobile"
            onClick={toggleFullscreen}
            title={isFullscreen ? '전체화면 해제' : '전체화면'}
            style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, cursor: 'pointer' }}
          >
            <Image
              src="/logo.png"
              alt="월송CC점 GOLFZONPARK"
              width={260}
              height={80}
              style={{ objectFit: 'contain', width: '60%', height: 'auto' }}
              priority
            />
          </div>

          {/* 헤드라인: 날마다 福 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, lineHeight: 1 }}>
            <span
              style={{
                color: '#ffffff',
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: '-0.01em',
                textShadow: '0 2px 10px rgba(0,0,0,0.65)',
              }}
            >
              날마다
            </span>
            <span
              style={{
                color: '#f5c832',
                fontSize: 92,
                fontWeight: 900,
                lineHeight: 1,
                fontFamily: "'Noto Serif KR', serif",
                textShadow: '0 0 22px rgba(245,200,90,0.75), 0 2px 6px rgba(0,0,0,0.55)',
                animation: 'fukPulse 2.6s ease-in-out infinite',
                display: 'inline-block',
                transform: 'translateY(-10px)',
              }}
            >
              福
            </span>
          </div>

          {/* 헤드라인 2줄: 나눔 이벤트 */}
          <div
            style={{
              color: '#ffffff',
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: '-0.01em',
              textShadow: '0 2px 10px rgba(0,0,0,0.65)',
              marginTop: 6,
              textAlign: 'center',
            }}
          >
            나눔 이벤트
          </div>

          {/* 서브타이틀 */}
          <div
            style={{
              color: 'rgba(255,255,255,0.88)',
              fontSize: 15,
              fontWeight: 400,
              letterSpacing: '0.02em',
              marginTop: 22,
              textAlign: 'center',
              textShadow: '0 1px 6px rgba(0,0,0,0.5)',
            }}
          >
            오늘의 행운을 돌려보세요!
          </div>

          {/* CTA 버튼 */}
          <div style={{ marginTop: 36, display: 'flex', justifyContent: 'center', width: '100%' }}>
            <button
              onClick={() => { soundEngine.bgStart(); playChime(); setTimeout(() => router.push('/roulette'), 350) }}
              style={{
                width: '75%',
                padding: '17px 20px',
                background: 'linear-gradient(180deg,#fbe08a,#f2bd3e 48%,#e29a1b)',
                borderRadius: 56,
                border: '2.5px solid #f5c832',
                boxShadow: '0 0 0 1px #c07812, 0 0 14px 3px rgba(245,200,50,0.5)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                fontSize: 20,
                fontWeight: 800,
                color: '#1a0800',
                fontFamily: "'Noto Sans KR', sans-serif",
                letterSpacing: '-0.01em',
                animation: 'btnGlow 2s ease-in-out infinite',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span>이벤트 참여하기</span>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  animation: 'arrowNudge 1.4s ease-in-out infinite',
                  display: 'inline-block',
                }}
              >
                ›
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
