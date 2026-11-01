'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type CareCard = {
  id?: string
  elder_id: string
  preferred_address: string
  interests: string
  effective_methods: string
  distress_triggers: string
  wandering_history: string
  fall_risk: boolean
  allergies: string
  mobility_note: string
  emergency_contact: string
  medication_note: string
}

const EMPTY: Omit<CareCard, 'elder_id'> = {
  preferred_address: '',
  interests: '',
  effective_methods: '',
  distress_triggers: '',
  wandering_history: '',
  fall_risk: false,
  allergies: '',
  mobility_note: '',
  emergency_contact: '',
  medication_note: '',
}

export default function CareCardPage({ params }: { params: Promise<{ elderId: string }> }) {
  const { elderId } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [elderName, setElderName] = useState('')
  const [card, setCard] = useState<Omit<CareCard, 'elder_id'>>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elderId])

  async function load() {
    setLoading(true)
    const { data: elder } = await supabase.from('elders').select('name').eq('id', elderId).single()
    setElderName(elder?.name ?? '')

    const { data: existing } = await supabase
      .from('elder_care_cards')
      .select(
        'preferred_address, interests, effective_methods, distress_triggers, wandering_history, fall_risk, allergies, mobility_note, emergency_contact, medication_note'
      )
      .eq('elder_id', elderId)
      .maybeSingle()

    if (existing) setCard(existing as Omit<CareCard, 'elder_id'>)
    setLoading(false)
  }

  function update<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setCard((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    const { error: upsertError } = await supabase
      .from('elder_care_cards')
      .upsert({ elder_id: elderId, ...card }, { onConflict: 'elder_id' })

    if (upsertError) {
      setError(upsertError.message)
      setSaving(false)
      return
    }

    setSaved(true)
    setSaving(false)
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
      <p className="text-xs tracking-wide text-neutral-400">돌봄 프로필 카드</p>
      <h1 className="mt-1 text-xl font-semibold">{elderName} 어르신</h1>
      <p className="mt-1 text-sm text-neutral-500">
        여기 적은 내용은 매칭이 확정된 요양보호사에게 방문 시간 동안만 공개돼요.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <Field label="선호하는 호칭" placeholder="예: 김순자 어르신, '여사님'으로 불러주세요">
          <input
            className="input w-full"
            value={card.preferred_address}
            onChange={(e) => update('preferred_address', e.target.value)}
          />
        </Field>

        <Field label="관심사 / 좋아하는 것" placeholder="예: 화초 가꾸기, 옛 가요 듣기">
          <textarea
            className="input w-full"
            rows={2}
            value={card.interests}
            onChange={(e) => update('interests', e.target.value)}
          />
        </Field>

        <Field label="효과적인 대처법" placeholder="예: 불안해하면 손을 잡고 천천히 말 걸어주면 가라앉음">
          <textarea
            className="input w-full"
            rows={2}
            value={card.effective_methods}
            onChange={(e) => update('effective_methods', e.target.value)}
          />
        </Field>

        <Field label="불안/흥분을 유발하는 요인" placeholder="예: 큰 소리, 낯선 사람이 갑자기 다가올 때">
          <textarea
            className="input w-full"
            rows={2}
            value={card.distress_triggers}
            onChange={(e) => update('distress_triggers', e.target.value)}
          />
        </Field>

        <Field label="배회 이력" placeholder="예: 오후 4~5시경 밖으로 나가려는 경향 있음">
          <textarea
            className="input w-full"
            rows={2}
            value={card.wandering_history}
            onChange={(e) => update('wandering_history', e.target.value)}
          />
        </Field>

        <div>
          <p className="mb-2 text-sm font-medium text-neutral-700">낙상 위험</p>
          <div className="flex gap-2">
            {[
              { v: true, label: '위험 있음' },
              { v: false, label: '해당 없음' },
            ].map((opt) => (
              <button
                key={String(opt.v)}
                onClick={() => update('fall_risk', opt.v)}
                className={`flex-1 rounded-xl border py-2 text-sm transition ${
                  card.fall_risk === opt.v
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 bg-white text-neutral-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="알레르기" placeholder="예: 땅콩, 특정 약물 알레르기">
          <input
            className="input w-full"
            value={card.allergies}
            onChange={(e) => update('allergies', e.target.value)}
          />
        </Field>

        <Field label="이동/보행 참고사항" placeholder="예: 보행기 사용, 왼쪽 무릎 통증">
          <textarea
            className="input w-full"
            rows={2}
            value={card.mobility_note}
            onChange={(e) => update('mobility_note', e.target.value)}
          />
        </Field>

        <Field label="복약 참고사항" placeholder="예: 아침 식후 혈압약 복용, 거부감 있을 수 있음">
          <textarea
            className="input w-full"
            rows={2}
            value={card.medication_note}
            onChange={(e) => update('medication_note', e.target.value)}
          />
        </Field>

        <Field label="응급 연락처" placeholder="예: 보호자 010-0000-0000">
          <input
            className="input w-full"
            value={card.emergency_contact}
            onChange={(e) => update('emergency_contact', e.target.value)}
          />
        </Field>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {saved && <p className="mt-3 text-sm text-emerald-600">저장했어요.</p>}

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => router.push('/guardian')}
          className="flex-1 rounded-xl border border-neutral-200 py-3 text-sm text-neutral-600"
        >
          돌아가기
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </main>
  )
}

function Field({
  label,
  placeholder,
  children,
}: {
  label: string
  placeholder: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-neutral-700">{label}</p>
      {children}
      <p className="mt-1 text-xs text-neutral-400">{placeholder}</p>
    </div>
  )
}
