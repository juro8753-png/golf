export type ThemeKey = 'standard' | 'royal_gold' | 'burgundy_cream'

export interface WheelThemeConfig {
  key: ThemeKey
  name: string
  rimFill: string
  rimRingColor: string
  useCustomSegColors: boolean
  segEvenFill: string
  segOddFill: string
  segEvenText: string
  segOddText: string
  dividerColor: string
  dividerWidth: number
  bulbOnColor: string
  bulbOffColor: string
  bulbGlowColor: string
  hubOuterFill: string
  hubInnerFill: string
  hubInnerStroke: string
  // 미리보기용 색상
  previewColors: [string, string, string]
}

export const WHEEL_THEMES: Record<ThemeKey, WheelThemeConfig> = {
  standard: {
    key: 'standard',
    name: '일반',
    rimFill: '#1a3a1a',
    rimRingColor: 'none',
    useCustomSegColors: true,
    segEvenFill: '',
    segOddFill: '',
    segEvenText: '#ffffff',
    segOddText: '#ffffff',
    dividerColor: '#ffffff',
    dividerWidth: 2,
    bulbOnColor: '#FFD700',
    bulbOffColor: '#2a1800',
    bulbGlowColor: '#FFD700',
    hubOuterFill: '#1a3a1a',
    hubInnerFill: '#ffffff',
    hubInnerStroke: '#ffffff',
    previewColors: ['#1a3a1a', '#4CAF50', '#2196F3'],
  },
  royal_gold: {
    key: 'royal_gold',
    name: '로열골드',
    rimFill: '#0e0820',
    rimRingColor: '#caa24a',
    useCustomSegColors: false,
    segEvenFill: '#1c0d35',
    segOddFill: '#b8820e',
    segEvenText: '#e9c069',
    segOddText: '#fff3cf',
    dividerColor: '#e9c069',
    dividerWidth: 2.5,
    bulbOnColor: '#ffe9a8',
    bulbOffColor: '#5a3e10',
    bulbGlowColor: '#FFD700',
    hubOuterFill: '#0e0820',
    hubInnerFill: '#fffdf5',
    hubInnerStroke: '#caa24a',
    previewColors: ['#0e0820', '#1c0d35', '#b8820e'],
  },
  burgundy_cream: {
    key: 'burgundy_cream',
    name: '버건디 크림',
    rimFill: '#1a0008',
    rimRingColor: '#caa24a',
    useCustomSegColors: false,
    segEvenFill: '#fff7e2',
    segOddFill: '#c8415e',
    segEvenText: '#c0243f',
    segOddText: '#fffbe8',
    dividerColor: '#e9c069',
    dividerWidth: 2.5,
    bulbOnColor: '#ffe9a8',
    bulbOffColor: '#7a4030',
    bulbGlowColor: '#ffe9a8',
    hubOuterFill: '#1c0010',
    hubInnerFill: '#fffdf5',
    hubInnerStroke: '#caa24a',
    previewColors: ['#1a0008', '#fff7e2', '#c8415e'],
  },
}

export const THEME_STORAGE_KEY = 'wheel_theme'

export function getSavedTheme(): ThemeKey {
  if (typeof window === 'undefined') return 'standard'
  return (localStorage.getItem(THEME_STORAGE_KEY) as ThemeKey) ?? 'standard'
}

export function saveTheme(key: ThemeKey) {
  localStorage.setItem(THEME_STORAGE_KEY, key)
}
