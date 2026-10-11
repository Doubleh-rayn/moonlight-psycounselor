# 화면 흐름 검증 스크립트 (데모 모드)

Supabase 없이 데모 모드로 각 단계의 완료 기준을 브라우저에서 자동 확인한다.

```bash
npm run build && npm run start -- -p 3100     # 다른 터미널
npx playwright install chromium                # 최초 1회
mkdir -p e2e/out
node e2e/stage3.mjs   # 로그인 → 데모 시작 → 프로필 선택 → 새 계정 가족 생성
node e2e/stage4.mjs   # 체크·해제, 두 탭 동기화, 분 입력, 응원
node e2e/stage5.mjs   # 기록 화면, 과거 수정 PIN, 월간, 체중
node e2e/stage6.mjs   # 보상 신청 → 승인(차감) → 지급, 제안, 틀린 PIN
node e2e/stage7.mjs   # 계획 미리보기, 한도 조정, 시작, 퀘스트 지도, 미성년 BMI
node e2e/stage8.mjs   # 자녀 제안 → 한도 → 부모 승인 → 오늘 화면
```

스크린샷은 `e2e/out/` 에 저장된다. 스크립트는 `/opt/pw-browsers/chromium` 이 없으면 기본 Chromium 을 쓴다.
