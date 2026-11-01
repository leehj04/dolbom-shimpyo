import Link from 'next/link'

// 가입 첫 화면: 보호자/요양보호사 역할을 여기서 고정한다.
// 이후 화면·메뉴는 역할별로 완전히 분리된다 (middleware.ts 참고).
export default function SignupRoleSelect() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <p className="text-xs tracking-wide text-neutral-400">돌봄쉼표 가입</p>
        <h1 className="mt-1 text-xl font-semibold">
          어떤 역할로<br />가입하시나요?
        </h1>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/signup/guardian"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-900"
        >
          <div className="text-base font-semibold">보호자</div>
          <p className="mt-1 text-sm text-neutral-500">
            치매 어르신을 돌보고 있고, 짧은 시간 대체돌봄이 필요해요.
          </p>
        </Link>

        <Link
          href="/signup/caregiver"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-900"
        >
          <div className="text-base font-semibold">요양보호사</div>
          <p className="mt-1 text-sm text-neutral-500">
            가용 시간을 등록하고 돌봄 요청을 받고 싶어요.
          </p>
        </Link>
      </div>

      <p className="text-center text-sm text-neutral-400">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-neutral-900 underline">
          로그인
        </Link>
      </p>
    </main>
  )
}
