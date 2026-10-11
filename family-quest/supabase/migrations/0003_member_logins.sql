-- 구성원별 로그인: 한 가족에 여러 계정을 연결하고, 계정을 구성원에 묶는다.
--  * family_users(user_id, family_id): 이 계정이 속한 가족
--  * members.user_id: 이 구성원으로 자동 선택되는 계정 (없으면 프로필 선택 화면)
--  * my_family_id() 는 family_users 를 본다 (소유자 외 계정도 가족 데이터 접근 가능)

create table public.family_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index family_users_family_idx on public.family_users (family_id);

alter table public.members add column user_id uuid unique references auth.users (id) on delete set null;

-- 기존 가족의 소유자를 연결
insert into public.family_users (user_id, family_id)
select owner_user_id, id from public.families
on conflict (user_id) do nothing;

create or replace function public.my_family_id()
returns uuid
language sql
stable
security definer
set search_path = public, extensions
as $$
  select family_id from public.family_users where user_id = auth.uid() limit 1
$$;

alter table public.family_users enable row level security;
create policy family_users_select on public.family_users for select using (user_id = auth.uid());

drop policy families_select on public.families;
create policy families_select on public.families for select
  using (id = public.my_family_id() or owner_user_id = auth.uid());
drop policy families_update on public.families;
create policy families_update on public.families for update
  using (id = public.my_family_id()) with check (id = public.my_family_id());

create or replace function public.set_admin_pin(pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if pin !~ '^\d{4}$' then
    raise exception 'PIN 은 숫자 4자리여야 합니다' using errcode = '22023';
  end if;
  update public.families
  set admin_pin_hash = extensions.crypt(pin, extensions.gen_salt('bf'))
  where id = public.my_family_id();
  if not found then
    raise exception '가족이 없습니다' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.verify_admin_pin(pin text)
returns boolean
language sql
security definer
set search_path = public, extensions
stable
as $$
  select coalesce(
    (select admin_pin_hash = extensions.crypt(pin, admin_pin_hash)
     from public.families
     where id = public.my_family_id() and admin_pin_hash is not null),
    false
  )
$$;

create or replace function public.create_family(
  family_name text,
  pin text,
  members_json jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  fid uuid;
  m jsonb;
  i integer := 0;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다' using errcode = '28000';
  end if;
  if exists (select 1 from public.family_users where user_id = auth.uid()) then
    raise exception '이미 가족에 속해 있습니다' using errcode = '23505';
  end if;
  if pin !~ '^\d{4}$' then
    raise exception 'PIN 은 숫자 4자리여야 합니다' using errcode = '22023';
  end if;
  if jsonb_array_length(members_json) < 2 or jsonb_array_length(members_json) > 5 then
    raise exception '구성원은 2~5명이어야 합니다' using errcode = '22023';
  end if;

  insert into public.families (owner_user_id, name, admin_pin_hash)
  values (auth.uid(), family_name, extensions.crypt(pin, extensions.gen_salt('bf')))
  returning id into fid;

  insert into public.family_users (user_id, family_id) values (auth.uid(), fid);

  for m in select * from jsonb_array_elements(members_json) loop
    insert into public.members (family_id, display_name, role, is_minor, color, birth_year_month, sex, height_cm, sort_order)
    values (
      fid,
      m->>'display_name',
      coalesce(m->>'role', 'member'),
      coalesce((m->>'is_minor')::boolean, false),
      coalesce(m->>'color', 'blue'),
      m->>'birth_year_month',
      m->>'sex',
      (m->>'height_cm')::numeric,
      i
    );
    i := i + 1;
  end loop;

  return fid;
end;
$$;

revoke execute on function public.my_family_id() from anon, public;
revoke execute on function public.set_admin_pin(text) from anon, public;
revoke execute on function public.verify_admin_pin(text) from anon, public;
revoke execute on function public.create_family(text, text, jsonb) from anon, public;
