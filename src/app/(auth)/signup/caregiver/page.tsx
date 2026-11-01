'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SEOUL_DISTRICTS } from '@/lib/seoulDistricts'

export default function CaregiverSignup() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({
    name: '',
    phone: '',
    serviceAreas: [] as string[],
    careerYears: '',
    dementiaCert: false,
    email: '',
    password: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function toggleArea(d: string) {
    setForm((prev) => ({
      ...prev,
      serviceAreas: prev.serviceAreas.includes(d)
        ? prev.serviceAreas.filter((x) => x !== d)
        : [...prev.serviceAreas, d],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.serviceAreas.length === 0) {
      setError('활동 가능한 구를 하나 이상 선택해주세요.')
      return
    }
    setLoading(true)
    setError(null)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          role: 'caregiver',
          name: form.name,
          phone: form.phone,
          region: form.serviceAreas[0],
          service_areas: form.serviceAreas,
          career_years: Number(form.careerYears) || 0,
          dementia_cert: form.dementiaCert,
        },
      },
    })
    if (signUpError || !data.user) {
      setError(signUpError?.message ?? '가입에 실패했습니다.')
      setLoading(false)
      return
    }

    // profiles/caregiver_profiles(status: pending)는 DB 트리거(handle_new_user)가 자동 생성합니다.
    if (!data.session) {
      // 이메일 인증이 켜져 있는 경우: 바로 로그인되지 않으므로 안내 후 로그인 화면으로
      router.push('/login?justSignedUp=1')
      return
    }

    router.push('/caregiver')
  }

  return (
    <main className="mx-auto min-h-screen max-w-sm px-6 py-10">
      <p className="text-xs tracking-wide text-neutral-400">요양보호사 가입</p>
      <h1 className="mt-1 text-xl font-semibold">기본 정보를 알려주세요</h1>
      <p className="mt-2 text-sm text-neutral-500">
        가입 후 시범사업 참여 승인이 필요합니다. 승인 전에는 요청을 받을 수 없어요.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Field label="이름">
          <input
            required
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="연락처">
          <input
            required
            className="input"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>
        <Field label="활동 가능 지역" hint="돌봄이 가능한 구를 모두 선택해주세요 (복수 선택 가능)">
          <div className="flex flex-wrap gap-2">
            {SEOUL_DISTRICTS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleArea(d)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  form.serviceAreas.includes(d)
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 bg-white text-neutral-600'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </Field>
        <Field label="경력 연차">
          <input
            required
            type="number"
            min={0}
            className="input"
            value={form.careerYears}
            onChange={(e) => setForm({ ...form, careerYears: e.target.value })}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.dementiaCert}
            onChange={(e) => setForm({ ...form, dementiaCert: e.target.checked })}
          />
          치매전문교육 이수
        </label>
        <Field label="이메일">
          <input
            required
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="비밀번호" hint="8자 이상 입력해주세요">
          <input
            required
            type="password"
            minLength={8}
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          disabled={loading}
          className="mt-2 rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? '가입 중…' : '요양보호사로 가입하기'}
        </button>
      </form>
    </main>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-neutral-500">{label}</span>
      {hint && <span className="-mt-1 text-xs text-neutral-400">{hint}</span>}
      {children}
    </label>
  )
}
