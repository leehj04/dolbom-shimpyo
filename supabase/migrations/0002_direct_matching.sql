-- 매칭 방식 변경: 자동 브로드캐스트(match_offers) → 보호자가 요양보호사를 직접 보고 선택하는 1:1 지목 방식
-- care_requests.caregiver_id를 신청 시점에 바로 지정하고, status로 진행 상태를 관리한다.
--   'matching'  = 보호자가 특정 요양보호사에게 신청, 응답 대기
--   'matched'   = 요양보호사 수락
--   'cancelled' = 요양보호사 거절 또는 보호자 취소 (다른 요양보호사에게 재신청 가능)

-- 1) 요양보호사 프로필에 나이·사진 추가 (목록에서 보여줄 정보)
alter table caregiver_profiles add column if not exists birth_date date;
alter table caregiver_profiles add column if not exists photo_url text;

-- 2) 어르신 성별 추가 (신청서에 표기)
alter table elders add column if not exists gender text check (gender in ('m','f'));

-- 3) 더 이상 쓰지 않는 브로드캐스트 매칭 테이블 제거
drop table if exists match_offers;

-- 4) 보호자가 "승인된" 요양보호사 목록을 열람할 수 있도록 RLS 추가
create policy "보호자가 승인된 요양보호사 프로필 열람" on caregiver_profiles for select
  using (
    status = 'approved'
    and exists (select 1 from profiles me where me.id = auth.uid() and me.role = 'guardian')
  );

create policy "보호자가 요양보호사 기본정보 열람" on profiles for select
  using (
    role = 'caregiver'
    and exists (select 1 from caregiver_profiles cp where cp.profile_id = profiles.id and cp.status = 'approved')
    and exists (select 1 from profiles me where me.id = auth.uid() and me.role = 'guardian')
  );

create policy "보호자가 요양보호사 가용시간 열람" on caregiver_availability for select
  using (
    exists (
      select 1 from caregiver_profiles cp
      where cp.profile_id = caregiver_availability.caregiver_id and cp.status = 'approved'
    )
    and exists (select 1 from profiles me where me.id = auth.uid() and me.role = 'guardian')
  );

-- 5) care_requests에 대한 update 정책이 없었으므로 추가
--    - 지목받은 요양보호사가 수락/거절 시 상태 변경
--    - 보호자가 본인 신청을 취소
create policy "담당 요양보호사 응답 업데이트" on care_requests for update
  using (auth.uid() = caregiver_id)
  with check (auth.uid() = caregiver_id);

create policy "보호자 본인 신청 취소" on care_requests for update
  using (auth.uid() = guardian_id)
  with check (auth.uid() = guardian_id);
