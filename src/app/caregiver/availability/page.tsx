'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// 프로토타입의 가용시간 격자(08~19시)를 그대로 포팅.
// 요양보호사가 가용한 시간대를 직접 켜고/끄면 caregiver_availability에 저장된다.
const HOURS = Array.from({ length: 12 }, (_, i) => 8 + i) // 08~19

function todayPlus(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const DATE_OPTIONS = Array.from({ length: 7 }, (_, i) => todayPlus(i))

type Slot = { date: string; hour: number }

export default function AvailabilityPage() {
  const supabase = createClient()
  const [selectedDate, setSelectedDate] = useState(DATE_OPTIONS[0])
  const [savedSlots, setSavedSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('caregiver_availability')
      .select('available_date, start_hour')
      .eq('caregiver_id', user.id)

    setSavedSlots((data ?? []).map((r) => ({ date: r.available_date, hour: r.start_hour })))
    setLoading(false)
  }

  function isSelected(hour: number) {
    return savedSlots.some((s) => s.date === selectedDate && s.hour === hour)
  }

  function toggle(hour: number) {
    setSavedSlots((prev) =>
      isSelected(hour)
        ? prev.filter((s) => !(s.date === selectedDate && s.hour === hour))
        : [...prev, { date: selectedDate, hour }]
    )
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('로그인이 필요합니다.')
      setSaving(false)
      return
    }

    // 선택된 날짜의 기존 등록을 지우고 다시 넣는다 (간단한 upsert 대체)
    await supabase.from('caregiver_availability').delete().eq('caregiver_id', user.id).eq('available_date', selectedDate)

    const rows = savedSlots
      .filter((s) => s.date === selectedDate)
      .map((s) => ({
        caregiver_id: user.id,
        available_date: s.date,
        start_hour: s.hour,
        end_hour: s.hour + 1,
      }))

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from('caregiver_availability').insert(rows)
      if (insertError) {
        setError(insertError.message)
        setSaving(false)
        return
      }
    }

    setSaving(false)
  }

  return (
    <main className="mx-auto min-h-screen max-w-sm px-6 py-10">
      <p className="text-xs tracking-wide text-neutral-400">가용 시간 등록</p>
      <h1 className="mt-1 text-xl font-semibold">
        언제 돌봄 요청을
        <br />
        받으실 수 있나요?
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        열어 둔 시간에만 요청이 도착합니다. 날짜를 고르고 가능한 시간을 눌러주세요.
      </p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {DATE_OPTIONS.map((d) => {
          const label = new Date(d).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })
          return (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${
                selectedDate === d
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 bg-white text-neutral-600'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-neutral-400">불러오는 중…</p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-6 gap-1.5">
            {HOURS.map((h) => (
              <button
                key={h}
                onClick={() => toggle(h)}
                className={`rounded-md border py-2 text-center font-mono text-[11px] transition ${
                  isSelected(h)
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 bg-white text-neutral-500'
                }`}
              >
                {h}
              </button>
            ))}
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-6 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? '저장 중…' : '이 날짜 가용시간 저장'}
          </button>
        </>
      )}
    </main>
  )
}
