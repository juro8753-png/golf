'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const navItems = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/results', label: '당첨 내역' },
  { href: '/', label: '룰렛판으로' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const logout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.replace('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 네비게이션 */}
      <nav className="bg-gray-900 text-white px-4 py-3 flex items-center gap-2 flex-wrap">
        <span className="font-bold text-green-400 mr-4 text-lg">⛳ 관리자</span>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === item.href
                ? 'bg-green-600 text-white'
                : 'hover:bg-gray-700 text-gray-300'
            }`}
          >
            {item.label}
          </Link>
        ))}
        <button
          onClick={logout}
          className="ml-auto text-sm text-gray-400 hover:text-white transition-colors"
        >
          로그아웃
        </button>
      </nav>

      {/* 콘텐츠 */}
      <div className="max-w-5xl mx-auto px-4 py-8">{children}</div>
    </div>
  )
}
