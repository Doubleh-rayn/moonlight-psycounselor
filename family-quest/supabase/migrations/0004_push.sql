-- 0004: 웹 푸시 알림
--  * push_subscriptions: 브라우저(기기)마다 하나. 계정·구성원에 묶인다.
--  * private.push_config: 발송 서버가 아는 비밀값. anon/authenticated 는 볼 수 없다.
--  * push_today_counts(): 오늘 예정·남은 퀘스트 수 (앱의 todayCount 와 같은 규칙)
--  * push_due(): 발송 서버가 비밀값과 함께 호출해 보낼 대상·문구를 받는다
--  * push_report(): 발송 결과를 돌려받아 만료된 구독을 지운다
--  * save_push_subscription()/delete_push_subscription(): 같은 기기에서 다른 계정으로 바꿔 로그인해도 갈아끼울 수 있게 security definer
--  (원격 적용 메모: MCP 도구가 함수 본문 안의 delete 문에서 시간 초과를 내서 upsert + push_cleanup 분리 형태로 바꿨다)

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  morning boolean not null default true,
  evening boolean not null default true,
  fail_count integer not null default 0,
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index push_subscriptions_family_idx on public.push_subscriptions (family_id);

alter table public.push_subscriptions enable row level security;
create policy push_subscriptions_select on public.push_subscriptions for select
  using (user_id = auth.uid());
create policy push_subscriptions_update on public.push_subscriptions for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_subscriptions_delete on public.push_subscriptions for delete
  using (user_id = auth.uid());
-- insert 는 RPC(save_push_subscription) 로만 한다

-- ---------------------------------------------------------------- 비밀값
create schema if not exists private;
revoke all on schema private from public;
create table if not exists private.push_config (
  key text primary key,
  value text not null
);
revoke all on private.push_config from public;

create or replace function private.push_secret_ok(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = private
as $$
  select coalesce(p_secret, '') <> ''
     and exists (select 1 from private.push_config where key = 'secret' and value = p_secret);
$$;
revoke execute on function private.push_secret_ok(text) from public;

-- ---------------------------------------------------------------- 구독 저장/삭제
create or replace function public.save_push_subscription(
  p_member_id uuid,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns public.push_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  fid uuid := public.my_family_id();
  result public.push_subscriptions;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if fid is null then raise exception 'no family'; end if;
  if not exists (select 1 from public.members where id = p_member_id and family_id = fid) then
    raise exception 'member not in family';
  end if;
  if coalesce(p_endpoint, '') = '' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'invalid subscription';
  end if;
  -- 같은 기기(endpoint)의 이전 등록은 누구 것이든 현재 계정·구성원으로 갈아끼운다
  insert into public.push_subscriptions (family_id, member_id, user_id, endpoint, p256dh, auth, user_agent)
  values (fid, p_member_id, auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 200))
  on conflict (endpoint) do update
    set family_id = excluded.family_id, member_id = excluded.member_id, user_id = excluded.user_id,
        p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent,
        morning = true, evening = true, fail_count = 0, created_at = now()
  returning * into result;
  return result;
end;
$$;
revoke execute on function public.save_push_subscription(uuid, text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(uuid, text, text, text, text) to authenticated;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions
  where endpoint = p_endpoint
    and (user_id = auth.uid() or family_id = public.my_family_id());
$$;
revoke execute on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.delete_push_subscription(text) to authenticated;

-- ---------------------------------------------------------------- 오늘 예정·남은 수
-- 앱의 todayCount 규칙:
--  요일형: 오늘 요일이 days_of_week 에 있으면 예정 1
--  주 N회형: 이번 주(월~일) 완료 수가 N 미만이거나 오늘 완료했으면 예정 1
--  개인 목표(owner = 본인) + 가족 공동 목표(owner null) 모두 센다
create or replace function public.push_today_counts(p_member_id uuid, p_date date)
returns table (total integer, remaining integer)
language sql
stable
security definer
set search_path = public
as $$
  with g as (
    select q.id, q.days_of_week, q.weekly_target
    from public.quests q
    join public.members m on m.id = p_member_id
    where q.family_id = m.family_id
      and q.active and q.status = 'approved'
      and (q.owner_member_id = p_member_id or q.owner_member_id is null)
      and (q.created_at at time zone 'Asia/Seoul')::date <= p_date
  ),
  items as (
    select
      cardinality(g.days_of_week) = 0 as weekly,
      cardinality(g.days_of_week) > 0 and extract(dow from p_date)::int = any (g.days_of_week) as scheduled_today,
      coalesce((select c.done from public.checkins c
                where c.goal_id = g.id and c.member_id = p_member_id and c.date = p_date), false) as done_today,
      (select count(*) from public.checkins c
        where c.goal_id = g.id and c.member_id = p_member_id and c.done
          and c.date between (p_date - (extract(isodow from p_date)::int - 1))
                         and (p_date - (extract(isodow from p_date)::int - 1) + 6)
      ) >= coalesce(g.weekly_target, 0) as week_reached
    from g
  ),
  due as (
    select done_today
    from items
    where (weekly and (not week_reached or done_today)) or (not weekly and scheduled_today)
  )
  select count(*)::int as total,
         count(*) filter (where not done_today)::int as remaining
  from due;
$$;
revoke execute on function public.push_today_counts(uuid, date) from public, anon, authenticated;

-- ---------------------------------------------------------------- 발송 대상
create or replace function public.push_due(p_secret text, p_slot text)
returns table (id uuid, endpoint text, p256dh text, auth text, title text, body text, url text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  today date := public.seoul_today();
begin
  if not private.push_secret_ok(p_secret) then raise exception 'invalid secret'; end if;
  if p_slot not in ('morning', 'evening') then raise exception 'invalid slot'; end if;
  return query
    select s.id, s.endpoint, s.p256dh, s.auth,
           '가족 퀘스트'::text as title,
           case p_slot
             when 'morning' then m.display_name || ', 오늘 퀘스트 ' || t.total || '개가 기다려요. 하나씩 체크해 봐요!'
             else m.display_name || ', 오늘 아직 ' || t.remaining || '개 남았어요. 자기 전에 체크해요!'
           end as body,
           '/'::text as url
    from public.push_subscriptions s
    join public.members m on m.id = s.member_id and m.active
    cross join lateral public.push_today_counts(s.member_id, today) t
    where (p_slot = 'morning' and s.morning and t.total > 0)
       or (p_slot = 'evening' and s.evening and t.remaining > 0);
end;
$$;
revoke execute on function public.push_due(text, text) from public;
grant execute on function public.push_due(text, text) to anon, authenticated;

-- 5회 이상 실패한 구독 정리 (push_report 가 부른다)
create or replace function public.push_cleanup(p_secret text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions
  where private.push_secret_ok(p_secret) and fail_count >= 5;
$$;
revoke execute on function public.push_cleanup(text) from public, anon, authenticated;

-- 결과: [{"id": uuid, "status": "ok" | "gone" | "fail"}]
create or replace function public.push_report(p_secret text, p_results jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.push_secret_ok(p_secret) then raise exception 'invalid secret'; end if;
  -- gone(404/410) 은 바로 정리 대상(99), ok 는 초기화, fail 은 +1. 5회 이상은 push_cleanup 이 지운다
  update public.push_subscriptions s
  set last_sent_at = case when r.status = 'ok' then now() else s.last_sent_at end,
      fail_count = case r.status when 'ok' then 0 when 'gone' then 99 else s.fail_count + 1 end
  from jsonb_to_recordset(p_results) as r(id uuid, status text)
  where s.id = r.id and r.status in ('ok', 'gone', 'fail');
  perform public.push_cleanup(p_secret);
end;
$$;
revoke execute on function public.push_report(text, jsonb) from public;
grant execute on function public.push_report(text, jsonb) to anon, authenticated;
