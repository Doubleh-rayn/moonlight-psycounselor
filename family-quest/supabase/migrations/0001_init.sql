-- =============================================================================
-- 가족 퀘스트 — 초기 스키마 (PLAN.md 4절)
-- 실행: Supabase 대시보드 SQL Editor 에 붙여넣기, 또는 `supabase db push`
-- 규칙
--   * 모든 테이블에 family_id 를 두고, RLS 는 "행의 family 가 로그인 계정 소유" 한 가지만 쓴다.
--   * 스티커 잔액은 저장하지 않고 뷰(member_sticker_balances, family_sticker_balances)로 계산한다.
--   * 목표는 삭제하지 않고 active=false 로 비활성화한다.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 공통 함수
-- -----------------------------------------------------------------------------

-- 한국 시간 기준 오늘 날짜
create or replace function public.seoul_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Seoul')::date
$$;

-- -----------------------------------------------------------------------------
-- 테이블
-- -----------------------------------------------------------------------------

create table public.families (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  admin_pin_hash text,
  created_at timestamptz not null default now(),
  unique (owner_user_id)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 20),
  role text not null check (role in ('admin', 'member')),
  is_minor boolean not null default false,
  color text not null check (color in ('blue', 'peach', 'mint', 'lavender', 'pink')),
  birth_year_month text check (birth_year_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  sex text check (sex in ('male', 'female')),
  height_cm numeric(5, 1) check (height_cm is null or height_cm between 50 and 250),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index members_family_idx on public.members (family_id, sort_order);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  start_weight numeric(5, 1) not null check (start_weight > 0),
  target_weight numeric(5, 1) not null check (target_weight > 0),
  weeks integer not null check (weeks >= 1),
  activity_level text not null default 'light' check (activity_level in ('light', 'moderate', 'active')),
  -- 'maintain' 계획은 감량 없이 유지만 한다 (미성년 BMI 85백분위수 미만)
  kind text not null default 'loss' check (kind in ('loss', 'maintain')),
  start_date date not null default public.seoul_today(),
  status text not null default 'active' check (status in ('active', 'done')),
  created_at timestamptz not null default now()
);
create index plans_member_idx on public.plans (member_id, status);

create table public.plan_weeks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete cascade,
  week_no integer not null check (week_no >= 1),
  stage text not null check (stage in ('adapt', 'expand', 'strengthen', 'maintain')),
  diet_ratio numeric(3, 2) not null check (diet_ratio between 0 and 1),
  daily_deficit numeric(6, 1) not null default 0,
  diet_kcal numeric(6, 1) not null default 0,
  exercise_kcal numeric(6, 1) not null default 0,
  exercise_minutes_per_week numeric(6, 1) not null default 0,
  -- null = 아직 평가 전, true/false = 평가 결과
  passed boolean,
  -- 미통과로 연장된 주인지
  extended boolean not null default false,
  unique (plan_id, week_no)
);

create table public.quests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  -- null 이면 가족 공동 목표
  owner_member_id uuid references public.members (id) on delete cascade,
  type text not null check (type in ('diet', 'exercise', 'habit')),
  category text check (category in ('tidy', 'study', 'sleep', 'etc')),
  title text not null check (char_length(title) between 1 and 60),
  measure text not null default 'done' check (measure in ('done', 'count', 'minutes')),
  target_value numeric(6, 1) not null default 1 check (target_value > 0),
  -- 0(일)~6(토). 비어 있으면 주 N회 방식
  days_of_week integer[] not null default '{}',
  weekly_target integer check (weekly_target is null or weekly_target between 1 and 7),
  stickers integer not null default 1 check (stickers between 1 and 5),
  status text not null default 'approved' check (status in ('proposed', 'approved')),
  source text not null default 'manual' check (source in ('manual', 'plan')),
  plan_id uuid references public.plans (id) on delete set null,
  -- 이 목표가 어느 단계용인지 (source=plan 일 때)
  plan_stage text check (plan_stage in ('adapt', 'expand', 'strengthen', 'maintain')),
  created_by_member_id uuid references public.members (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (type <> 'habit' or category is not null),
  check (cardinality(days_of_week) > 0 or weekly_target is not null)
);
create index quests_family_idx on public.quests (family_id, active);

create table public.goal_changes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  goal_id uuid not null references public.quests (id) on delete cascade,
  old_target numeric(6, 1),
  new_target numeric(6, 1),
  changed_by uuid references public.members (id) on delete set null,
  changed_at timestamptz not null default now()
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  goal_id uuid not null references public.quests (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  date date not null,
  value numeric(6, 1) not null default 0 check (value >= 0),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (goal_id, member_id, date)
);
create index checkins_family_date_idx on public.checkins (family_id, date);
create index checkins_member_date_idx on public.checkins (member_id, date);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  cost integer not null check (cost between 1 and 999),
  scope text not null default 'personal' check (scope in ('personal', 'family')),
  -- 구성원이 제안하면 proposed, 관리자 승인 후 approved
  status text not null default 'approved' check (status in ('proposed', 'approved')),
  proposed_by_member_id uuid references public.members (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index rewards_family_idx on public.rewards (family_id, active);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  reward_id uuid not null references public.rewards (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'approved', 'fulfilled', 'rejected')),
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  fulfilled_at timestamptz
);
create index redemptions_family_idx on public.redemptions (family_id, status);

create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  date date not null,
  weight numeric(5, 1) not null check (weight > 0),
  created_at timestamptz not null default now(),
  unique (member_id, date)
);

create table public.cheers (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  from_member_id uuid not null references public.members (id) on delete cascade,
  to_member_id uuid not null references public.members (id) on delete cascade,
  date date not null default public.seoul_today(),
  message text not null check (char_length(message) between 1 and 60),
  created_at timestamptz not null default now()
);
create index cheers_to_idx on public.cheers (to_member_id, date);

-- 단계 통과 보너스 등 체크 외 스티커 지급 내역 (PLAN.md 5.2 "보너스 스티커 5개")
create table public.sticker_bonuses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  amount integer not null check (amount between 1 and 100),
  reason text not null,
  -- 같은 사유로 두 번 지급되지 않게 (예: plan_week:<id>)
  reason_key text unique,
  created_at timestamptz not null default now()
);

-- updated_at 자동 갱신
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger checkins_touch before update on public.checkins
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- 스티커 잔액 뷰 (저장하지 않고 계산)
--   개인: 개인 목표 체크 완료 스티커 + 보너스 − 승인·지급된 개인 보상 비용
--   가족: 가족 공동 목표를 그날 활성 구성원 전원이 완료한 날의 스티커 − 승인·지급된 가족 보상 비용
-- -----------------------------------------------------------------------------

create or replace view public.member_sticker_balances
with (security_invoker = true)
as
with earned as (
  select c.member_id, sum(g.stickers)::integer as amount
  from public.checkins c
  join public.quests g on g.id = c.goal_id
  where c.done and g.owner_member_id is not null
  group by c.member_id
),
bonus as (
  select member_id, sum(amount)::integer as amount
  from public.sticker_bonuses
  group by member_id
),
spent as (
  select r.member_id, sum(rw.cost)::integer as amount
  from public.redemptions r
  join public.rewards rw on rw.id = r.reward_id
  where r.status in ('approved', 'fulfilled') and rw.scope = 'personal'
  group by r.member_id
)
select
  m.family_id,
  m.id as member_id,
  coalesce(e.amount, 0) as earned,
  coalesce(b.amount, 0) as bonus,
  coalesce(s.amount, 0) as spent,
  coalesce(e.amount, 0) + coalesce(b.amount, 0) - coalesce(s.amount, 0) as balance
from public.members m
left join earned e on e.member_id = m.id
left join bonus b on b.member_id = m.id
left join spent s on s.member_id = m.id;

create or replace view public.family_sticker_balances
with (security_invoker = true)
as
with family_days as (
  -- 가족 공동 목표 × 날짜별로 완료한 구성원 수
  select g.family_id, g.id as goal_id, g.stickers, c.date, count(distinct c.member_id) as done_count
  from public.quests g
  join public.checkins c on c.goal_id = g.id and c.done
  where g.owner_member_id is null
  group by g.family_id, g.id, g.stickers, c.date
),
earned as (
  select fd.family_id, sum(fd.stickers)::integer as amount
  from family_days fd
  where fd.done_count >= (
    select count(*) from public.members m where m.family_id = fd.family_id and m.active
  )
  group by fd.family_id
),
spent as (
  select r.family_id, sum(rw.cost)::integer as amount
  from public.redemptions r
  join public.rewards rw on rw.id = r.reward_id
  where r.status in ('approved', 'fulfilled') and rw.scope = 'family'
  group by r.family_id
)
select
  f.id as family_id,
  coalesce(e.amount, 0) as earned,
  coalesce(s.amount, 0) as spent,
  coalesce(e.amount, 0) - coalesce(s.amount, 0) as balance
from public.families f
left join earned e on e.family_id = f.id
left join spent s on s.family_id = f.id;

-- -----------------------------------------------------------------------------
-- 가족 조회 함수 (테이블 생성 뒤에 정의해야 한다)
-- -----------------------------------------------------------------------------

-- 로그인한 계정이 소유한 가족 id (가족 계정은 1개뿐이므로 1행)
create or replace function public.my_family_id()
returns uuid
language sql
stable
security definer
set search_path = public, extensions
as $$
  select id from public.families where owner_user_id = auth.uid() limit 1
$$;

-- -----------------------------------------------------------------------------
-- 관리자 PIN (해시 저장, bcrypt). PIN 원문은 저장하지 않는다.
-- -----------------------------------------------------------------------------

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
  where owner_user_id = auth.uid();
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
     where owner_user_id = auth.uid() and admin_pin_hash is not null),
    false
  )
$$;

-- 최초 가족 생성: 가족 + PIN + 구성원을 한 번에 (트랜잭션)
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
  if pin !~ '^\d{4}$' then
    raise exception 'PIN 은 숫자 4자리여야 합니다' using errcode = '22023';
  end if;
  if jsonb_array_length(members_json) < 2 or jsonb_array_length(members_json) > 5 then
    raise exception '구성원은 2~5명이어야 합니다' using errcode = '22023';
  end if;

  insert into public.families (owner_user_id, name, admin_pin_hash)
  values (auth.uid(), family_name, extensions.crypt(pin, extensions.gen_salt('bf')))
  returning id into fid;

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

-- -----------------------------------------------------------------------------
-- RLS: 모든 테이블에 "행의 family 가 로그인 계정 소유일 때만" 정책
-- -----------------------------------------------------------------------------

alter table public.families enable row level security;
create policy families_select on public.families for select using (owner_user_id = auth.uid());
create policy families_insert on public.families for insert with check (owner_user_id = auth.uid());
create policy families_update on public.families for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy families_delete on public.families for delete using (owner_user_id = auth.uid());

do $$
declare
  t text;
begin
  foreach t in array array[
    'members', 'plans', 'plan_weeks', 'quests', 'goal_changes', 'checkins',
    'rewards', 'redemptions', 'weight_logs', 'cheers', 'sticker_bonuses'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all using (family_id = public.my_family_id()) with check (family_id = public.my_family_id())',
      t || '_family_only', t
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Realtime: 변경 구독 대상 테이블. RLS 가 구독에도 적용된다.
-- -----------------------------------------------------------------------------

alter table public.checkins replica identity full;
alter table public.quests replica identity full;
alter table public.redemptions replica identity full;
alter table public.weight_logs replica identity full;
alter table public.cheers replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.checkins, public.quests, public.redemptions, public.weight_logs, public.cheers,
      public.rewards, public.members, public.plans, public.plan_weeks, public.sticker_bonuses;
  end if;
end;
$$;
