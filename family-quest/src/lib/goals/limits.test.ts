import { describe, expect, it } from "vitest";
import { checkLimit } from "./limits";
import type { GoalRow } from "@/lib/db/types";

const g = (id: string, type: GoalRow["type"], owner: string | null = "m", active = true): GoalRow => ({
  id, family_id: "f", owner_member_id: owner, type, category: type === "habit" ? "etc" : null, title: id, measure: "done", target_value: 1,
  days_of_week: [1], weekly_target: null, stickers: 1, status: "approved", source: "manual", plan_id: null, plan_stage: null,
  created_by_member_id: null, active, created_at: "",
});

describe("동시 활성 한도", () => {
  it("건강 5개면 식단·운동 추가 불가, 생활습관은 가능", () => {
    const goals = ["a", "b", "c", "d", "e"].map((id) => g(id, "diet"));
    expect(checkLimit(goals, "m", "exercise")).not.toBeNull();
    expect(checkLimit(goals, "m", "habit")).toBeNull();
  });
  it("생활습관 3개면 불가. 비활성·가족 공동·다른 구성원은 세지 않는다", () => {
    const goals = [g("a", "habit"), g("b", "habit"), g("c", "habit", "m", false), g("d", "habit", null), g("e", "habit", "other")];
    expect(checkLimit(goals, "m", "habit")).toBeNull();
    expect(checkLimit([...goals, g("f", "habit")], "m", "habit")).not.toBeNull();
  });
  it("가족 공동 목표 추가는 한도 없음", () => {
    expect(checkLimit([], null, "habit")).toBeNull();
  });
});
