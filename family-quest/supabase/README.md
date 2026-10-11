# 데이터베이스 (Supabase)

## 적용 방법

1. Supabase 프로젝트를 만든다 (리전: Northeast Asia (Seoul) 권장).
2. 대시보드 → **SQL Editor** → `migrations/0001_init.sql` 내용을 붙여넣고 실행한다.
   - 또는 Supabase CLI: `supabase link --project-ref <ref>` 후 `supabase db push`
3. 대시보드 → **Authentication → Providers → Email**: 가족 계정은 1개이므로 "Confirm email" 은 꺼도 된다.
4. 대시보드 → **Project Settings → API** 에서 URL 과 anon key 를 복사해 `family-quest/.env.local` 에 넣는다.

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 적용 상태

프로젝트 `vtchhevvqqizjzmxhqtw` 에 마이그레이션 `family_quest_init` 이 적용되어 있다 (2026-10-11).
같은 프로젝트에 다른 앱의 테이블(`goals` 등)이 있어, 이 앱의 목표 테이블 이름은 `quests` 다.

## 구조 요약

- 모든 테이블에 `family_id` 가 있고, RLS 정책은 `family_id = my_family_id()` 하나다.
  `my_family_id()` 는 로그인한 계정(`auth.uid()`)이 소유한 가족 id 를 돌려준다.
- 관리자 PIN 은 `families.admin_pin_hash` 에 bcrypt 해시로만 저장한다.
  `set_admin_pin(pin)`, `verify_admin_pin(pin)` RPC 로 다룬다.
- 최초 가족 생성은 `create_family(family_name, pin, members_json)` RPC 한 번으로 끝난다.
- 스티커 잔액은 저장하지 않고 `member_sticker_balances`, `family_sticker_balances` 뷰로 계산한다.
- Realtime 구독 대상: checkins, goals, redemptions, weight_logs, cheers, rewards, members, plans, plan_weeks, sticker_bonuses.

## 로컬 검증 (선택)

PostgreSQL 16 이 설치된 환경에서:

```bash
bash supabase/tests/run_local.sh
```

Supabase 의 `auth` 스키마를 흉내 낸 스텁(`tests/00_local_stub.sql`)을 올린 뒤 마이그레이션을 적용하고,
`tests/10_rls_test.sql` 로 다음을 확인한다.

- 잔액 뷰 계산 (개인: 체크 + 보너스 − 승인 보상, 가족: 전원 완료일만 인정)
- PIN 설정·검증, 형식 검사
- 다른 계정은 조회 0건, 삽입·갱신 거부
- 가족 계정 1개 제한

## 완료 기준 확인 (2단계)

다른 이메일로 계정을 하나 더 만들어 로그인하면 `members`, `goals` 등 어떤 테이블도 0건으로 조회된다.
대시보드 → Table Editor 에서 "Impersonate" 로 두 사용자를 바꿔 가며 확인할 수 있다.
