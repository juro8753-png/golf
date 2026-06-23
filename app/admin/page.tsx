'use client'

import { useEffect, useState } from 'react'
import { AdminStats } from '@/types'

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
  }, [])

  if (loading) return <p className="text-gray-500">불러오는 중…</p>
  if (!stats) return <p className="text-red-500">데이터를 불러올 수 없습니다.</p>

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">대시보드</h1>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="총 추첨 횟수" value={`${stats.total_spins}회`} color="bg-blue-50 border-blue-200" />
        <StatCard label="총 당첨 횟수" value={`${stats.total_winners}회`} color="bg-green-50 border-green-200" />
        <StatCard
          label="당첨률"
          value={stats.total_spins > 0 ? `${((stats.total_winners / stats.total_spins) * 100).toFixed(1)}%` : '-'}
          color="bg-yellow-50 border-yellow-200"
        />
      </div>

      {/* 상품별 현황 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">상품별 현황</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">상품명</th>
                <th className="px-4 py-3 font-semibold text-center">전체 수량</th>
                <th className="px-4 py-3 font-semibold text-center">당첨 횟수</th>
                <th className="px-4 py-3 font-semibold text-center">남은 수량</th>
                <th className="px-4 py-3 font-semibold text-center">상태</th>
              </tr>
            </thead>
            <tbody>
              {stats.prize_stats.map(p => {
                const soldOut = !p.is_unlimited && p.remaining_quantity === 0
                return (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ background: p.color }} />
                      <span className={p.is_consolation ? 'text-gray-400' : 'font-medium'}>{p.name}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{p.total_quantity}</td>
                    <td className="px-4 py-3 text-center font-medium">{p.won_count}</td>
                    <td className="px-4 py-3 text-center">
                      {p.is_unlimited ? (
                        <span className="text-blue-500 font-medium">∞ 무제한</span>
                      ) : (
                        <span className={soldOut ? 'text-red-500 font-bold' : 'text-gray-700'}>
                          {p.remaining_quantity}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {soldOut ? (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">소진</span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">진행중</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`border rounded-xl p-5 ${color}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-extrabold text-gray-800">{value}</p>
    </div>
  )
}
