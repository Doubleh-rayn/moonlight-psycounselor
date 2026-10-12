-- 푸시 구독·발송 대상 함수 검증 (10_rls_test.sql 다음에 실행. 계정 A 의 가족이 이미 있다)
\set ON_ERROR_STOP on
reset role;
insert into private.push_config (key, value) values ('secret', 'test-secret');

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);

do $$
declare
  fid uuid := public.my_family_id();
  mom uuid;
  kid uuid;
  sub public.push_subscriptions;
  n int;
  t record;
  today date := public.seoul_today();
  dow int := extract(dow from public.seoul_today())::int;
begin
  select id into mom from public.members where family_id = fid and display_name = '엄마';
  select id into kid from public.members where family_id = fid and display_name = '아이';

  -- 구독 저장: 본인 가족 구성원에게만
  sub := public.save_push_subscription(mom, 'https://push.example/ep1', 'p256', 'auth', 'UA');
  if sub.member_id <> mom or sub.user_id <> auth.uid() then raise exception 'save_push_subscription wrong row'; end if;
  -- 같은 endpoint 로 다시 저장하면 교체된다 (행 1개 유지)
  sub := public.save_push_subscription(kid, 'https://push.example/ep1', 'p256', 'auth', 'UA');
  select count(*) into n from public.push_subscriptions where endpoint = 'https://push.example/ep1';
  if n <> 1 then raise exception 'endpoint should be unique, got %', n; end if;
  if sub.member_id <> kid then raise exception 'replacement should bind to kid'; end if;

end $$;

-- 발송 함수는 서버(anon + 비밀값) 몫이며 카운트 함수는 내부용 → 여기서는 superuser 로 검사
reset role;
do $$
declare
  fid uuid := (select id from public.families where name = 'A네');
  mom uuid;
  kid uuid;
  sub public.push_subscriptions;
  n int;
  t record;
  today date := public.seoul_today();
  dow int := extract(dow from public.seoul_today())::int;
begin
  select id into mom from public.members where family_id = fid and display_name = '엄마';
  select id into kid from public.members where family_id = fid and display_name = '아이';
  select * into sub from public.push_subscriptions where endpoint = 'https://push.example/ep1';

  -- 오늘 예정 수: 엄마는 요일형 {1,3,5} 1개 + 매일 가족 공동 1개
  select * into t from public.push_today_counts(mom, today);
  if dow in (1,3,5) then
    if t.total <> 2 then raise exception 'mom total expected 2, got %', t.total; end if;
  else
    if t.total <> 1 then raise exception 'mom total expected 1, got %', t.total; end if;
  end if;
  if t.remaining <> t.total then raise exception 'nothing checked today yet'; end if;

  -- 아이의 오늘 가족 공동 목표를 완료하면 남은 수가 준다
  insert into public.checkins (family_id, goal_id, member_id, date, done)
  select fid, id, kid, today, true from public.quests where family_id = fid and owner_member_id is null;
  select * into t from public.push_today_counts(kid, today);
  if t.total <> 1 or t.remaining <> 0 then raise exception 'kid expected 1/0, got %/%', t.total, t.remaining; end if;

  -- push_due: 잘못된 비밀값은 거부
  begin
    perform public.push_due('wrong', 'morning');
    raise exception 'push_due should reject wrong secret';
  exception when others then
    if sqlerrm <> 'invalid secret' then raise; end if;
  end;

  -- 아침: 아이(예정 1) 에게 간다. 저녁: 아이는 다 했으므로 0건
  select count(*) into n from public.push_due('test-secret', 'morning');
  if n <> 1 then raise exception 'morning expected 1, got %', n; end if;
  select count(*) into n from public.push_due('test-secret', 'evening');
  if n <> 0 then raise exception 'evening expected 0, got %', n; end if;
  select body into t from public.push_due('test-secret', 'morning');
  if t.body not like '아이, 오늘 퀘스트 1개%' then raise exception 'unexpected body %', t.body; end if;

  -- push_report: gone 이면 삭제
  perform public.push_report('test-secret', jsonb_build_array(jsonb_build_object('id', sub.id, 'status', 'gone')));
  select count(*) into n from public.push_subscriptions;
  if n <> 0 then raise exception 'gone subscription should be deleted'; end if;

end $$;

-- 삭제 RPC 는 가족 범위 (계정 A 로)
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
do $$
declare
  fid uuid := public.my_family_id();
  mom uuid;
  n int;
begin
  select id into mom from public.members where family_id = fid and display_name = '엄마';
  perform public.save_push_subscription(mom, 'https://push.example/ep2', 'p256', 'auth', null);
  perform public.delete_push_subscription('https://push.example/ep2');
  select count(*) into n from public.push_subscriptions;
  if n <> 0 then raise exception 'delete_push_subscription failed'; end if;
end $$;

-- 다른 계정(B)은 private 스키마·카운트 함수를 부를 수 없다
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', false);
do $$
begin
  begin
    perform private.push_secret_ok('x');
    raise exception 'anon/authenticated must not execute private.push_secret_ok';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.push_today_counts('11111111-1111-1111-1111-111111111111', current_date);
    raise exception 'authenticated must not execute push_today_counts';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'push tests ok' as result;
