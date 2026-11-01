-- 어르신 1명당 돌봄 프로필 카드 1개 (upsert 대상)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'elder_care_cards_elder_id_key'
  ) then
    alter table elder_care_cards add constraint elder_care_cards_elder_id_key unique (elder_id);
  end if;
end $$;

-- 보호자 본인 어르신의 돌봄 프로필 카드 작성/조회/수정
drop policy if exists "보호자 본인 어르신 돌봄카드 열람" on elder_care_cards;
create policy "보호자 본인 어르신 돌봄카드 열람" on elder_care_cards for select
  using (exists (select 1 from elders e where e.id = elder_care_cards.elder_id and e.guardian_id = auth.uid()));

drop policy if exists "보호자 본인 어르신 돌봄카드 작성" on elder_care_cards;
create policy "보호자 본인 어르신 돌봄카드 작성" on elder_care_cards for insert
  with check (exists (select 1 from elders e where e.id = elder_care_cards.elder_id and e.guardian_id = auth.uid()));

drop policy if exists "보호자 본인 어르신 돌봄카드 수정" on elder_care_cards;
create policy "보호자 본인 어르신 돌봄카드 수정" on elder_care_cards for update
  using (exists (select 1 from elders e where e.id = elder_care_cards.elder_id and e.guardian_id = auth.uid()))
  with check (exists (select 1 from elders e where e.id = elder_care_cards.elder_id and e.guardian_id = auth.uid()));

-- 매칭되어 접근권한이 발급된 요양보호사는, 그 접근 기간(access_granted_at~access_expires_at) 동안만 돌봄카드 열람
drop policy if exists "요양보호사 매칭 기간 내 돌봄카드 열람" on elder_care_cards;
create policy "요양보호사 매칭 기간 내 돌봄카드 열람" on elder_care_cards for select
  using (exists (
    select 1 from care_card_access_logs l
    where l.elder_id = elder_care_cards.elder_id
      and l.caregiver_id = auth.uid()
      and now() between l.access_granted_at and l.access_expires_at
  ));

-- 요양보호사가 본인에게 발급된 접근 로그를 조회(만료 확인용)
drop policy if exists "요양보호사 본인 접근로그 열람" on care_card_access_logs;
create policy "요양보호사 본인 접근로그 열람" on care_card_access_logs for select
  using (auth.uid() = caregiver_id);
