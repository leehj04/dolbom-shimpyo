-- 서울 25개 구 드롭다운 선택으로 전환. 요양보호사는 활동 가능 구역을 여러 개 선택할 수 있어야 하므로
-- caregiver_profiles에 별도 배열 컬럼(service_areas)을 둔다. (보호자는 profiles.region 그대로 단일 값 사용)

alter table caregiver_profiles add column if not exists service_areas text[] not null default '{}';

-- 가입 트리거 갱신: 요양보호사의 service_areas(복수 구)를 raw_user_meta_data에서 읽어 저장
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := new.raw_user_meta_data->>'role';
begin
  if v_role is null then
    return new;
  end if;

  insert into public.profiles (id, role, name, phone, region, consent_at, consent_version)
  values (
    new.id,
    v_role,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'region',
    now(),
    'v1'
  )
  on conflict (id) do nothing;

  if v_role = 'guardian' then
    insert into public.guardian_profiles (profile_id)
    values (new.id)
    on conflict (profile_id) do nothing;
  elsif v_role = 'caregiver' then
    insert into public.caregiver_profiles (profile_id, career_years, dementia_cert, status, service_areas)
    values (
      new.id,
      coalesce((new.raw_user_meta_data->>'career_years')::int, 0),
      coalesce((new.raw_user_meta_data->>'dementia_cert')::boolean, false),
      'pending',
      coalesce(
        (select array_agg(value) from jsonb_array_elements_text(new.raw_user_meta_data->'service_areas')),
        '{}'
      )
    )
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;
