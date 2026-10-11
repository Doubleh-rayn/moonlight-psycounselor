import { describe, expect, it } from "vitest";
import { draftStageGoals, pickDietQuests, pickWalkQuest } from "./quests";

describe("식단 퀘스트 조합", () => {
  it("240 kcal → 밥 100 + 과자 150 = 250 (|250−240|=10 이 가장 가까움)", () => {
    expect(pickDietQuests(240, false).map((o) => o.key).sort()).toEqual(["rice", "snack"]);
  });
  it("315 kcal → 음료 120 + 과자 150 = 270 보다 음료+밥+과자 370 이 더 가까움? |270−315|=45, |370−315|=55 → 270", () => {
    expect(pickDietQuests(315, false).map((o) => o.key).sort()).toEqual(["drink", "snack"]);
  });
  it("미성년은 밥 덜기를 쓰지 않는다 (69 kcal → 음료 120)", () => {
    const q = pickDietQuests(69, true);
    expect(q.map((o) => o.key)).toEqual(["drink"]);
    expect(q.some((o) => o.key === "rice")).toBe(false);
  });
  it("0 이면 없음", () => {
    expect(pickDietQuests(0, false)).toEqual([]);
  });
});

describe("걷기 퀘스트", () => {
  it("93분 → 주 3회 30분", () => {
    expect(pickWalkQuest(93)).toEqual({ minutes: 30, sessions: 3 });
  });
  it("209분 → 주 5회 40분 (30분에 가장 가까운 분할)", () => {
    expect(pickWalkQuest(209)).toEqual({ minutes: 40, sessions: 5 });
  });
  it("279분 → 주 5회 55분", () => {
    expect(pickWalkQuest(279)).toEqual({ minutes: 55, sessions: 5 });
  });
  it("15분 미만이면 없음", () => {
    expect(pickWalkQuest(10)).toBeNull();
  });
});

describe("단계 퀘스트 초안", () => {
  const week = { week_no: 1, stage: "adapt" as const, diet_ratio: 0.8, daily_deficit: 300, diet_kcal: 240, exercise_kcal: 60, exercise_minutes_per_week: 93 };
  it("성인 적응: 식단 2개 + 걷기 1개, source=plan", () => {
    const d = draftStageGoals({ planId: "p", memberId: "m", stage: "adapt", week, minor: false });
    expect(d).toHaveLength(3);
    expect(d.every((g) => g.source === "plan" && g.plan_id === "p" && g.plan_stage === "adapt")).toBe(true);
    const walk = d.find((g) => g.type === "exercise")!;
    expect(walk.title).toBe("빠르게 걷기 30분");
    expect(walk.weekly_target).toBe(3);
    expect(walk.measure).toBe("minutes");
  });
  it("미성년: 매일 활동 분 퀘스트", () => {
    const d = draftStageGoals({ planId: "p", memberId: "m", stage: "adapt", week: { ...week, diet_kcal: 69, exercise_minutes_per_week: 210 }, minor: true });
    const ex = d.find((g) => g.type === "exercise")!;
    expect(ex.title).toBe("활발하게 움직이기 30분");
    expect(ex.days_of_week).toHaveLength(7);
  });
});

describe("중복 방지", () => {
  it("같은 제목의 활성 목표가 있으면 만들지 않는다", () => {
    const week = { week_no: 1, stage: "adapt" as const, diet_ratio: 0.8, daily_deficit: 300, diet_kcal: 240, exercise_kcal: 60, exercise_minutes_per_week: 93 };
    const d = draftStageGoals({ planId: "p", memberId: "m", stage: "adapt", week, minor: false, existingTitles: ["빠르게 걷기 30분"] });
    expect(d.some((g) => g.title === "빠르게 걷기 30분")).toBe(false);
    expect(d).toHaveLength(2);
  });
});
