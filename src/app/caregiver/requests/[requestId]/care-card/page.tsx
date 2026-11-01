'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type CareCard = {
  preferred_address: string | null
  interests: string | null
  effective_methods: string | null
  distress_triggers: string | null
  wandering_history: string | null
  fall_risk: boolean | null
  allergies: string | null
  mobility_note: string | null
  emergency_contact: string | null
  medication_note: string | null
}

export default function CaregiverCareCardPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = use(params)
  const supabase = createClient()

  const [elderName, setElderName] = useState<string | null>(null)
  const [card, setCard] = useState<CareCard | null>(null)
  const [accessWindow, setAccessWindow] = useState<{ from: string; to: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  async function load() {
    setLoading(true)
    setError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('로그인이 필요합니다.')
      setLoading(false)
      return
    }

    const { data: req, error: reqError } = await supabase
      .from('care_requests')
      .select('elder_id, status, elder_snapshot')
      .eq('id', requestId)
      .single()

    if (reqError || !req) {
      setError('요청 정보를 불러오지 못했습니다.')
      setLoading(false)
      return
    }
    if (req.status !== 'matched' && req.status !== 'in_progress' && req.status !== 'completed') {
      setError('아직 매칭이 확정되지 않은 요청이에요.')
      setLoading(false)
      return
    }

    setElderName((req.elder_snapshot as { name?: string } | null)?.name ?? '어르신')

    const { data: log } = await supabase
      .from('care_card_access_logs')
      .select('access_granted_at, access_expires_at')
      .eq('care_request_id', requestId)
      .eq('caregiver_id', user.id)
      .order('access_granted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (log) {
      setAccessWindow({ from: log.access_granted_at, to: log.access_expires_at })
    }

    const { data: cardData, error: cardError } = await supabase
      .from('elder_care_cards')
      .select(
        'preferred_address, interests, effective_methods, distress_triggers, wandering_history, fall_risk, allergies, mobility_note, emergency_contact, medication_note'
      )
      .eq('elder_id', req.elder_id)
      .maybeSingle()

    if (cardError) {
      // RLS가 접근 기간을 벗어났다고 막은 경우 결과가 비어 보일 수 있음
      setError(null)
    }
    setCard(cardData ?? null)
    setLoading(false)
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-sm px-6 py-10">
        <p className="text-sm text-neutral-400">불러오는 중…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto min-h-screen max-w-sm px-6 py-10">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/caregiver/requests" className="mt-4 block text-sm text-neutral-500 underline">
          돌아가기
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-sm px-6 py-10">
      <p className="text-xs tracking-wide text-neutral-400">돌봄 프로필 카드</p>
      <h1 className="mt-1 text-xl font-semibold">{elderName} 어르신</h1>
      {accessWindow && (
        <p className="mt-1 text-xs text-neutral-400">
          열람 가능 시간: {new Date(accessWindow.from).toLocaleString('ko-KR')} ~{' '}
          {new Date(accessWindow.to).toLocaleString('ko-KR')}
        </p>
      )}

      {!card ? (
        <p className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-5 text-center text-sm text-neutral-500">
          아직 보호자가 작성한 돌봄 프로필 카드가 없거나, 지금은 열람 가능한 시간이 아니에요.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <CardItem label="선호 호칭" value={card.preferred_address} />
          <CardItem label="관심사" value={card.interests} />
          <CardItem label="효과적인 대처법" value={card.effective_methods} />
          <CardItem label="불안/흥분 유발 요인" value={card.distress_triggers} />
          <CardItem label="배회 이력" value={card.wandering_history} />
          <CardItem label="낙상 위험" value={card.fall_risk ? '위험 있음' : '해당 없음'} highlight={!!card.fall_risk} />
          <CardItem label="알레르기" value={card.allergies} highlight={!!card.allergies} />
          <CardItem label="이동/보행 참고사항" value={card.mobility_note} />
          <CardItem label="복약 참고사항" value={card.medication_note} />
          <CardItem label="응급 연락처" value={card.emergency_contact} />
        </div>
      )}

      <Link href="/caregiver/requests" className="mt-8 block text-center text-sm text-neutral-500 underline">
        돌아가기
      </Link>
    </main>
  )
}

function CardItem({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  if (!value) return null
  return (
    <div className={`rounded-xl border p-3 ${highlight ? 'border-rose-200 bg-rose-50' : 'border-neutral-200 bg-white'}`}>
      <p className="text-xs text-neutral-400">{label}</p>
      <p className={`mt-1 text-sm ${highlight ? 'font-semibold text-rose-700' : 'text-neutral-700'}`}>{value}</p>
    </div>
  )
}
