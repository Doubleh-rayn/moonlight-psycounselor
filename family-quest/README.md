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
src/lib/mock/           1단계 임시 데이터 (4단계에서 Supabase 로 교체)
```

## 진행

- [x] 1단계 뼈대와 디자인 시스템
- [ ] 2단계 데이터베이스
- [ ] 3단계 로그인과 프로필
- [ ] 4단계 퀘스트 체크와 실시간 동기화
- [ ] 5단계 달성률과 기록
- [ ] 6단계 스티커와 보상
- [ ] 7단계 계획 계산과 퀘스트 지도
- [ ] 8단계 습관 추가와 승인
- [ ] 9단계 PWA 와 배포
