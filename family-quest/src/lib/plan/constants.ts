/**
 * 계획 계산 상수 (PLAN.md 8절).
 * 일반적으로 통용되는 근사값이며 의료 기준으로 검증된 값이 아니다. 나중에 바꿀 수 있게 한 파일에 모은다.
 */

/** 단계 통과 기준 실천율 (%) — 건강 퀘스트(diet, exercise)만 집계 */
export const PASS_RATE = 70;

/** 단계 통과 보너스 스티커 */
export const STAGE_BONUS_STICKERS = 5;

/** 체지방 1kg ≈ 7,700 kcal */
export const KCAL_PER_KG = 7700;

// ---- 성인 (만 19세 이상) ----
export const ADULT_WEEKLY_LOSS_KG = 0.4;
export const ADULT_MIN_WEEKS = 4;
/** 단계 분할 비율: 적응 / 확장 / (강화 = 나머지) */
export const STAGE_SPLIT = { adapt: 0.25, expand: 0.375 } as const;
/** 적응 단계 조정량 = 기본 조정량 × 2/3 */
export const ADAPT_FACTOR = 2 / 3;
/** 식단:운동 비율 (식단 몫) */
export const DIET_RATIO = { adapt: 0.8, expand: 0.7, strengthen: 0.6, maintain: 0.5 } as const;
/** 운동 분당 소모 = 0.0175 × MET × 체중kg (빠르게 걷기 MET 4.3) */
export const MET_BRISK_WALK = 4.3;
export const KCAL_PER_MIN_PER_MET_KG = 0.0175;
/** 활동계수 */
export const ACTIVITY_FACTOR = { light: 1.2, moderate: 1.375, active: 1.55 } as const;
/** 유지 단계 길이(주), 통과 조건: 체중 ±1kg 유지 */
export const MAINTAIN_WEEKS = 4;
export const MAINTAIN_TOLERANCE_KG = 1;

// ---- 미성년 (만 19세 미만) ----
export const MINOR_WEEKLY_LOSS_KG = 0.125; // 월 약 0.5kg
export const MINOR_DIET_RATIO = 0.5;
/** 최종 단계 하루 활동 목표(분) */
export const MINOR_FINAL_DAILY_ACTIVITY_MIN = 60;
/** 단계별 하루 활동 목표 (적응 → 확장 → 강화) */
export const MINOR_DAILY_ACTIVITY_MIN = { adapt: 30, expand: 45, strengthen: 60, maintain: 60 } as const;

// ---- 한도 (8.3) ----
export const ADULT_MIN_TARGET_BMI = 18.5;
export const ADULT_MAX_DAILY_DEFICIT = 500;
export const ADULT_MIN_INTAKE = { female: 1200, male: 1500 } as const;
export const MINOR_MAX_DAILY_DIET_CUT = 200;
export const MINOR_MAX_MONTHLY_LOSS_KG = 1;
export const MINOR_PERCENTILE_THRESHOLD = 85;
/** 2주 연속 계획보다 빠르면 조정량 −10%, 느리면 기간 +1주 */
export const PROGRESS_FAST_REDUCTION = 0.1;
export const PROGRESS_SLOW_EXTEND_WEEKS = 1;

// ---- 퀘스트 생성 (8.4) ----
export const DIET_QUEST_OPTIONS = [
  { key: "drink", title: "가당 음료 1잔을 물로 바꾸기", kcal: 120 },
  { key: "rice", title: "밥 3분의 1공기 덜기", kcal: 100 },
  { key: "snack", title: "과자·야식 1회 건너뛰기", kcal: 150 },
] as const;
/** 운동 퀘스트 주당 횟수 범위 */
export const EXERCISE_SESSIONS = { min: 3, max: 5 } as const;
/** 한 번 걷기 시간 한도(분) */
export const WALK_SESSION_MIN = { min: 15, max: 60 } as const;

export const MEDICAL_DISCLAIMER = "근사 계산에 따른 예상치이며 의료 처방이 아닙니다";
