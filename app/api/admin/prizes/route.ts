import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/mock-db'

export async function GET() {
  const prizes = await db.prizes.getAll()
  return NextResponse.json(prizes)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, total_quantity, is_unlimited, is_consolation, color, display_order } = body

  if (!name || total_quantity == null) {
    return NextResponse.json({ error: '이름과 수량은 필수입니다.' }, { status: 400 })
  }

  const prize = await db.prizes.create({
    name,
    total_quantity: Number(total_quantity),
    remaining_quantity: Number(total_quantity),
    is_unlimited: !!is_unlimited,
    is_consolation: !!is_consolation,
    color: color || '#36A2EB',
    display_order: Number(display_order ?? 0),
  })

  return NextResponse.json(prize)
}
