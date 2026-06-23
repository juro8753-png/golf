import { Prize } from '@/types'

export function pickWinner(prizes: Prize[]): { prize: Prize; segmentIndex: number } {
  const available = prizes.filter(p => p.is_unlimited || p.remaining_quantity > 0)

  if (available.length === 0) {
    throw new Error('추첨 가능한 상품이 없습니다.')
  }

  // 총 슬롯 수 계산 (수량 가중치 기반)
  const totalSlots = available.reduce((sum, p) => {
    return sum + (p.is_unlimited ? p.total_quantity : p.remaining_quantity)
  }, 0)

  const rand = Math.floor(Math.random() * totalSlots)
  let cumulative = 0

  for (const prize of available) {
    const weight = prize.is_unlimited ? prize.total_quantity : prize.remaining_quantity
    cumulative += weight
    if (rand < cumulative) {
      return {
        prize,
        segmentIndex: prizes.findIndex(p => p.id === prize.id),
      }
    }
  }

  // fallback
  const last = available[available.length - 1]
  return {
    prize: last,
    segmentIndex: prizes.findIndex(p => p.id === last.id),
  }
}
