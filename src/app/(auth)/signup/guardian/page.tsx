'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function GuardianSignup() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({ name: '', phone: '', region: '', email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          role: 'guardian',
          name: form.name,
          phone: form.phone,
          region: form.region,
        },
      },
    })
    if (signUpError || !data.user) {
      setError(signUpError?.message ?? '가입에 실패했습니다.')
      setLoading(false)
      return
    }

    // profiles/guardian_profiles는 DB 트리거(handle_new_user)가 자동 생성합니다.
    if (!data.session) {
      // 이메일 인증이 켜져 있는 경우: 바로 로그인되지 않으므로 안내 후 로그인 화면으로
      router.push('/login?justSignedUp=1')
      return
    }

    router.push('/guardian')
  }

  return (
    <main className="mx-auto min-h-screen max-w-sm px-6 py-10">
      <p className="text-xs tracking-wide text-neutral-400">보호자 가입</p>
      <h1 className="mt-1 text-xl font-semibold">기본 정보를 알려주세요</h1>

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
        <Field label="거주 지역">
          <input
            required
            placeholder="예: 강북구"
            className="input"
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
          />
        </Field>
        <Field label="이메일">
          <input
            required
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="비밀번호">
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
          {loading ? '가입 중…' : '보호자로 가입하기'}
        </button>
      </form>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-neutral-500">{label}</span>
      {children}
    </label>
  )
}
