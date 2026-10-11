/**
 * 계획 계산 (PLAN.md 8절) — 순수 함수. 상수는 constants.ts 에만 둔다.
 * 결과는 "근사 계산에 따른 예상치이며 의료 처방이 아니다".
 */
import type { ActivityLevel, PlanStage, Sex } from "@/lib/db/types";
import {
  ACTIVITY_FACTOR,
  ADAPT_FACTOR,
  ADULT_MAX_DAILY_DEFICIT,
  ADULT_MIN_INTAKE,
  ADULT_MIN_TARGET_BMI,
  ADULT_MIN_WEEKS,
  ADULT_WEEKLY_LOSS_KG,
  DIET_RATIO,
  KCAL_PER_KG,
  KCAL_PER_MIN_PER_MET_KG,
  MAINTAIN_WEEKS,
  MET_BRISK_WALK,
  MINOR_DAILY_ACTIVITY_MIN,
  MINOR_DIET_RATIO,
  MINOR_MAX_DAILY_DIET_CUT,
  MINOR_MAX_MONTHLY_LOSS_KG,
  MINOR_WEEKLY_LOSS_KG,
  STAGE_SPLIT,
} from "./constants";

export interface StageWeek {
  week_no: number;
  stage: PlanStage;
  diet_ratio: number;
  daily_deficit: number;
  diet_kcal: number;
  exercise_kcal: number;
  exercise_minutes_per_week: number;
}

export interface StageSplit {
  adapt: number;
  expand: number;
  strengthen: number;
}

export interface PlanCalc {
  kind: "loss" | "maintain";
  audience: "adult" | "minor";
  lossKg: number;
  totalKcal: number;
  /** 감량 단계 주 수 (유지 단계 제외) */
  weeks: number;
  split: StageSplit;
  baseDeficit: number;
  kcalPerMinute: number;
  /** 성인만: BMR 과 유지열량 */
  bmr?: number;
  maintenanceKcal?: number;
  stageWeeks: StageWeek[];
  /** 한도 때문에 자동으로 바뀐 내용 */
  notes: string[];
}

export type PlanProblem =
  | { code: "invalid"; message: string }
  | { code: "bmi_too_low"; message: string }
  | { code: "intake_floor"; message: string }
  | { code: "too_long"; message: string };

export type PlanOutcome = { ok: true; plan: PlanCalc } | { ok: false; problem: PlanProblem };

// ---------------------------------------------------------------------------
// 공통
// ---------------------------------------------------------------------------

export function bmiOf(weightKg: number, heightCm: number): number {
  return weightKg / Math.pow(heightCm / 100, 2);
}

/** 단계 분할: 적응 round(기간×0.25, 최소 1) / 확장 round(기간×0.375) / 강화 나머지 */
export function splitWeeks(weeks: number): StageSplit {
  const adapt = Math.max(1, Math.round(weeks * STAGE_SPLIT.adapt));
  const expand = Math.max(0, Math.min(weeks - adapt, Math.round(weeks * STAGE_SPLIT.expand)));
  const strengthen = Math.max(0, weeks - adapt - expand);
  return { adapt, expand, strengthen };
}

/** 운동 분당 소모 = 0.0175 × MET(4.3) × 체중kg */
export function kcalPerMinute(weightKg: number): number {
  return KCAL_PER_MIN_PER_MET_KG * MET_BRISK_WALK * weightKg;
}

/** Mifflin-St Jeor */
export function bmr(weightKg: number, heightCm: number, ageYears: number, sex: Sex): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + (sex === "male" ? 5 : -161);
}

export function maintenanceKcal(weightKg: number, heightCm: number, ageYears: number, sex: Sex, activity: ActivityLevel): number {
  return bmr(weightKg, heightCm, ageYears, sex) * ACTIVITY_FACTOR[activity];
}

function stageOf(weekIndex: number, split: StageSplit): PlanStage {
  if (weekIndex < split.adapt) return "adapt";
  if (weekIndex < split.adapt + split.expand) return "expand";
  return "strengthen";
}

// ---------------------------------------------------------------------------
// 8.1 성인
// ---------------------------------------------------------------------------

export interface AdultInput {
  currentWeight: number;
  targetWeight: number;
  heightCm: number;
  ageYears: number;
  sex: Sex;
  activity: ActivityLevel;
  /** 관리자가 기간을 직접 지정할 때 (한도 검사는 그대로 적용) */
  weeksOverride?: number;
  /** 관리자가 식단:운동 비율(식단 몫)을 직접 지정할 때. 0.5~0.9 */
  dietRatioOverride?: number;
}

/** 주차 표 생성 (성인). D = 총감량 ÷ (적응일수×2/3 + 나머지일수) */
function adultWeeks(totalKcal: number, weeks: number, kpm: number, ratioOverride?: number): { split: StageSplit; D: number; stageWeeks: StageWeek[] } {
  const split = splitWeeks(weeks);
  const adaptDays = split.adapt * 7;
  const restDays = (split.expand + split.strengthen) * 7;
  const D = totalKcal / (adaptDays * ADAPT_FACTOR + restDays);
  const stageWeeks: StageWeek[] = [];
  for (let i = 0; i < weeks; i++) {
    const stage = stageOf(i, split);
    const deficit = stage === "adapt" ? D * ADAPT_FACTOR : D;
    const ratio = ratioOverride ?? DIET_RATIO[stage];
    const exercise = deficit * (1 - ratio);
    stageWeeks.push({
      week_no: i + 1,
      stage,
      diet_ratio: ratio,
      daily_deficit: deficit,
      diet_kcal: deficit * ratio,
      exercise_kcal: exercise,
      exercise_minutes_per_week: (exercise * 7) / kpm,
    });
  }
  return { split, D, stageWeeks };
}

/** 유지 단계 4주: 식단 감소 0, 운동은 마지막 감량 단계 수준을 유지 */
function appendMaintain(stageWeeks: StageWeek[], kpm: number, exerciseKcal: number, exerciseMinutes: number): void {
  const start = stageWeeks.length;
  for (let i = 0; i < MAINTAIN_WEEKS; i++) {
    stageWeeks.push({
      week_no: start + i + 1,
      stage: "maintain",
      diet_ratio: DIET_RATIO.maintain,
      daily_deficit: 0,
      diet_kcal: 0,
      exercise_kcal: exerciseKcal,
      exercise_minutes_per_week: exerciseMinutes || (exerciseKcal * 7) / kpm,
    });
  }
}

export function buildAdultPlan(input: AdultInput): PlanOutcome {
  const { currentWeight, targetWeight, heightCm, ageYears, sex, activity } = input;
  if (!(currentWeight > 0 && targetWeight > 0 && heightCm > 0 && ageYears > 0)) {
    return { ok: false, problem: { code: "invalid", message: "체중, 키, 나이를 확인해 주세요" } };
  }
  const notes: string[] = [];
  const kpm = kcalPerMinute(currentWeight);
  const b = bmr(currentWeight, heightCm, ageYears, sex);
  const maint = b * ACTIVITY_FACTOR[activity];
  const lossKg = Math.round((currentWeight - targetWeight) * 10) / 10;

  if (bmiOf(targetWeight, heightCm) < ADULT_MIN_TARGET_BMI) {
    const minW = Math.ceil(ADULT_MIN_TARGET_BMI * Math.pow(heightCm / 100, 2) * 10) / 10;
    return { ok: false, problem: { code: "bmi_too_low", message: `목표 체중의 BMI 가 ${ADULT_MIN_TARGET_BMI} 미만입니다. ${minW}kg 이상으로 정해 주세요.` } };
  }

  if (lossKg <= 0) {
    const stageWeeks: StageWeek[] = [];
    appendMaintain(stageWeeks, kpm, 0, 0);
    return {
      ok: true,
      plan: { kind: "maintain", audience: "adult", lossKg: 0, totalKcal: 0, weeks: 0, split: { adapt: 0, expand: 0, strengthen: 0 }, baseDeficit: 0, kcalPerMinute: kpm, bmr: b, maintenanceKcal: maint, stageWeeks, notes: ["감량이 필요하지 않아 유지 계획만 만듭니다."] },
    };
  }

  const totalKcal = lossKg * KCAL_PER_KG;
  const floor = ADULT_MIN_INTAKE[sex];
  const maxDietCut = maint - floor;
  if (maxDietCut <= 0) {
    return { ok: false, problem: { code: "intake_floor", message: `유지열량(${Math.round(maint)} kcal)이 최소 섭취량(${floor} kcal) 이하라 식단 감소 계획을 만들 수 없습니다.` } };
  }

  let weeks = Math.max(ADULT_MIN_WEEKS, Math.ceil(lossKg / ADULT_WEEKLY_LOSS_KG));
  if (input.weeksOverride && input.weeksOverride >= ADULT_MIN_WEEKS) weeks = input.weeksOverride;
  const ratioOverride = input.dietRatioOverride !== undefined ? Math.min(0.9, Math.max(0.5, input.dietRatioOverride)) : undefined;
  const initialWeeks = weeks;
  let reasonDeficit = false;
  let reasonIntake = false;

  for (let guard = 0; guard < 520; guard++) {
    const { split, D, stageWeeks } = adultWeeks(totalKcal, weeks, kpm, ratioOverride);
    if (D > ADULT_MAX_DAILY_DEFICIT) {
      reasonDeficit = true;
      weeks += 1;
      continue;
    }
    if (stageWeeks.some((w) => w.diet_kcal > maxDietCut)) {
      reasonIntake = true;
      weeks += 1;
      continue;
    }
    if (reasonDeficit) notes.push(`일일 조정량이 ${ADULT_MAX_DAILY_DEFICIT} kcal 를 넘지 않도록 기간을 ${initialWeeks}주에서 ${weeks}주로 늘렸습니다.`);
    if (reasonIntake) notes.push(`식단 감소 후 섭취량이 ${floor} kcal 아래로 내려가지 않도록 식단 감소분을 줄이고 기간을 ${weeks}주로 늘렸습니다.`);
    const last = stageWeeks[stageWeeks.length - 1];
    appendMaintain(stageWeeks, kpm, last.exercise_kcal, last.exercise_minutes_per_week);
    return {
      ok: true,
      plan: { kind: "loss", audience: "adult", lossKg, totalKcal, weeks, split, baseDeficit: D, kcalPerMinute: kpm, bmr: b, maintenanceKcal: maint, stageWeeks, notes },
    };
  }
  return { ok: false, problem: { code: "too_long", message: "한도 안에서 계획을 만들 수 없습니다. 목표 체중을 조정해 주세요." } };
}

// ---------------------------------------------------------------------------
// 8.2 미성년
// ---------------------------------------------------------------------------

export interface MinorInput {
  currentWeight: number;
  targetWeight: number;
  heightCm: number;
  sex: Sex;
  ageMonths: number;
  /** 소아청소년 BMI 백분위수 (없으면 null = 성장도표 미입력) */
  bmiPercentile: number | null;
  weeksOverride?: number;
}

export function buildMinorPlan(input: MinorInput): PlanOutcome {
  const { currentWeight, targetWeight, heightCm } = input;
  if (!(currentWeight > 0 && targetWeight > 0 && heightCm > 0)) {
    return { ok: false, problem: { code: "invalid", message: "체중과 키를 확인해 주세요" } };
  }
  const notes: string[] = [];
  const kpm = kcalPerMinute(currentWeight);
  const lossKg = Math.round((currentWeight - targetWeight) * 10) / 10;

  const maintainOnly = (why: string): PlanOutcome => {
    const stageWeeks: StageWeek[] = [];
    const minutes = MINOR_DAILY_ACTIVITY_MIN.maintain * 7;
    for (let i = 0; i < MAINTAIN_WEEKS; i++) {
      stageWeeks.push({ week_no: i + 1, stage: "maintain", diet_ratio: MINOR_DIET_RATIO, daily_deficit: 0, diet_kcal: 0, exercise_kcal: 0, exercise_minutes_per_week: minutes });
    }
    return { ok: true, plan: { kind: "maintain", audience: "minor", lossKg: 0, totalKcal: 0, weeks: 0, split: { adapt: 0, expand: 0, strengthen: 0 }, baseDeficit: 0, kcalPerMinute: kpm, stageWeeks, notes: [why] } };
  };

  if (input.bmiPercentile === null) notes.push("성장도표 기준 미입력: BMI 백분위수 검사를 건너뛰었습니다.");
  else if (input.bmiPercentile < 85) return maintainOnly("현재 BMI 가 연령·성별 85백분위수 미만이라 감량 대신 유지 계획만 제공합니다.");
  if (lossKg <= 0) return maintainOnly("감량이 필요하지 않아 유지 계획만 만듭니다.");

  const totalKcal = lossKg * KCAL_PER_KG;
  let weeks = Math.ceil(lossKg / MINOR_WEEKLY_LOSS_KG);
  if (input.weeksOverride && input.weeksOverride >= 1) weeks = input.weeksOverride;
  // 감량 속도 월 1kg 초과 불가 (관리자가 기간을 줄였을 때)
  const minWeeks = Math.ceil((lossKg / MINOR_MAX_MONTHLY_LOSS_KG) * (365.25 / 12 / 7));
  if (weeks < minWeeks) {
    notes.push(`감량 속도가 월 ${MINOR_MAX_MONTHLY_LOSS_KG}kg 을 넘지 않도록 기간을 ${minWeeks}주로 늘렸습니다.`);
    weeks = minWeeks;
  }
  for (let guard = 0; guard < 520; guard++) {
    const daily = totalKcal / (weeks * 7);
    const diet = daily * MINOR_DIET_RATIO;
    if (diet > MINOR_MAX_DAILY_DIET_CUT) {
      weeks += 1;
      if (guard === 0) notes.push(`식단 감소분이 하루 ${MINOR_MAX_DAILY_DIET_CUT} kcal 를 넘지 않도록 기간을 늘렸습니다.`);
      continue;
    }
    const split = splitWeeks(weeks);
    const stageWeeks: StageWeek[] = [];
    for (let i = 0; i < weeks; i++) {
      const stage = stageOf(i, split);
      stageWeeks.push({
        week_no: i + 1,
        stage,
        diet_ratio: MINOR_DIET_RATIO,
        daily_deficit: daily,
        diet_kcal: diet,
        exercise_kcal: daily - diet,
        exercise_minutes_per_week: MINOR_DAILY_ACTIVITY_MIN[stage] * 7,
      });
    }
    const start = stageWeeks.length;
    for (let i = 0; i < MAINTAIN_WEEKS; i++) {
      stageWeeks.push({ week_no: start + i + 1, stage: "maintain", diet_ratio: MINOR_DIET_RATIO, daily_deficit: 0, diet_kcal: 0, exercise_kcal: 0, exercise_minutes_per_week: MINOR_DAILY_ACTIVITY_MIN.maintain * 7 });
    }
    return { ok: true, plan: { kind: "loss", audience: "minor", lossKg, totalKcal, weeks, split, baseDeficit: daily, kcalPerMinute: kpm, stageWeeks, notes } };
  }
  return { ok: false, problem: { code: "too_long", message: "한도 안에서 계획을 만들 수 없습니다." } };
}

/** 만 19세 이상이면 성인 */
export function isAdultAge(ageYears: number): boolean {
  return ageYears >= 19;
}

/** 생년월('YYYY-MM') → 만 나이(년, 소수 버림) 와 개월 */
export function ageFromYearMonth(birthYearMonth: string, today: string): { years: number; months: number } {
  const [by, bm] = birthYearMonth.split("-").map(Number);
  const [ty, tm] = today.split("-").map(Number);
  const months = Math.max(0, (ty - by) * 12 + (tm - bm));
  return { years: Math.floor(months / 12), months };
}
