import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '이벤트 추첨',
    short_name: '추첨',
    description: '스크린골프 이벤트 룰렛 추첨',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d2b0d',
    theme_color: '#1a5c1a',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
