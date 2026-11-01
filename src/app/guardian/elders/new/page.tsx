'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ADL_ITEMS,
  ADL_OPTIONS,
  BPSD_ITEMS,
  COGNITION_OPTIONS,
  MOBILITY_OPTIONS,
  computeAssessment,
  type AssessmentResult,
} from '@/lib/assessment'

type Step = 'info' | 'assessing' | 'result'

const DEMENTIA_TYPES = [
  { value: 'mci', label: '경도인지장애(MCI)' },
  { value: 'alz', label: '알츠하이머' },
  { value: 'young', label: '초로기 치매' },
  { value: 'etc', label: '기타·미확진' },
] as const

const ASSESS_MESSAGES = [
  '인지기능 항목 확인',
  '일상생활 수행능력 환산',
  '행동심리증상 가중치 적용',
  '거동 상태 반영',
]

export default function NewElderPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('info')
  const [assessMsg, setAssessMsg] = useState(ASSESS_MESSAGES[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 어르신 기본 정보
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<'m' | 'f'>('f')
  const [dementiaType, setDementiaType] = useState<string>('alz')

  // 평가 입력
  const [cognitionScore, setCognitionScore] = useState(0)
  const [adlItems, setAdlItems] = useState<Record<string, number>>(
    Object.fromEntries(ADL_ITEMS.map((i) => [i.key, 0]))
  )
  const [bpsdSelected, setBpsdSelected] = useState<string[]>([])
  const [mobilityScore, setMobilityScore] = useState(0)

  const [result, setResult] = useState<AssessmentResult | null>(null)

  function toggleBpsd(key: string) {
    setBpsdSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  function handleAssess(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !birthDate) {
      setError('어르신 성명과 생년월일을 입력해주세요.')
      return
    }
    setError(null)

    const computed = computeAssessment({ cognitionScore, adlItems, bpsdItems: bpsdSelected, mobilityScore })
    setResult(computed)
    setStep('assessing')

    // 프로토타입의 산정 중 애니메이션 재현
    let i = 0
    const timer = setInterval(() => {
      i++
      if (i < ASSESS_MESSAGES.length) {
        setAssessMsg(ASSESS_MESSAGES[i])
        return
      }
      clearInterval(timer)
      setStep('result')
    }, 650)
  }

  async function handleConfirm() {
    if (!result) return
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

    const { data: elder, error: elderError } = await supabase
      .from('elders')
      .insert({
        guardian_id: user.id,
        name,
        birth_date: birthDate,
        gender,
        dementia_type: dementiaType,
      })
      .select('id')
      .single()

    if (elderError || !elder) {
      setError(elderError?.message ?? '어르신 등록에 실패했습니다.')
      setSaving(false)
      return
    }

    const { error: assessmentError } = await supabase.from('elder_assessments').insert({
      elder_id: elder.id,
      cognition_score: result.cognitionScore,
      adl_items: result.adlItems,
      adl_total: result.adlTotal,
      bpsd_items: result.bpsdItems,
      bpsd_total: result.bpsdTotal,
      mobility_score: result.mobilityScore,
      total_score: result.totalScore,
      level: result.level,
      hourly_rate: result.hourlyRate,
      is_current: true,
    })

    if (assessmentError) {
      setError(assessmentError.message)
      setSaving(false)
      return
    }

    router.push('/guardian')
    router.refresh()
  }

  if (step === 'assessing') {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
        <h1 className="text-lg font-semibold">
          돌봄 난이도를
          <br />
          산정하고 있습니다
        </h1>
        <p className="mt-3 text-sm text-neutral-500">{assessMsg}</p>
      </main>
    )
  }

  if (step === 'result' && result) {
    return (
      <main className="mx-auto min-h-screen max-w-sm px-6 py-10">
        <p className="text-xs tracking-wide text-neutral-400">등록 완료 · 단가 확정</p>
        <div className="mt-2 inline-flex items-baseline gap-2 rounded-full bg-rose-50 px-4 py-1.5 text-sm font-semibold text-rose-700">
          <span className="text-lg">{result.level}단계</span>
          <span>{result.levelName}</span>
        </div>

        <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-5">
          <Row label="인지기능" value={`${result.cognitionScore}점`} />
          <Row label="일상생활수행(K-ADL)" value={`${result.adlTotal}점`} />
          <Row label="행동심리증상(BPSD)" value={`${result.bpsdTotal}점`} />
          <Row label="거동" value={`${result.mobilityScore}점`} />
          <div className="my-3 h-px bg-neutral-100" />
          <Row label="합계" value={`${result.totalScore} / 26점`} bold />
          <p className="mt-2 text-xs text-neutral-400">
            1단계 0–7점 20,000원 · 2단계 8–15점 25,000원 · 3단계 16점 이상 30,000원
          </p>
        </div>

        <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
          보호자와 요양보호사가 단가를 흥정하지 않습니다. 같은 상태의 어르신이면 누구에게나 같은
          단가 <strong>{result.hourlyRate.toLocaleString()}원/시간</strong>입니다.
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={saving}
          className="mt-6 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? '저장 중…' : '등록 완료'}
        </button>
        <p className="mt-3 text-center text-xs text-neutral-400">
          상태가 달라지면 언제든 다시 산정할 수 있고, 6개월마다 재평가를 안내합니다.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-sm px-6 py-10">
      <p className="text-xs tracking-wide text-neutral-400">가입 1 / 3</p>
      <h1 className="mt-1 text-xl font-semibold">
        어르신은 지금
        <br />
        어떤 상태이신가요?
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        한 번만 등록하면 돌봄 난이도와 시간당 단가가 자동으로 정해집니다.
      </p>

      <form onSubmit={handleAssess} className="mt-6 flex flex-col gap-6">
        <Field label="어르신 성명">
          <input required className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="생년월일">
          <input
            required
            type="date"
            className="input"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </Field>

        <Field label="성별">
          <ChipGroup
            options={[
              { value: 'f', label: '여성' },
              { value: 'm', label: '남성' },
            ]}
            value={gender}
            onChange={(v) => setGender(v as 'm' | 'f')}
          />
        </Field>

        <Field label="치매 유형">
          <ChipGroup
            options={DEMENTIA_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            value={dementiaType}
            onChange={setDementiaType}
          />
        </Field>

        <Field label="인지기능 상태">
          <SegGroup
            options={COGNITION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={cognitionScore}
            onChange={setCognitionScore}
          />
        </Field>

        <Field label="일상생활 수행능력 · K-ADL">
          <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
            {ADL_ITEMS.map((item) => (
              <div key={item.key} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-sm">{item.label}</span>
                <SegGroup
                  compact
                  options={ADL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  value={adlItems[item.key]}
                  onChange={(v) => setAdlItems((prev) => ({ ...prev, [item.key]: v }))}
                />
              </div>
            ))}
          </div>
        </Field>

        <Field label="행동심리증상(BPSD) · 해당 항목 모두 선택">
          <div className="flex flex-wrap gap-2">
            {BPSD_ITEMS.map((item) => (
              <button
                type="button"
                key={item.key}
                onClick={() => toggleBpsd(item.key)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  bpsdSelected.includes(item.key)
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 bg-white text-neutral-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="거동 상태">
          <SegGroup
            options={MOBILITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={mobilityScore}
            onChange={setMobilityScore}
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button className="rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white">
          난이도 산정하기
        </button>
      </form>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-neutral-500">{label}</span>
      {children}
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className={bold ? 'font-mono text-base font-semibold' : 'font-mono'}>{value}</span>
    </div>
  )
}

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          type="button"
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-full border px-3 py-1.5 text-xs transition ${
            value === opt.value
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-200 bg-white text-neutral-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function SegGroup({
  options,
  value,
  onChange,
  compact,
}: {
  options: { value: number; label: string }[]
  value: number
  onChange: (v: number) => void
  compact?: boolean
}) {
  return (
    <div className="flex flex-1 gap-1">
      {options.map((opt) => (
        <button
          type="button"
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-lg border px-2 text-center transition ${
            compact ? 'py-1.5 text-[11px]' : 'py-2.5 text-xs'
          } ${
            value === opt.value
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-200 bg-white text-neutral-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
