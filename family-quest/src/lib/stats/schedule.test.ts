import { describe, expect, it } from "vitest";
import { familyTally, memberTally, rateOf, streakDays, tallyGoal, indexCheckins, todayCount, todayItems } from "./schedule";
import type { CheckinRow, GoalRow, MemberRow } from "@/lib/db/types";

const F = "fam";
const member = (id: string, active = true): MemberRow => ({
  id, family_id: F, display_name: id, role: "member", is_minor: false, color: "blue",
  birth_year_month: null, sex: null, height_cm: null, sort_order: 0, active, created_at: "2026-01-01T00:00:00Z",
});
const goal = (id: string, owner: string | null, p: Partial<GoalRow> = {}): GoalRow => ({
  id, family_id: F, owner_member_id: owner, type: "exercise", category: null, title: id, measure: "done",
  target_value: 1, days_of_week: [0, 1, 2, 3, 4, 5, 6], weekly_target: null, stickers: 1, status: "approved",
  source: "manual", plan_id: null, plan_stage: null, created_by_member_id: null, active: true,
  created_at: "2026-01-01T00:00:00Z", ...p,
});
const ck = (goal_id: string, member_id: string, date: string, done = true): CheckinRow => ({
  id: `${goal_id}|${member_id}|${date}`, family_id: F, goal_id, member_id, date, value: 0, done, created_at: "", updated_at: "",
});

// 2026-10-05(월) ~ 2026-10-11(일)
const WEEK = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"];

describe("요일형 목표", () => {
  it("월·수·금 목표, 주 전체 기간에 2회 완료 → 2/3", () => {
    const g = goal("walk", "m", { days_of_week: [1, 3, 5] });
    const idx = indexCheckins([ck("walk", "m", "2026-10-05"), ck("walk", "m", "2026-10-09")]);
    expect(tallyGoal(g, ["m"], idx, WEEK[0], WEEK[6])).toEqual({ scheduled: 3, completed: 2 });
  });

  it("오늘까지만 세면 예정이 줄어든다 (수요일까지 → 월·수 = 2)", () => {
    const g = goal("walk", "m", { days_of_week: [1, 3, 5] });
    const idx = indexCheckins([ck("walk", "m", "2026-10-05")]);
    expect(tallyGoal(g, ["m"], idx, WEEK[0], "2026-10-07")).toEqual({ scheduled: 2, completed: 1 });
  });

  it("목표를 만든 날 이전은 예정에 넣지 않는다", () => {
    const g = goal("new", "m", { created_at: "2026-10-08T03:00:00Z" }); // KST 10/08
    const idx = indexCheckins([]);
    expect(tallyGoal(g, ["m"], idx, WEEK[0], WEEK[6]).scheduled).toBe(4); // 10/08~10/11
  });

  it("done=false 체크는 완료가 아니다", () => {
    const g = goal("g", "m");
    const idx = indexCheckins([ck("g", "m", WEEK[0], false)]);
    expect(tallyGoal(g, ["m"], idx, WEEK[0], WEEK[0])).toEqual({ scheduled: 1, completed: 0 });
  });
});

describe("주 N회 목표", () => {
  const g = goal("run", "m", { days_of_week: [], weekly_target: 3 });

  it("한 주 전체: 예정 3, 완료 2", () => {
    const idx = indexCheckins([ck("run", "m", "2026-10-06"), ck("run", "m", "2026-10-10")]);
    expect(tallyGoal(g, ["m"], idx, WEEK[0], WEEK[6])).toEqual({ scheduled: 3, completed: 2 });
  });

  it("화요일까지(2일 경과): 예정 ceil(3×2/7)=1, 완료는 목표(3)까지만 인정", () => {
    const idx = indexCheckins([ck("run", "m", "2026-10-05"), ck("run", "m", "2026-10-06")]);
    expect(tallyGoal(g, ["m"], idx, WEEK[0], "2026-10-06")).toEqual({ scheduled: 1, completed: 2 });
    expect(rateOf({ scheduled: 1, completed: 2 })).toBe(100); // 100 으로 상한
  });

  it("두 주에 걸치면 주마다 센다", () => {
    const idx = indexCheckins([ck("run", "m", "2026-09-29"), ck("run", "m", "2026-10-07")]);
    expect(tallyGoal(g, ["m"], idx, "2026-09-28", WEEK[6])).toEqual({ scheduled: 6, completed: 2 });
  });
});

describe("가족 공동 목표", () => {
  const members = [member("a"), member("b"), member("c", false)];
  const g = goal("fam", null, { days_of_week: [1, 3] });

  it("활성 구성원 전원이 완료한 날만 완료", () => {
    const checkins = [ck("fam", "a", "2026-10-05"), ck("fam", "b", "2026-10-05"), ck("fam", "a", "2026-10-07")];
    expect(familyTally([g], members, checkins, WEEK[0], WEEK[6])).toEqual({ scheduled: 2, completed: 1 });
  });

  it("가족 공동 목표는 개인 달성률에 들어가지 않는다", () => {
    const checkins = [ck("fam", "a", "2026-10-05"), ck("fam", "b", "2026-10-05")];
    expect(memberTally([g], "a", checkins, WEEK[0], WEEK[6])).toEqual({ scheduled: 0, completed: 0 });
  });
});

describe("분류별 달성률", () => {
  const goals = [
    goal("d", "m", { type: "diet" }),
    goal("e", "m", { type: "exercise" }),
    goal("h", "m", { type: "habit", category: "tidy" }),
  ];
  const checkins = [ck("d", "m", WEEK[0]), ck("h", "m", WEEK[0])];

  it("전체 2/3, 건강 1/2, 생활습관 1/1", () => {
    expect(memberTally(goals, "m", checkins, WEEK[0], WEEK[0], "all")).toEqual({ scheduled: 3, completed: 2 });
    expect(memberTally(goals, "m", checkins, WEEK[0], WEEK[0], "health")).toEqual({ scheduled: 2, completed: 1 });
    expect(memberTally(goals, "m", checkins, WEEK[0], WEEK[0], "habit")).toEqual({ scheduled: 1, completed: 1 });
  });

  it("비활성·제안 상태 목표는 제외", () => {
    const gs = [goal("x", "m", { active: false }), goal("y", "m", { status: "proposed" })];
    expect(memberTally(gs, "m", [], WEEK[0], WEEK[6]).scheduled).toBe(0);
  });
});

describe("오늘 목록", () => {
  const goals = [
    goal("daily", "m", { days_of_week: [0, 1, 2, 3, 4, 5, 6] }),
    goal("mwf", "m", { days_of_week: [1, 3, 5] }),
    goal("weekly", "m", { days_of_week: [], weekly_target: 2 }),
  ];

  it("화요일: 매일 + 주 2회 (월·수·금은 제외)", () => {
    const items = todayItems(goals, "m", [], "2026-10-06");
    expect(items.map((i) => i.goal.id)).toEqual(["daily", "weekly"]);
    expect(todayCount(items)).toEqual({ done: 0, total: 2 });
  });

  it("주 2회를 이미 채웠고 오늘 체크 안 했으면 오늘 예정에서 빠진다", () => {
    const checkins = [ck("weekly", "m", "2026-10-05"), ck("weekly", "m", "2026-10-06")];
    const items = todayItems(goals, "m", checkins, "2026-10-07");
    const w = items.find((i) => i.goal.id === "weekly")!;
    expect(w.weekDone).toBe(2);
    expect(todayCount(items)).toEqual({ done: 0, total: 2 }); // daily + mwf
  });
});

describe("스트릭", () => {
  const goals = [goal("a", "m", { days_of_week: [1, 2, 3, 4, 5] })]; // 평일
  it("평일 3일 연속 완료, 주말은 건너뜀", () => {
    const checkins = [ck("a", "m", "2026-10-07"), ck("a", "m", "2026-10-08"), ck("a", "m", "2026-10-09")];
    // 오늘 일요일(예정 없음) → 금·목·수 = 3
    expect(streakDays(goals, "m", checkins, "2026-10-11")).toBe(3);
  });
  it("오늘 미완이면 어제부터 센다, 중간에 빠지면 끊긴다", () => {
    const checkins = [ck("a", "m", "2026-10-07"), ck("a", "m", "2026-10-08")];
    expect(streakDays(goals, "m", checkins, "2026-10-09")).toBe(2);
    expect(streakDays(goals, "m", [ck("a", "m", "2026-10-06"), ck("a", "m", "2026-10-08")], "2026-10-09")).toBe(1);
  });
});
