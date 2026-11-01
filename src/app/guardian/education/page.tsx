import Link from 'next/link'

export default function GuardianEducationPage() {
  return (
    <main className="mx-auto min-h-screen max-w-sm px-6 py-10">
      <p className="text-xs tracking-wide text-neutral-400">보호자 교육</p>
      <h1 className="mt-1 text-xl font-semibold">자가돌봄 교육</h1>

      <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center">
        <p className="text-sm text-neutral-500">
          교육 콘텐츠는 준비 중이에요.
          <br />
          영상 자료 저작권 확인 후 순차적으로 열릴 예정입니다.
        </p>
      </div>

      <Link href="/guardian" className="mt-6 block rounded-xl border border-neutral-200 py-3 text-center text-sm text-neutral-600">
        돌아가기
      </Link>
    </main>
  )
}
