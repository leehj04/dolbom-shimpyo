'use client'

import { Suspense, use, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcAge } from '@/lib/date'

const NEEDS_OPTIONS = ['말벗·정서 지원', '식사 보조', '복약 확인', '산책 동행', '배회 관찰']
const DURATIONS = [2, 3, 4]

function todayPlus(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
const DATE_OPTIONS = Array.from({ length: 7 }, (_, i) => todayPlus(i))
const HOURS = Array.from({ length: 12 }, (_, i) => 8 + i)

type Elder = {
  id: string
  name: string
  gender: 'm' | 'f' | null
  birth_date: string | null
  elder_assessments: { level: number; hourly_rate: number; is_current: boolean }[]
}

type Caregiver = {
  profile_id: string
  profiles: { name: string } | null
}

export default function NewCareRequestPage({ params }: { params: Promise<{ caregiverId: string }> }) {
  const { caregiverId } = use(params)
  return (
    <Suspense fallback={null}>
      <NewCareRequestInner caregiverId={caregiverId} />
    </Suspense>
  )
}

function NewCareRequestInner({ caregiverId }: { caregiverId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const elderId = searchParams.get('elderId')

  const [elder, setElder] = useState<Elder | null>(null)
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null)
  const [availableHours, setAvailableHours] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [selectedDate, setSelectedDate] = useState(DATE_OPTIONS[0])
  const [startHour, setStartHour] = useState<number | null>(null)
  const [duration, setDuration] = useState(2)
  const [needs, setNeeds] = useState<string[]>([])
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!elderId) {
      setError('어르신을 먼저 선택해주세요.')
      setLoading(false)
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elderId, selectedDate])

  async function load() {
    setLoading(true)
    setError(null)

    const [{ data: elderData, error: elderErr }, { data: caregiverData, error: caregiverErr }, { data: avail }] =
      await Promise.all([
        supabase
          .from('elders')
          .select('id, name, gender, birth_date, elder_assessments(level, hourly_rate, is_current)')
          .eq('id', elderId)
          .single(),
        supabase.from('caregiver_profiles').select('profile_id, profiles(name)').eq('profile_id', caregiverId).single(),
        supabase
          .from('caregiver_availability')
          .select('start_hour')
          .eq('caregiver_id', caregiverId)
          .eq('available_date', selectedDate),
      ])

    if (elderErr || !elderData) setError('어르신 정보를 불러오지 못했습니다.')
    else setElder(elderData)

    if (caregiverErr || !caregiverData) setError('요양보호사 정보를 불러오지 못했습니다.')
    else setCaregiver(caregiverData as unknown as Caregiver)

    setAvailableHours((avail ?? []).map((r) => r.start_hour))
    setStartHour(null)
    setLoading(false)
  }

  const current = elder?.elder_assessments?.find((a) => a.is_current) ?? elder?.elder_assessments?.[0]
  const totalPrice = current ? current.hourly_rate * duration : 0

  function toggleNeed(n: string) {
    setNeeds((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]))
  }

  function isHourBookable(h: number) {
    // 선택한 시간부터 duration 시간만큼 모두 가용해야 한다
    for (let i = 0; i < duration; i++) {
      if (!availableHours.includes(h + i)) return false
    }
    return true
  }

  async function handleSubmit() {
    if (!elder || !current || startHour === null) {
      setError('시간을 선택해주세요.')
      return
    }
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

    const startAt = new Date(`${selectedDate}T${String(startHour).padStart(2, '0')}:00:00`)

    const { error: insertError } = await supabase.from('care_requests').insert({
      elder_id: elder.id,
      guardian_id: user.id,
      caregiver_id: caregiverId,
      start_at: startAt.toISOString(),
      duration_hours: duration,
      needs,
      level_at_request: current.level,
      rate_at_request: current.hourly_rate,
      total_price: totalPrice,
      status: 'matching',
      elder_snapshot: {
        name: elder.name,
        gender: elder.gender,
        age: calcAge(elder.birth_date),
        level: current.level,
        note,
      },
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    router.push('/guardian')
    router.refresh()
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-sm px-6 py-10">
        <p className="text-sm text-neutral-400">불러오는 중…</p>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-sm px-6 py-10">
      <p className="text-xs tracking-wide text-neutral-400">돌봄 신청</p>
      <h1 className="mt-1 text-xl font-semibold">{caregiver?.profiles?.name ?? '요양보호사'}님께 신청</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {elder?.name} 어르신 · {current?.level}단계 · 시간당 {current?.hourly_rate.toLocaleString()}원
      </p>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
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

      <div className="mt-4 flex gap-2">
        {DURATIONS.map((d) => (
          <button
            key={d}
            onClick={() => {
              setDuration(d)
              setStartHour(null)
            }}
            className={`flex-1 rounded-xl border py-2 text-sm transition ${
              duration === d
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-200 bg-white text-neutral-600'
            }`}
          >
            {d}시간
          </button>
        ))}
      </div>

      {availableHours.length === 0 ? (
        <p className="mt-5 rounded-xl bg-neutral-50 p-4 text-center text-sm text-neutral-400">
          이 날짜엔 등록된 가용 시간이 없어요. 다른 날짜를 선택해주세요.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-6 gap-1.5">
          {HOURS.map((h) => {
            const bookable = isHourBookable(h)
            return (
              <button
                key={h}
                disabled={!bookable}
                onClick={() => setStartHour(h)}
                className={`rounded-md border py-2 text-center font-mono text-[11px] transition ${
                  !bookable
                    ? 'cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-300'
                    : startHour === h
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 bg-white text-neutral-600'
                }`}
              >
                {h}
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-6">
        <p className="mb-2 text-sm text-neutral-500">필요한 지원</p>
        <div className="flex flex-wrap gap-2">
          {NEEDS_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => toggleNeed(n)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                needs.includes(n)
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 bg-white text-neutral-600'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm text-neutral-500">전달하고 싶은 메모 (선택)</p>
        <textarea
          className="input w-full"
          rows={3}
          placeholder="예: 오후 4시 무렵 불안해하세요"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-500">예상 금액</span>
          <span className="font-mono text-base font-semibold">{totalPrice.toLocaleString()}원</span>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={saving || startHour === null}
        className="mt-6 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? '신청 중…' : '신청하기'}
      </button>
    </main>
  )
}
