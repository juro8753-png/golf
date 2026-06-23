'use client'

import { useEffect, useState } from 'react'
import { Prize } from '@/types'

const COLORS = [
  '#AAAAAA', '#FFD700', '#FF6384', '#36A2EB',
  '#4BC0C0', '#9966FF', '#FF9F40', '#66BB6A',
]

const emptyForm = {
  name: '',
  total_quantity: '',
  remaining_quantity: '',
  is_unlimited: false,
  is_consolation: false,
  color: '#36A2EB',
  display_order: '',
}

type FormState = typeof emptyForm

export default function PrizesPage() {
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Prize | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchPrizes = async () => {
    const res = await fetch('/api/admin/prizes')
    const data = await res.json()
    setPrizes(data)
    setLoading(false)
  }

  useEffect(() => { fetchPrizes() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...emptyForm, display_order: String(prizes.length) })
    setError('')
    setShowModal(true)
  }

  const openEdit = (p: Prize) => {
    setEditing(p)
    setForm({
      name: p.name,
      total_quantity: String(p.total_quantity),
      remaining_quantity: String(p.remaining_quantity),
      is_unlimited: p.is_unlimited,
      is_consolation: p.is_consolation,
      color: p.color,
      display_order: String(p.display_order),
    })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.total_quantity) {
      setError('상품명과 수량은 필수입니다.')
      return
    }
    setSaving(true)
    setError('')

    const body = {
      name: form.name,
      total_quantity: Number(form.total_quantity),
      remaining_quantity: editing
        ? Number(form.remaining_quantity)
        : Number(form.total_quantity),
      is_unlimited: form.is_unlimited,
      is_consolation: form.is_consolation,
      color: form.color,
      display_order: Number(form.display_order || 0),
    }

    const url = editing ? `/api/admin/prizes/${editing.id}` : '/api/admin/prizes'
    const method = editing ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      setShowModal(false)
      fetchPrizes()
    } else {
      const data = await res.json()
      setError(data.error || '저장 실패')
    }
    setSaving(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?\n관련 당첨 내역이 있으면 삭제가 거부될 수 있습니다.')) return
    const res = await fetch(`/api/admin/prizes/${id}`, { method: 'DELETE' })
    if (res.ok) {
      fetchPrizes()
    } else {
      const data = await res.json()
      alert(data.error || '삭제 실패')
    }
  }

  if (loading) return <p className="text-gray-500">불러오는 중…</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">상품 관리</h1>
        <button
          onClick={openAdd}
          className="bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl transition-colors"
        >
          + 상품 추가
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">순서</th>
              <th className="text-left px-4 py-3 font-semibold">상품명</th>
              <th className="px-4 py-3 font-semibold text-center">전체 수량</th>
              <th className="px-4 py-3 font-semibold text-center">남은 수량</th>
              <th className="px-4 py-3 font-semibold text-center">무제한</th>
              <th className="px-4 py-3 font-semibold text-center">꽝</th>
              <th className="px-4 py-3 font-semibold text-center">관리</th>
            </tr>
          </thead>
          <tbody>
            {prizes.map(p => (
              <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400">{p.display_order}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full" style={{ background: p.color }} />
                    <span className="font-medium">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">{p.total_quantity}</td>
                <td className="px-4 py-3 text-center">
                  {p.is_unlimited
                    ? <span className="text-blue-500">∞</span>
                    : <span className={p.remaining_quantity === 0 ? 'text-red-500 font-bold' : ''}>{p.remaining_quantity}</span>
                  }
                </td>
                <td className="px-4 py-3 text-center">{p.is_unlimited ? '✅' : '—'}</td>
                <td className="px-4 py-3 text-center">{p.is_consolation ? '✅' : '—'}</td>
                <td className="px-4 py-3 text-center space-x-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-red-500 hover:underline text-sm"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {prizes.length === 0 && (
          <p className="text-center text-gray-400 py-10">등록된 상품이 없습니다.</p>
        )}
      </div>

      {/* 상품 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-6">{editing ? '상품 수정' : '상품 추가'}</h2>

            <div className="space-y-4">
              <Field label="상품명">
                <input
                  className="input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="예) 1등 상품, 꽝"
                />
              </Field>

              <Field label="전체 수량">
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={form.total_quantity}
                  onChange={e => setForm(f => ({ ...f, total_quantity: e.target.value }))}
                  placeholder="예) 100"
                />
              </Field>

              {editing && (
                <Field label="남은 수량">
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={form.remaining_quantity}
                    onChange={e => setForm(f => ({ ...f, remaining_quantity: e.target.value }))}
                  />
                </Field>
              )}

              <Field label="표시 순서 (숫자, 낮을수록 먼저)">
                <input
                  className="input"
                  type="number"
                  value={form.display_order}
                  onChange={e => setForm(f => ({ ...f, display_order: e.target.value }))}
                />
              </Field>

              <Field label="색상">
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      className={`w-8 h-8 rounded-full border-4 transition-transform ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ background: c }}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                  />
                </div>
              </Field>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_unlimited}
                    onChange={e => setForm(f => ({ ...f, is_unlimited: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">수량 무제한</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_consolation}
                    onChange={e => setForm(f => ({ ...f, is_consolation: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">꽝 처리 (당첨 아님)</span>
                </label>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 0.75rem;
          padding: 0.625rem 1rem;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .input:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 2px rgba(22,163,74,0.15);
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}
