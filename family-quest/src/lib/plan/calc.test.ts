import { describe, expect, it } from "vitest";
import { ageFromYearMonth, bmr, buildAdultPlan, buildMinorPlan, kcalPerMinute, splitWeeks } from "./calc";

describe("8.1 성인 검증 예시: 60kg → 57kg", () => {
  const out = buildAdultPlan({ currentWeight: 60, targetWeight: 57, heightCm: 165, ageYears: 40, sex: "female", activity: "moderate" });
  if (!out.ok) throw new Error(out.problem.message);
  const p = out.plan;
  const byStage = (s: string) => p.stageWeeks.filter((w) => w.stage === s);

  it("기간 8주, 적응 2 / 확장 3 / 강화 3", () => {
    expect(p.weeks).toBe(8);
    expect(p.split).toEqual({ adapt: 2, expand: 3, strengthen: 3 });
    expect(byStage("adapt")).toHaveLength(2);
    expect(byStage("expand")).toHaveLength(3);
    expect(byStage("strengthen")).toHaveLength(3);
    expect(byStage("maintain")).toHaveLength(4);
  });

  it("적응: 조정량 300, 식단 240, 운동 60, 주간 운동 약 93분", () => {
    const w = byStage("adapt")[0];
    expect(w.daily_deficit).toBeCloseTo(300, 6);
    expect(w.diet_kcal).toBeCloseTo(240, 6);
    expect(w.exercise_kcal).toBeCloseTo(60, 6);
    expect(Math.round(w.exercise_minutes_per_week)).toBe(93);
  });

  it("확장: 450 / 315 / 135 / 약 209분", () => {
    const w = byStage("expand")[0];
    expect(w.daily_deficit).toBeCloseTo(450, 6);
    expect(w.diet_kcal).toBeCloseTo(315, 6);
    expect(w.exercise_kcal).toBeCloseTo(135, 6);
    expect(Math.round(w.exercise_minutes_per_week)).toBe(209);
  });

  it("강화: 450 / 270 / 180 / 약 279분", () => {
    const w = byStage("strengthen")[0];
    expect(w.daily_deficit).toBeCloseTo(450, 6);
    expect(w.diet_kcal).toBeCloseTo(270, 6);
    expect(w.exercise_kcal).toBeCloseTo(180, 6);
    expect(Math.round(w.exercise_minutes_per_week)).toBe(279);
  });

  it("합계 300×14 + 450×42 = 23,100 kcal", () => {
    const total = p.stageWeeks.filter((w) => w.stage !== "maintain").reduce((s, w) => s + w.daily_deficit * 7, 0);
    expect(total).toBeCloseTo(23100, 6);
    expect(p.totalKcal).toBe(23100);
  });

  it("유지 단계: 조정량 0, 운동은 강화 수준 유지", () => {
    const m = byStage("maintain")[0];
    expect(m.daily_deficit).toBe(0);
    expect(m.diet_kcal).toBe(0);
    expect(Math.round(m.exercise_minutes_per_week)).toBe(279);
  });

  it("분당 소모 = 0.0175 × 4.3 × 60 = 4.515", () => {
    expect(kcalPerMinute(60)).toBeCloseTo(4.515, 6);
  });
});

describe("8.1 보조 계산", () => {
  it("BMR (Mifflin-St Jeor) 남 70kg 175cm 30세 = 1648.75", () => {
    expect(bmr(70, 175, 30, "male")).toBeCloseTo(1648.75, 6);
  });
  it("단계 분할 최소 적응 1주", () => {
    expect(splitWeeks(4)).toEqual({ adapt: 1, expand: 2, strengthen: 1 }); // round(1)=1, round(1.5)=2
    expect(splitWeeks(1)).toEqual({ adapt: 1, expand: 0, strengthen: 0 });
  });
  it("최소 4주", () => {
    const out = buildAdultPlan({ currentWeight: 70, targetWeight: 69.5, heightCm: 175, ageYears: 30, sex: "male", activity: "light" });
    expect(out.ok && out.plan.weeks).toBe(4);
  });
});

describe("8.3 성인 한도", () => {
  it("목표 BMI 18.5 미만이면 설정 불가", () => {
    const out = buildAdultPlan({ currentWeight: 55, targetWeight: 48, heightCm: 165, ageYears: 30, sex: "female", activity: "light" });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.problem.code).toBe("bmi_too_low");
  });

  it("일일 조정량 500 초과면 기간을 늘려 재계산 (기간 지정 4주에 5kg)", () => {
    const out = buildAdultPlan({ currentWeight: 90, targetWeight: 85, heightCm: 180, ageYears: 35, sex: "male", activity: "moderate", weeksOverride: 4 });
    if (!out.ok) throw new Error(out.problem.message);
    expect(out.plan.weeks).toBeGreaterThan(4);
    expect(out.plan.baseDeficit).toBeLessThanOrEqual(500);
    expect(out.plan.notes.some((n) => n.includes("500"))).toBe(true);
  });

  it("식단 감소 후 섭취량이 여성 1,200 미만이면 식단 감소분을 줄이고 기간을 늘린다", () => {
    // 유지열량이 낮은 경우: 45kg, 150cm, 60세, 활동 적음 → BMR 약 893, 유지 약 1072 → 1200 이하라 생성 불가
    const low = buildAdultPlan({ currentWeight: 45, targetWeight: 43, heightCm: 150, ageYears: 60, sex: "female", activity: "light" });
    expect(low.ok).toBe(false);
    if (!low.ok) expect(low.problem.code).toBe("intake_floor");
    // 유지열량 약 1,450: 식단 감소 가능폭 ~250 → 기본 계획의 식단 315 가 넘어 기간이 늘어난다
    const out = buildAdultPlan({ currentWeight: 52, targetWeight: 49, heightCm: 158, ageYears: 45, sex: "female", activity: "light" });
    if (!out.ok) throw new Error(out.problem.message);
    const cap = out.plan.maintenanceKcal! - 1200;
    expect(out.plan.stageWeeks.every((w) => w.diet_kcal <= cap + 1e-9)).toBe(true);
    expect(out.plan.weeks).toBeGreaterThan(8);
    expect(out.plan.notes.some((n) => n.includes("1200"))).toBe(true);
  });

  it("감량 필요 없음 → 유지 계획", () => {
    const out = buildAdultPlan({ currentWeight: 60, targetWeight: 60, heightCm: 165, ageYears: 40, sex: "female", activity: "moderate" });
    expect(out.ok && out.plan.kind).toBe("maintain");
  });
});

describe("8.2 미성년 검증 예시: 3kg 감량", () => {
  const out = buildMinorPlan({ currentWeight: 48, targetWeight: 45, heightCm: 150, sex: "female", ageMonths: 140, bmiPercentile: 92 });
  if (!out.ok) throw new Error(out.problem.message);
  const p = out.plan;

  it("24주, 일일 약 138 kcal, 식단 약 69 / 활동 약 69", () => {
    expect(p.weeks).toBe(24);
    expect(Math.round(p.baseDeficit)).toBe(138);
    expect(p.baseDeficit).toBeCloseTo(137.5, 6);
    const w = p.stageWeeks[0];
    expect(Math.round(w.diet_kcal)).toBe(69);
    expect(Math.round(w.exercise_kcal)).toBe(69);
    expect(w.diet_ratio).toBe(0.5);
  });

  it("단계 분할 6 / 9 / 9, 활동 목표 30 → 45 → 60분/일", () => {
    expect(p.split).toEqual({ adapt: 6, expand: 9, strengthen: 9 });
    const minutes = (s: string) => p.stageWeeks.find((w) => w.stage === s)!.exercise_minutes_per_week;
    expect(minutes("adapt")).toBe(30 * 7);
    expect(minutes("expand")).toBe(45 * 7);
    expect(minutes("strengthen")).toBe(60 * 7);
  });
});

describe("8.3 미성년 한도", () => {
  it("BMI 85백분위수 미만이면 유지 계획만", () => {
    const out = buildMinorPlan({ currentWeight: 40, targetWeight: 37, heightCm: 150, sex: "male", ageMonths: 140, bmiPercentile: 60 });
    expect(out.ok && out.plan.kind).toBe("maintain");
  });
  it("성장도표 미입력이면 검사를 건너뛰고 안내를 남긴다", () => {
    const out = buildMinorPlan({ currentWeight: 48, targetWeight: 45, heightCm: 150, sex: "male", ageMonths: 140, bmiPercentile: null });
    expect(out.ok && out.plan.kind).toBe("loss");
    expect(out.ok && out.plan.notes[0]).toContain("성장도표 기준 미입력");
  });
  it("기간을 짧게 지정해도 월 1kg·하루 200 kcal 한도를 넘지 않는다", () => {
    const out = buildMinorPlan({ currentWeight: 60, targetWeight: 54, heightCm: 160, sex: "male", ageMonths: 180, bmiPercentile: 96, weeksOverride: 8 });
    if (!out.ok) throw new Error(out.problem.message);
    expect(out.plan.weeks).toBeGreaterThanOrEqual(Math.ceil(6 * (365.25 / 12 / 7)));
    expect(out.plan.stageWeeks.every((w) => w.diet_kcal <= 200)).toBe(true);
  });
});

describe("나이", () => {
  it("생년월 → 만 나이", () => {
    expect(ageFromYearMonth("2015-03", "2026-10-11")).toEqual({ years: 11, months: 139 });
    expect(ageFromYearMonth("1985-04", "2026-10-11").years).toBe(41);
  });
});
