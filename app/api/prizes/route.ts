import { NextResponse } from 'next/server'
import { db } from '@/lib/mock-db'

export async function GET() {
  const prizes = await db.prizes.getAll()
  return NextResponse.json(prizes)
}
