-- 돌봄쉼표 초기 스키마
-- 원칙: 플랫폼은 결제에서 수수료를 떼지 않는다. 포인트는 "자가돌봄 행위"에만 지급한다.
-- 보호자-요양보호사 직접 거래 금지 → 모든 결제는 payments 테이블을 거쳐야 한다.

create extension if not exists "pgcrypto";

-- ───────── 1. 사용자 ─────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('guardian','caregiver','admin')),
  name text not null,
  phone text,
  region text,
  consent_at timestamptz,
  consent_version text,
  created_at timestamptz not null default now()
);

create table guardian_profiles (
  profile_id uuid primary key references profiles(id) on delete cascade,
  points int not null default 0
);

create table caregiver_profiles (
  profile_id uuid primary key references profiles(id) on delete cascade,
  career_years int,
  dementia_cert boolean not null default false,
  max_care_level int check (max_care_level between 1 and 3),
  service_radius_min int,
  status text not null default 'pending' check (status in ('pending','approved','suspended')),
  -- 요양보호사가 돈을 받을 계좌 (PG 정산용. 번호 자체는 PG사가 보관하고 여기엔 참조 토큰만 저장 권장)
  payout_account_ref text
);

-- ───────── 2. 어르신 & 난이도 산정 ─────────
create table elders (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  birth_date date,
  dementia_type text check (dementia_type in ('mci','alz','young','etc')),
  created_at timestamptz not null default now()
);

create table elder_assessments (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid not null references elders(id) on delete cascade,
  cognition_score int not null,
  adl_items jsonb not null default '{}',
  adl_total int not null,
  bpsd_items jsonb not null default '[]',
  bpsd_total int not null,
  mobility_score int not null,
  total_score int not null,
  level int not null check (level between 1 and 3),
  hourly_rate int not null,
  assessed_at timestamptz not null default now(),
  is_current boolean not null default true
);

create table elder_care_cards (
  elder_id uuid primary key references elders(id) on delete cascade,
  preferred_address text,
  interests jsonb default '[]',
  effective_methods jsonb default '[]',
  distress_triggers jsonb default '[]',
  wandering_history text,
  fall_risk text check (fall_risk in ('low','mid','high')),
  allergies text,
  mobility_note text,
  emergency_contact text,
  medication_note text,
  updated_at timestamptz not null default now()
);

create table care_card_access_logs (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid not null references elders(id) on delete cascade,
  caregiver_id uuid not null references profiles(id) on delete cascade,
  care_request_id uuid not null,
  access_granted_at timestamptz not null default now(),
  access_expires_at timestamptz not null,
  accessed_at timestamptz[] default '{}'
);

-- ───────── 3. 신청 & 매칭 ─────────
create table care_requests (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid not null references elders(id) on delete cascade,
  guardian_id uuid not null references profiles(id) on delete cascade,
  caregiver_id uuid references profiles(id),
  start_at timestamptz not null,
  duration_hours int not null check (duration_hours between 2 and 4),
  needs jsonb default '[]',
  level_at_request int not null,
  rate_at_request int not null,
  total_price int not null,
  status text not null default 'open'
    check (status in ('open','matching','matched','in_progress','completed','cancelled')),
  created_at timestamptz not null default now()
);

alter table care_card_access_logs
  add constraint care_card_access_logs_request_fk
  foreign key (care_request_id) references care_requests(id) on delete cascade;

create table caregiver_availability (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references profiles(id) on delete cascade,
  available_date date not null,
  start_hour int not null,
  end_hour int not null
);

create table match_offers (
  id uuid primary key default gen_random_uuid(),
  care_request_id uuid not null references care_requests(id) on delete cascade,
  caregiver_id uuid not null references profiles(id) on delete cascade,
  offered_at timestamptz not null default now(),
  responded_at timestamptz,
  response text not null default 'pending' check (response in ('pending','accepted','declined','expired'))
);

-- ───────── 4. 결제 (플랫폼 경유 필수, 수수료 없음) ─────────
create table payments (
  id uuid primary key default gen_random_uuid(),
  care_request_id uuid not null references care_requests(id) on delete cascade,
  guardian_id uuid not null references profiles(id),
  amount int not null,
  pg_provider text,              -- 예: 'portone'
  pg_transaction_id text,
  method text check (method in ('card','transfer')),
  status text not null default 'pending'
    check (status in ('pending','paid','failed','refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table payouts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  caregiver_id uuid not null references profiles(id),
  amount int not null, -- payments.amount와 동일 (수수료 0%, 전액 지급)
  status text not null default 'pending' check (status in ('pending','settled','failed')),
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

-- ───────── 5. 부담·건강 체크 ─────────
create table assessment_forms (
  id uuid primary key default gen_random_uuid(),
  form_type text not null check (form_type in ('zbi12','npiq','phq9')),
  item_order int not null,
  item_text text not null,
  max_score int not null
);

create table assessment_responses (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references profiles(id) on delete cascade,
  form_type text not null check (form_type in ('zbi12','npiq','phq9')),
  answers jsonb not null,
  total_score int not null,
  submitted_at timestamptz not null default now()
);

-- ───────── 6. 보호자 교육 & 포인트 (자가돌봄 행위에만 지급) ─────────
create table education_lessons (
  id uuid primary key default gen_random_uuid(),
  lesson_order int not null,
  title text not null,
  category text,
  duration_min int,
  points int not null default 10
);

create table education_progress (
  guardian_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references education_lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (guardian_id, lesson_id)
);

create table point_ledger (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references profiles(id) on delete cascade,
  amount int not null,
  reason text not null, -- 'education_complete' | 'self_check_zbi12' | 'support_group' | 'health_checkup' | 'redeem'
  created_at timestamptz not null default now()
);

-- ───────── RLS ─────────
alter table profiles enable row level security;
alter table guardian_profiles enable row level security;
alter table caregiver_profiles enable row level security;
alter table elders enable row level security;
alter table elder_assessments enable row level security;
alter table elder_care_cards enable row level security;
alter table care_card_access_logs enable row level security;
alter table care_requests enable row level security;
alter table caregiver_availability enable row level security;
alter table match_offers enable row level security;
alter table payments enable row level security;
alter table payouts enable row level security;
alter table assessment_responses enable row level security;
alter table education_progress enable row level security;
alter table point_ledger enable row level security;

-- 본인 프로필만 조회/수정
create policy "본인 프로필 조회" on profiles for select using (auth.uid() = id);
create policy "본인 프로필 수정" on profiles for update using (auth.uid() = id);
create policy "가입 시 본인 프로필 생성" on profiles for insert with check (auth.uid() = id);

create policy "본인 보호자 상세 조회" on guardian_profiles for select using (auth.uid() = profile_id);
create policy "본인 요양보호사 상세 조회" on caregiver_profiles for select using (auth.uid() = profile_id);
-- 요양보호사 기본 정보는 매칭을 위해 다른 가입자도 조회 가능하게 별도 뷰로 공개 (추후 추가)

create policy "본인 어르신만 조회" on elders for select using (auth.uid() = guardian_id);
create policy "본인 어르신만 등록" on elders for insert with check (auth.uid() = guardian_id);

create policy "본인 어르신 평가만 조회" on elder_assessments for select
  using (exists (select 1 from elders e where e.id = elder_assessments.elder_id and e.guardian_id = auth.uid()));

-- 돌봄 프로필 카드: 보호자 본인 + 유효한 접근권한을 가진 요양보호사만
create policy "보호자 본인 카드 조회" on elder_care_cards for select
  using (exists (select 1 from elders e where e.id = elder_care_cards.elder_id and e.guardian_id = auth.uid()));

create policy "매칭된 요양보호사 카드 조회" on elder_care_cards for select
  using (exists (
    select 1 from care_card_access_logs l
    where l.elder_id = elder_care_cards.elder_id
      and l.caregiver_id = auth.uid()
      and now() between l.access_granted_at and l.access_expires_at
  ));

create policy "본인 신청만 조회" on care_requests for select
  using (auth.uid() = guardian_id or auth.uid() = caregiver_id);
create policy "보호자 본인 신청 생성" on care_requests for insert with check (auth.uid() = guardian_id);

create policy "본인 가용시간 관리" on caregiver_availability for all using (auth.uid() = caregiver_id);

create policy "제안받은 요양보호사와 요청자만 조회" on match_offers for select
  using (auth.uid() = caregiver_id or exists (
    select 1 from care_requests r where r.id = match_offers.care_request_id and r.guardian_id = auth.uid()
  ));

create policy "본인 결제만 조회" on payments for select using (auth.uid() = guardian_id);
create policy "본인 정산만 조회" on payouts for select using (auth.uid() = caregiver_id);

create policy "본인 건강체크만 조회" on assessment_responses for all using (auth.uid() = guardian_id);
create policy "본인 교육이수만 조회" on education_progress for all using (auth.uid() = guardian_id);
create policy "본인 포인트만 조회" on point_ledger for select using (auth.uid() = guardian_id);
