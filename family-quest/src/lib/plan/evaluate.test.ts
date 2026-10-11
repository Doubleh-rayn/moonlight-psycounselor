import { describe, expect, it } from "vitest";
import { pendingWeekVerdicts, stageVerdictAt } from "./evaluate";
import type { CheckinRow, GoalRow, PlanRow, PlanWeekRow } from "@/lib/db/types";

const plan: PlanRow = {
  id: "p", family_id: "f", member_id: "m", start_weight: 60, target_weight: 57, weeks: 8, activity_level: "moderate",
  kind: "loss", start_date: "2026-09-07", status: "active", created_at: "2026-09-07T00:00:00Z",
};
const week = (n: number, stage: PlanWeekRow["stage"], passed: boolean | null = null): PlanWeekRow => ({
  id: `w${n}`, family_id: "f", plan_id: "p", week_no: n, stage, diet_ratio: 0.8, daily_deficit: 300, diet_kcal: 240, exercise_kcal: 60,
  exercise_minutes_per_week: 93, passed, extended: false,
});
const goal: GoalRow = {
  id: "g", family_id: "f", owner_member_id: "m", type: "diet", category: null, title: "물", measure: "done", target_value: 1,
  days_of_week: [0, 1, 2, 3, 4, 5, 6], weekly_target: null, stickers: 1, status: "approved", source: "plan", plan_id: "p",
  plan_stage: "adapt", created_by_member_id: null, active: true, created_at: "2026-09-01T00:00:00Z",
};
const habit: GoalRow = { ...goal, id: "h", type: "habit", category: "tidy", plan_id: null, plan_stage: null, source: "manual" };
const ck = (date: string, g = "g"): CheckinRow => ({ id: `${g}${date}`, family_id: "f", goal_id: g, member_id: "m", date, value: 1, done: true, created_at: "", updated_at: "" });
const days = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `2026-09-${String(from + i).padStart(2, "0")}`);

describe("주차 판정", () => {
  it("끝난 주만 판정하고, 건강 퀘스트 70% 이상이면 통과", () => {
    const weeks = [week(1, "adapt"), week(2, "adapt"), week(3, "expand")];
    // 1주차(9/7~9/13) 5/7 = 71% 통과, 2주차(9/14~9/20) 4/7 = 57% 미통과, 3주차 진행 중
    const checkins = [...days(7, 11).map((d) => ck(d)), ...days(14, 17).map((d) => ck(d))];
    const v = pendingWeekVerdicts(plan, weeks, [goal, habit], checkins, "2026-09-23");
    expect(v.map((x) => [x.week.week_no, x.rate, x.passed])).toEqual([[1, 71, true], [2, 57, false]]);
  });

  it("생활습관은 판정에서 제외된다", () => {
    const weeks = [week(1, "adapt")];
    const checkins = days(7, 13).map((d) => ck(d, "h")); // 습관만 전부 완료
    const v = pendingWeekVerdicts(plan, weeks, [goal, habit], checkins, "2026-09-15");
    expect(v[0].rate).toBe(0);
    expect(v[0].passed).toBe(false);
  });
});

describe("단계 판정", () => {
  const weeks = [week(1, "adapt", true), week(2, "adapt", true), week(3, "expand"), week(4, "expand"), week(5, "expand")];

  it("적응 단계가 끝난 다음 날: 단계 전체 실천율로 판정", () => {
    const checkins = [...days(7, 13), ...days(14, 17)].map((d) => ck(d)); // 11/14 = 79%
    const sv = stageVerdictAt(plan, weeks, [goal], checkins, [], "2026-09-21");
    expect(sv?.stage).toBe("adapt");
    expect(sv?.rate).toBe(79);
    expect(sv?.passed).toBe(true);
  });

  it("미통과 (9/14 = 64%)", () => {
    const checkins = [...days(7, 11), ...days(14, 17)].map((d) => ck(d));
    const sv = stageVerdictAt(plan, weeks, [goal], checkins, [], "2026-09-21");
    expect(sv?.passed).toBe(false);
  });

  it("단계 진행 중에는 판정하지 않는다", () => {
    expect(stageVerdictAt(plan, weeks, [goal], [], [], "2026-09-15")).toBeNull();
  });

  it("유지 단계: 마지막 체중이 목표 ±1kg 이내면 통과", () => {
    const mw = [week(1, "maintain"), week(2, "maintain"), week(3, "maintain"), week(4, "maintain")];
    const logs = [{ id: "l", family_id: "f", member_id: "m", date: "2026-10-01", weight: 57.6, created_at: "" }];
    const sv = stageVerdictAt(plan, mw, [goal], [], logs, "2026-10-06");
    expect(sv?.stage).toBe("maintain");
    expect(sv?.passed).toBe(true);
    const sv2 = stageVerdictAt(plan, mw, [goal], [], [{ ...logs[0], weight: 59 }], "2026-10-06");
    expect(sv2?.passed).toBe(false);
  });
});
