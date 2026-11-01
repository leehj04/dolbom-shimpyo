'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcAge } from '@/lib/date'

type Elder = {
  id: string
  name: string
  elder_assessments: { level: number; hourly_rate: number; is_current: boolean }[]
}

type Caregiver = {
  profile_id: string
  career_years: number | null
  dementia_cert: boolean
  max_care_level: number | null
  birth_date: string | null
  photo_url: string | null
  service_areas: string[] | null
  profiles: { name: string } | null
}

export default function CaregiverListPage() {
  return (
    <Suspense fallback={null}>
      <CaregiverListInner />
    </Suspense>
  )
}

function CaregiverListInner() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const elderId = searchParams.get('elderId')

  const [elder, setElder] = useState<Elder | null>(null)
  const [caregivers, setCaregivers] = useState<Caregiver[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!elderId) {
      setError('어르신을 먼저 선택해주세요.')
      setLoading(false)
      return
    }
    load(elderId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elderId])

  async function load(id: string) {
    setLoading(true)
    setError(null)

    const { data: elderData, error: elderError } = await supabase
      .from('elders')
      .select('id, name, elder_assessments(level, hourly_rate, is_current)')
      .eq('id', id)
      .single()

    if (elderError || !elderData) {
      setError('어르신 정보를 불러오지 못했습니다.')
      setLoading(false)
      return
    }
    setElder(elderData)

    const current =
      elderData.elder_assessments?.find((a) => a.is_current) ?? elderData.elder_assessments?.[0]
    const level = current?.level ?? 1

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data: myProfile } = user
      ? await supabase.from('profiles').select('region').eq('id', user.id).single()
      : { data: null }

    let query = supabase
      .from('caregiver_profiles')
      .select(
        'profile_id, career_years, dementia_cert, max_care_level, birth_date, photo_url, service_areas, profiles(name)'
      )
      .eq('status', 'approved')
      .gte('max_care_level', level)

    if (myProfile?.region) {
      query = query.contains('service_areas', [myProfile.region])
    }

    const { data: caregiverData, error: caregiverError } = await query

    if (caregiverError) {
      setError(caregiverError.message)
      setLoading(false)
      return
    }

    setCaregivers((caregiverData as unknown as Caregiver[]) ?? [])
    setLoading(false)
  }

  const current = elder?.elder_assessments?.find((a) => a.is_current) ?? elder?.elder_assessments?.[0]

  return (
    <main className="mx-auto min-h-screen max-w-sm px-6 py-10">
      <p className="text-xs tracking-wide text-neutral-400">요양보호사 찾기</p>
      <h1 className="mt-1 text-xl font-semibold">
        {elder ? `${elder.name} 어르신을` : '어르신을'}
        <br />
        돌봐주실 분을 찾아보세요
      </h1>
      {current && (
        <p className="mt-2 text-sm text-neutral-500">
          {current.level}단계 돌봄이 가능한 요양보호사만 보여드려요.
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-neutral-400">불러오는 중…</p>
      ) : error ? (
        <p className="mt-8 text-sm text-red-600">{error}</p>
      ) : caregivers.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-5 text-center text-sm text-neutral-500">
          아직 조건에 맞는 요양보호사가 없어요.
          <br />
          곧 더 많은 분들이 등록될 예정이에요.
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {caregivers.map((c) => {
            const age = calcAge(c.birth_date)
            return (
              <Link
                key={c.profile_id}
                href={`/guardian/caregivers/${c.profile_id}/request?elderId=${elderId}`}
                className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-4"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-lg font-semibold text-neutral-400">
                  {c.profiles?.name?.[0] ?? '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{c.profiles?.name ?? '이름 미상'}</span>
                    {c.dementia_cert && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        치매전문교육 이수
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {age !== null ? `${age}세 · ` : ''}
                    경력 {c.career_years ?? 0}년 · {c.service_areas?.join(', ') || '활동 지역 미입력'}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    최대 {c.max_care_level}단계까지 돌봄 가능
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
