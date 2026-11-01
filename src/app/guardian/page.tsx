import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function GuardianHome() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single()

  const { data: elders } = await supabase
    .from('elders')
    .select('id, name, dementia_type, elder_assessments(level, hourly_rate, is_current)')
    .eq('guardian_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <main className="mx-auto min-h-screen max-w-sm px-6 py-10">
      <p className="text-xs tracking-wide text-neutral-400">보호자 홈</p>
      <h1 className="mt-1 text-xl font-semibold">{profile?.name ?? ''} 님, 안녕하세요</h1>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-700">등록된 어르신</p>
          <Link href="/guardian/elders/new" className="text-xs text-neutral-500 underline">
            + 새로 등록
          </Link>
        </div>

        {!elders || elders.length === 0 ? (
          <Link
            href="/guardian/elders/new"
            className="block rounded-2xl border border-dashed border-neutral-300 bg-white p-5 text-center text-sm text-neutral-500"
          >
            아직 등록된 어르신이 없어요.
            <br />
            <span className="font-semibold text-neutral-900">여기를 눌러 등록을 시작하세요.</span>
          </Link>
        ) : (
          <div className="flex flex-col gap-2">
            {elders.map((elder) => {
              const current = elder.elder_assessments?.find((a) => a.is_current) ?? elder.elder_assessments?.[0]
              return (
                <div key={elder.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{elder.name}</span>
                    {current && (
                      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                        {current.level}단계
                      </span>
                    )}
                  </div>
                  {current && (
                    <p className="mt-1 text-xs text-neutral-400">
                      시간당 {current.hourly_rate.toLocaleString()}원
                    </p>
                  )}
                  <Link
                    href={`/guardian/caregivers?elderId=${elder.id}`}
                    className="mt-3 block rounded-xl bg-neutral-900 py-2.5 text-center text-sm font-semibold text-white"
                  >
                    돌봄 신청하기
                  </Link>
                  <Link
                    href={`/guardian/elders/${elder.id}/care-card`}
                    className="mt-2 block rounded-xl border border-neutral-200 py-2.5 text-center text-sm text-neutral-600"
                  >
                    돌봄 프로필 카드 작성/수정
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-8">
        <Link
          href="/guardian/education"
          className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4"
        >
          <div>
            <p className="text-sm font-semibold">자가돌봄 교육</p>
            <p className="mt-0.5 text-xs text-neutral-400">완료하면 포인트를 받을 수 있어요</p>
          </div>
        </Link>
      </div>

      <p className="mt-6 text-sm text-neutral-400">다음으로 건강 체크(ZBI-12) 화면이 이어집니다.</p>
    </main>
  )
}
