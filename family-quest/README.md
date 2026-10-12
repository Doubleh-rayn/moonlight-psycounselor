# 가족 퀘스트 (family-quest)

가족 건강습관 퀘스트 웹앱. 사양은 [PLAN.md](./PLAN.md), 학습 체크리스트는 [docs/LEARNING.md](./docs/LEARNING.md).

## 실행

```bash
cd family-quest
npm install
npm run dev        # http://localhost:3000 — 브라우저 폭 390px 로 확인
npm test           # Vitest (lib/ 순수 함수)
npm run lint
npm run build
```

## 폴더

```
src/app/                경로별 화면 (/, /quest, /records, /rewards, /settings, /habits/new)
src/components/ui/      공통 부품: Card, Button, IconTile, CheckButton, ProgressRing, ProgressBar, TabBar
src/components/today/   오늘 화면 전용 구성 요소
src/lib/design/         디자인 토큰 매핑 (toneStyle)
src/lib/date.ts         Asia/Seoul 기준 날짜 계산 (+ 테스트)
src/lib/repo/           저장소 인터페이스 + Supabase 구현 + 데모용 메모리 구현
src/lib/store/          가족 데이터 스토어 (낙관적 업데이트, 실시간 재조회)
src/lib/stats/          달성률·스티커 잔액 계산 (+ 테스트)
src/lib/plan/           계획 계산(8절)·퀘스트 생성·단계 판정 (+ 테스트)
supabase/               마이그레이션 SQL, RLS 테스트
e2e/                    데모 모드 브라우저 흐름 검증 스크립트
src/lib/bmi/            소아청소년 BMI 백분위수 판정 (LMS, 순수 함수 + 테스트)
data/bmi_lms_2017.json  2017 소아청소년 성장도표 연령별 BMI LMS 표 (성별·월령 24~227)
```

## 진행

- [x] 1단계 뼈대와 디자인 시스템
- [x] 2단계 데이터베이스 (`supabase/`)
- [x] 3단계 로그인과 프로필
- [x] 4단계 퀘스트 체크와 실시간 동기화
- [x] 5단계 달성률과 기록
- [x] 6단계 스티커와 보상
- [x] 7단계 계획 계산과 퀘스트 지도
- [x] 8단계 습관 추가와 승인
- [x] 9단계 PWA 와 배포 안내 (아래)

제가 임의로 정한 사항은 [docs/DECISIONS.md](./docs/DECISIONS.md) 에 있습니다.

## 로그인

구성원마다 아이디로 로그인합니다(`@` 없이 아이디만 입력). 계정은 Supabase 에 만들어져 있고, 로그인하면 바로 본인 프로필로 들어갑니다.
관리자 PIN 과 비밀번호는 설정 화면에서 바꿀 수 있습니다.

## 이용방법 화면

- 앱 상단 오른쪽 "이용방법" 버튼(로그인 화면에도 있음) → `/guide` 에서 카드뉴스 10장을 좌우로 넘겨 봅니다.
- 원본 카드: `docs/cardnews/*.png` (1080×1350). 앱용 축소본: `public/guide/NN.webp`. 카드를 다시 만들면 둘 다 갱신합니다.
- 상단 왼쪽에는 뒤로가기·홈 버튼이 있습니다(첫 화면에서는 비활성).

## 푸시 알림

- 설정 > "퀘스트 알림 (이 기기)" 를 켜면 매일 아침 8시·저녁 8시(한국 시간)에 오늘 퀘스트 수를 알려줍니다. 저녁은 남은 퀘스트가 없으면 보내지 않습니다.
- 안드로이드 크롬: 브라우저에서 바로 켤 수 있습니다. iPhone: 홈 화면에 설치한 뒤 켤 수 있습니다.
- 구조: Supabase pg_cron → `/api/push/send` → DB 함수 `push_due` → web-push. 일정은 `supabase/cron/push_schedule.sql`, 키는 `.env.example` 참고.
- 켠 뒤 "테스트 알림 보내기" 로 바로 확인할 수 있습니다.

## 데모 모드

`.env.local` 이 없으면 브라우저 메모리(localStorage)로 동작합니다. 로그인 화면의 **데모 가족으로 시작** 버튼을 누르면
예시 가족(엄마·아빠·지우·하준, PIN 1234)이 만들어집니다. 같은 브라우저의 다른 탭에서 변경이 바로 반영됩니다.

## Supabase 연결

[supabase/README.md](./supabase/README.md) 의 순서대로 마이그레이션을 적용하고 `.env.local` 에 URL 과 anon key 를 넣습니다.

## Vercel 배포

1. GitHub 저장소를 Vercel 에 연결한다.
2. 프로젝트 설정 → **Root Directory** 를 `family-quest` 로 지정한다 (저장소 루트는 다른 사이트). 이미 `family-quest` 프로젝트가 이렇게 만들어져 있다.
3. Environment Variables 에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 를 넣는다.
4. 배포 후 휴대폰 브라우저에서 접속 → 공유 메뉴 → "홈 화면에 추가". (iOS Safari, Android Chrome 모두 가능)

## 검증

```bash
npm test                          # 순수 함수 테스트 (날짜, 달성률, 스티커, BMI, 계획 계산, 판정)
bash supabase/tests/run_local.sh  # 로컬 PostgreSQL 에서 마이그레이션 + RLS 검증
node e2e/stage4.mjs               # 브라우저 흐름 검증 (e2e/README.md)
```
