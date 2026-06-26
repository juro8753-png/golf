export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('spin_results')
    .select('spun_at')
    .order('spun_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data as { spun_at: string }[]

  // 날짜별 카운트
  const countMap: Record<string, number> = {}
  for (const row of rows) {
    const date = row.spun_at.slice(0, 10) // YYYY-MM-DD
    countMap[date] = (countMap[date] ?? 0) + 1
  }

  const today = new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD (로컬 기준)
  const today_count = countMap[today] ?? 0
  const total_count = rows.length

  const daily_breakdown = Object.entries(countMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.date.localeCompare(a.date))

  return NextResponse.json({ today_count, total_count, daily_breakdown })
}
