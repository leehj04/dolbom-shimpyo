-- 가입 직후에는 클라이언트에 아직 로그인 세션이 없어 RLS가 profiles insert를 막는다.
-- auth.users에 새 사용자가 생기면, DB가 서버 권한(security definer)으로 profiles(+하위 프로필)를
-- 자동 생성하도록 해서, 클라이언트가 직접 insert할 필요를 없앤다.
-- 가입 폼에서 supabase.auth.signUp({ options: { data: {...} } })로 넘긴 raw_user_meta_data를 사용한다.

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
    insert into public.caregiver_profiles (profile_id, career_years, dementia_cert, status)
    values (
      new.id,
      coalesce((new.raw_user_meta_data->>'career_years')::int, 0),
      coalesce((new.raw_user_meta_data->>'dementia_cert')::boolean, false),
      'pending'
    )
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
