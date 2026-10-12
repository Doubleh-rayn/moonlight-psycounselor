-- RLS·뷰·RPC 검증. 실패하면 raise exception 으로 멈춘다.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com');

-- ---------- 계정 A 가 가족을 만든다 ----------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);

select public.create_family('A네', '1234', '[
  {"display_name":"엄마","role":"admin","color":"blue"},
  {"display_name":"아이","role":"member","is_minor":true,"color":"mint","birth_year_month":"2015-03","sex":"female","height_cm":145.5}
]'::jsonb) as family_a \gset
create temp table ctx as select :'family_a'::uuid as family_a;

do $$
declare
  fid uuid := public.my_family_id();
  mom uuid;
  kid uuid;
  g_personal uuid;
  g_family uuid;
  rw uuid;
begin
  if fid is null then raise exception 'my_family_id() is null'; end if;
  select id into mom from public.members where family_id = fid and display_name = '엄마';
  select id into kid from public.members where family_id = fid and display_name = '아이';

  -- 개인 목표 (스티커 2) 와 가족 공동 목표 (스티커 3)
  insert into public.quests (family_id, owner_member_id, type, title, days_of_week, stickers)
  values (fid, mom, 'exercise', '빠르게 걷기 30분', '{1,3,5}', 2) returning id into g_personal;
  insert into public.quests (family_id, owner_member_id, type, title, days_of_week, stickers)
  values (fid, null, 'exercise', '저녁 산책', '{1,2,3,4,5,6,0}', 3) returning id into g_family;

  -- 엄마 개인 체크 2일 완료 → 4
  insert into public.checkins (family_id, goal_id, member_id, date, done) values
    (fid, g_personal, mom, '2026-10-05', true),
    (fid, g_personal, mom, '2026-10-07', true),
    (fid, g_personal, mom, '2026-10-09', false);

  -- 가족 공동: 10/05 는 둘 다 완료(성공, 3), 10/06 은 엄마만(실패)
  insert into public.checkins (family_id, goal_id, member_id, date, done) values
    (fid, g_family, mom, '2026-10-05', true),
    (fid, g_family, kid, '2026-10-05', true),
    (fid, g_family, mom, '2026-10-06', true);

  -- 보너스 5
  insert into public.sticker_bonuses (family_id, member_id, amount, reason, reason_key)
  values (fid, mom, 5, '적응 단계 통과', 'test:adapt');

  -- 개인 보상 3 승인 → 엄마 잔액 4 + 5 − 3 = 6
  insert into public.rewards (family_id, title, cost, scope) values (fid, '영화 보기', 3, 'personal') returning id into rw;
  insert into public.redemptions (family_id, reward_id, member_id, status) values (fid, rw, mom, 'approved');
  -- 신청만 한 건은 차감되지 않는다
  insert into public.redemptions (family_id, reward_id, member_id, status) values (fid, rw, mom, 'requested');
end;
$$;

-- 잔액 검증
do $$
declare
  b integer;
  fb integer;
begin
  select balance into b from public.member_sticker_balances m
    join public.members mm on mm.id = m.member_id where mm.display_name = '엄마';
  if b <> 6 then raise exception '엄마 잔액 기대 6, 실제 %', b; end if;

  select balance into b from public.member_sticker_balances m
    join public.members mm on mm.id = m.member_id where mm.display_name = '아이';
  if b <> 0 then raise exception '아이 잔액 기대 0, 실제 %', b; end if;

  select balance into fb from public.family_sticker_balances;
  if fb <> 3 then raise exception '가족 잔액 기대 3, 실제 %', fb; end if;
  raise notice 'OK 잔액: 엄마 %, 가족 %', 6, fb;
end;
$$;

-- PIN 검증
do $$
begin
  if not public.verify_admin_pin('1234') then raise exception 'PIN 1234 가 맞아야 한다'; end if;
  if public.verify_admin_pin('0000') then raise exception 'PIN 0000 은 틀려야 한다'; end if;
  perform public.set_admin_pin('9876');
  if not public.verify_admin_pin('9876') then raise exception 'PIN 변경 실패'; end if;
  if public.verify_admin_pin('1234') then raise exception '옛 PIN 이 아직 맞는다'; end if;
  raise notice 'OK PIN';
end;
$$;

-- 잘못된 PIN 형식은 거부
do $$
begin
  begin
    perform public.set_admin_pin('12a4');
    raise exception '형식 검사 실패';
  exception when sqlstate '22023' then
    raise notice 'OK PIN 형식 검사';
  end;
end;
$$;

-- ---------- 계정 B 로 전환: A 의 데이터가 보이지 않아야 한다 ----------
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', false);

do $$
declare
  n integer;
begin
  if public.my_family_id() is not null then raise exception 'B 는 가족이 없어야 한다'; end if;
  select count(*) into n from public.families;    if n <> 0 then raise exception 'B 가 families % 행을 본다', n; end if;
  select count(*) into n from public.members;     if n <> 0 then raise exception 'B 가 members % 행을 본다', n; end if;
  select count(*) into n from public.quests;       if n <> 0 then raise exception 'B 가 goals % 행을 본다', n; end if;
  select count(*) into n from public.checkins;    if n <> 0 then raise exception 'B 가 checkins % 행을 본다', n; end if;
  select count(*) into n from public.rewards;     if n <> 0 then raise exception 'B 가 rewards % 행을 본다', n; end if;
  select count(*) into n from public.redemptions; if n <> 0 then raise exception 'B 가 redemptions % 행을 본다', n; end if;
  select count(*) into n from public.sticker_bonuses; if n <> 0 then raise exception 'B 가 bonuses % 행을 본다', n; end if;
  select count(*) into n from public.member_sticker_balances; if n <> 0 then raise exception 'B 가 잔액 뷰 % 행을 본다', n; end if;
  select count(*) into n from public.family_sticker_balances; if n <> 0 then raise exception 'B 가 가족 잔액 뷰 % 행을 본다', n; end if;
  if public.verify_admin_pin('9876') then raise exception 'B 가 A 의 PIN 을 통과했다'; end if;
  raise notice 'OK 계정 B 는 A 의 데이터를 볼 수 없다';
end;
$$;

-- B 가 A 의 family_id 로 끼워 넣기 시도 → RLS 로 거부되어야 한다
do $$
begin
  begin
    insert into public.members (family_id, display_name, role, color)
    values ((select family_a from ctx), '침입자', 'admin', 'pink');
    raise exception 'B 의 삽입이 허용되었다';
  exception when insufficient_privilege or sqlstate '42501' then
    raise notice 'OK 타 가족 family_id 삽입 거부';
  end;
end;
$$;

-- B 가 A 의 체크를 갱신 시도 → 영향 0 행
do $$
declare
  n integer;
begin
  update public.checkins set done = false where true;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'B 가 A 의 체크 % 행을 바꿨다', n; end if;
  raise notice 'OK 타 가족 갱신 영향 0 행';
end;
$$;

-- B 가 자기 가족을 만들면 자기 것만 본다
select public.create_family('B네', '0000', '[
  {"display_name":"아빠","role":"admin","color":"peach"},
  {"display_name":"형","role":"member","color":"lavender"}
]'::jsonb) as family_b \gset

do $$
declare
  n integer;
begin
  select count(*) into n from public.members;
  if n <> 2 then raise exception 'B 는 자기 구성원 2명만 봐야 한다 (실제 %)', n; end if;
  raise notice 'OK 계정 B 는 자기 가족만 본다';
end;
$$;

-- 같은 계정이 가족을 두 번 만들 수 없다
do $$
begin
  begin
    perform public.create_family('B네2', '0000', '[{"display_name":"x","role":"admin","color":"blue"},{"display_name":"y","color":"blue"}]'::jsonb);
    raise exception '두 번째 가족 생성이 허용되었다';
  exception when unique_violation then
    raise notice 'OK 가족 계정 1개 제한';
  end;
end;
$$;

-- ---------- 계정 C 를 A 의 가족에 연결하면(구성원 로그인) A 의 데이터가 보인다 ----------
reset role;
insert into auth.users (id, email) values ('33333333-3333-3333-3333-333333333333', 'c@example.com');
insert into public.family_users (user_id, family_id) values ('33333333-3333-3333-3333-333333333333', (select family_a from ctx));
update public.members set user_id = '33333333-3333-3333-3333-333333333333'
  where family_id = (select family_a from ctx) and display_name = '아이';
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', false);
do $$
declare
  n integer;
begin
  if public.my_family_id() <> (select family_a from ctx) then raise exception 'C 의 가족이 A 가 아니다'; end if;
  select count(*) into n from public.members; if n <> 2 then raise exception 'C 가 A 의 구성원 % 명을 본다', n; end if;
  select count(*) into n from public.members where user_id = auth.uid(); if n <> 1 then raise exception 'C 에 연결된 구성원이 없다'; end if;
  if not public.verify_admin_pin('9876') then raise exception 'C 가 가족 PIN 을 확인하지 못한다'; end if;
  select count(*) into n from public.family_users; if n <> 1 then raise exception 'C 가 family_users % 행을 본다', n; end if;
  begin
    perform public.create_family('C네', '1111', '[{"display_name":"x","role":"admin","color":"blue"},{"display_name":"y","color":"blue"}]'::jsonb);
    raise exception '이미 가족이 있는 계정의 가족 생성이 허용되었다';
  exception when unique_violation then
    raise notice 'OK 구성원 계정은 가족 데이터 접근 가능, 중복 가족 생성 불가';
  end;
end;
$$;

reset role;
select 'ALL RLS TESTS PASSED' as result;
