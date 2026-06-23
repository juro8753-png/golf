import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/mock-db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') ?? 1)
  const limit = Number(searchParams.get('limit') ?? 50)
  const { data, count } = await db.results.getPaged(page, limit)
  return NextResponse.json({ data, count, page, limit })
}
