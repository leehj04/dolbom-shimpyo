'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type CareRequest = {
  id: string
  elder_id: string
  start_at: string
  duration_hours: number
  needs: string[]
  level_at_request: number
  total_price: number
  status: string
  elder_snapshot: { name: string; gender: 'm' | 'f' | null; age: number | null; note: string } | null
}

const GENDER_LABEL: Record<string, string> = { m: '남성', f: '여성' }

export default function CaregiverRequestsPage() {
  const supabase = createClient()
  const [requests, setRequests] = useState<CareRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
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

    const { data, error: fetchError } = await supabase
      .from('care_requests')
      .select('id, elder_id, start_at, duration_hours, needs, level_at_request, total_price, status, elder_snapshot')
      .eq('caregiver_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) setError(fetchError.message)
    setRequests((data as unknown as CareRequest[]) ?? [])
    setLoading(false)
  }

  async function respond(req: CareRequest, accept: boolean) {
    setActingId(req.id)
    setError(null)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setActingId(null)
      return
    }

    const { error: updateError } = await supabase
      .from('care_requests')
      .update({ status: accept ? 'matched' : 'cancelled' })
      .eq('id', req.id)

    if (updateError) {
      setError(updateError.message)
      setActingId(null)
      return
    }

    if (accept) {
      const start = new Date(req.start_at)
      const end = new Date(start.getTime() + req.duration_hours * 60 * 60 * 1000)
      await supabase.from('care_card_access_logs').insert({
        elder_id: req.elder_id,
        caregiver_id: user.id,
        care_request_id: req.id,
        access_granted_at: start.toISOString(),
        access_expires_at: end.toISOString(),
      })
    }

    await load()
    setActingId(null)
  }

  const pending = requests.filter((r) => r.status === 'matching')
  const others = requests.filter((r) => r.status !== 'matching')

  return (
    <main className="mx-auto min-h-screen max-w-sm px-6 py-10">
      <p className="text-xs tracking-wide text-neutral-400">요청 확인</p>
      <h1 className="mt-1 text-xl font-semibold">나에게 온 돌봄 요청</h1>

      {loading ? (
        <p className="mt-8 text-sm text-neutral-400">불러오는 중…</p>
      ) : requests.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-5 text-center text-sm text-neutral-500">
          아직 도착한 요청이 없어요.
          <br />
          가용 시간을 등록해두면 보호자가 찾아올 수 있어요.
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {[...pending, ...others].map((req) => {
            const start = new Date(req.start_at)
            const snap = req.elder_snapshot
            return (
              <div key={req.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {snap?.name ?? '어르신'}
                    {snap?.gender && ` · ${GENDER_LABEL[snap.gender]}`}
                    {snap?.age !== null && snap?.age !== undefined && ` · ${snap.age}세`}
                  </span>
                  <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                    {req.level_at_request}단계
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-600">
                  {start.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}{' '}
                  {start.getHours()}:00–{start.getHours() + req.duration_hours}:00 · {req.duration_hours}시간
                </p>
                <p className="mt-1 font-mono text-sm">{req.total_price.toLocaleString()}원</p>

                {req.needs?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {req.needs.map((n) => (
                      <span key={n} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
                        {n}
                      </span>
                    ))}
                  </div>
                )}

                {snap?.note && <p className="mt-2 text-xs text-neutral-500">“{snap.note}”</p>}

                {req.status === 'matching' ? (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => respond(req, true)}
                      disabled={actingId === req.id}
                      className="flex-1 rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      수락
                    </button>
                    <button
                      onClick={() => respond(req, false)}
                      disabled={actingId === req.id}
                      className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm text-neutral-600 disabled:opacity-50"
                    >
                      거절
                    </button>
                  </div>
                ) : req.status === 'matched' ? (
                  <Link
                    href={`/caregiver/requests/${req.id}/care-card`}
                    className="mt-3 block rounded-xl bg-neutral-900 py-2.5 text-center text-sm font-semibold text-white"
                  >
                    돌봄 프로필 카드 보기
                  </Link>
                ) : (
                  <p className="mt-3 text-xs text-neutral-400">
                    {req.status === 'cancelled' ? '거절/취소됨' : req.status}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </main>
  )
}
