import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function CaregiverHome() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single()
  const { data: caregiver } = await supabase
    .from('caregiver_profiles')
    .select('status, career_years, dementia_cert')
    .eq('profile_id', user.id)
    .single()

  const { count: pendingCount } = await supabase
    .from('care_requests')
    .select('id', { count: 'exact', head: true })
    .eq('caregiver_id', user.id)
    .eq('status', 'matching')

  return (
    <main className="mx-auto min-h-screen max-w-sm px-6 py-10">
      <p className="text-xs tracking-wide text-neutral-400">요양보호사 홈</p>
      <h1 className="mt-1 text-xl font-semibold">{profile?.name ?? ''} 님, 안녕하세요</h1>
      <p className="mt-1 text-sm text-neutral-400">
        경력 {caregiver?.career_years ?? 0}년 · 치매전문교육 {caregiver?.dementia_cert ? '이수' : '미이수'}
      </p>

      {caregiver?.status === 'pending' && (
        <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          시범사업 참여 승인 대기 중입니다. 승인 전에는 돌봄 요청을 받을 수 없어요.
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <Link
          href="/caregiver/requests"
          className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4"
        >
          <div>
            <p className="text-sm font-semibold">돌봄 요청 확인</p>
            <p className="mt-0.5 text-xs text-neutral-400">열어 둔 시간에 맞는 요청이 도착합니다</p>
          </div>
          {!!pendingCount && (
            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white">
              {pendingCount}
            </span>
          )}
        </Link>

        <Link
          href="/caregiver/availability"
          className="rounded-2xl border border-neutral-200 bg-white p-4"
        >
          <p className="text-sm font-semibold">가용 시간 등록</p>
          <p className="mt-0.5 text-xs text-neutral-400">돌봄 요청을 받을 시간대를 열어두세요</p>
        </Link>
      </div>

      <p className="mt-8 text-sm text-neutral-400">다음으로 정산 내역 화면이 이어집니다.</p>
    </main>
  )
}
