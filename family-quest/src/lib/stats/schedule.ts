/**
 * 목표 일정과 달성률 계산 (순수 함수). PLAN.md 5.1, 5.3, 5.2 통과 조건의 근거가 된다.
 *
 * 용어
 *  - 예정(scheduled): 그날 해야 하는 항목 수. 요일형은 days_of_week 에 든 날, 주 N회형은 주당 N.
 *  - 완료(completed): 예정 중 done 체크된 수.
 *  - 달성률 = 완료 ÷ 예정 (예정 0 이면 null).
 */
import { addDays, eachDay, endOfWeek, startOfWeek, weekdayOf } from "@/lib/date";
import type { CheckinRow, GoalRow, MemberRow } from "@/lib/db/types";

export type RateKind = "all" | "health" | "habit";

export function isHealth(goal: Pick<GoalRow, "type">): boolean {
  return goal.type === "diet" || goal.type === "exercise";
}

export function matchesKind(goal: Pick<GoalRow, "type">, kind: RateKind): boolean {
  if (kind === "all") return true;
  return kind === "health" ? isHealth(goal) : goal.type === "habit";
}

/** 요일형 목표가 그날 예정인가. 주 N회형은 항상 false (주 단위로 센다) */
export function isScheduledOn(goal: Pick<GoalRow, "days_of_week">, date: string): boolean {
  return goal.days_of_week.length > 0 && goal.days_of_week.includes(weekdayOf(date));
}

export function isWeeklyGoal(goal: Pick<GoalRow, "days_of_week" | "weekly_target">): boolean {
  return goal.days_of_week.length === 0 && goal.weekly_target !== null;
}

/** 목표가 그 날짜에 유효한가 (만든 날 이후, 활성, 승인됨) */
export function isGoalLiveOn(goal: Pick<GoalRow, "active" | "status" | "created_at">, date: string): boolean {
  if (!goal.active || goal.status !== "approved") return false;
  return createdDate(goal) <= date;
}

/** created_at(UTC ISO) → 한국 날짜 키 */
export function createdDate(goal: Pick<GoalRow, "created_at">): string {
  const d = new Date(goal.created_at);
  if (Number.isNaN(d.getTime())) return "0000-00-00";
  const kst = new Date(d.getTime() + 9 * 3600_000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}-${String(kst.getUTCDate()).padStart(2, "0")}`;
}

export interface CheckinIndex {
  get(goalId: string, memberId: string, date: string): CheckinRow | undefined;
}

export function indexCheckins(checkins: CheckinRow[]): CheckinIndex {
  const map = new Map<string, CheckinRow>();
  for (const c of checkins) map.set(`${c.goal_id}|${c.member_id}|${c.date}`, c);
  return { get: (g, m, d) => map.get(`${g}|${m}|${d}`) };
}

export interface Tally {
  scheduled: number;
  completed: number;
}

export function rateOf(t: Tally): number | null {
  if (t.scheduled <= 0) return null;
  return Math.min(100, Math.round((t.completed / t.scheduled) * 100));
}

/**
 * 한 목표의 기간 내 예정·완료.
 * participants: 그 목표를 완료해야 하는 구성원들 (개인 목표는 1명, 가족 공동은 활성 구성원 전원).
 * 가족 공동 목표의 하루는 전원 완료일 때만 완료로 센다.
 */
export function tallyGoal(
  goal: GoalRow,
  participants: string[],
  idx: CheckinIndex,
  from: string,
  to: string,
): Tally {
  if (participants.length === 0) return { scheduled: 0, completed: 0 };
  const allDone = (date: string) => participants.every((m) => idx.get(goal.id, m, date)?.done === true);
  const start = createdDate(goal) > from ? createdDate(goal) : from;
  if (start > to) return { scheduled: 0, completed: 0 };

  if (!isWeeklyGoal(goal)) {
    let scheduled = 0;
    let completed = 0;
    for (const d of eachDay(start, to)) {
      if (!isScheduledOn(goal, d)) continue;
      scheduled += 1;
      if (allDone(d)) completed += 1;
    }
    return { scheduled, completed };
  }

  // 주 N회: 주마다 예정 = ceil(N × 경과일 / 7), 완료 = min(그 주 완료일 수, N)
  const target = goal.weekly_target ?? 0;
  let scheduled = 0;
  let completed = 0;
  for (let ws = startOfWeek(start); ws <= to; ws = addDays(ws, 7)) {
    const we = endOfWeek(ws);
    const a = ws < start ? start : ws;
    const b = we > to ? to : we;
    if (a > b) continue;
    const elapsed = eachDay(a, b).length;
    const expected = Math.min(target, Math.ceil((target * elapsed) / 7));
    let done = 0;
    for (const d of eachDay(a, b)) if (allDone(d)) done += 1;
    scheduled += expected;
    completed += Math.min(done, target);
  }
  return { scheduled, completed };
}

export function sumTally(ts: Tally[]): Tally {
  return ts.reduce((a, t) => ({ scheduled: a.scheduled + t.scheduled, completed: a.completed + t.completed }), {
    scheduled: 0,
    completed: 0,
  });
}

export function activeMemberIds(members: MemberRow[]): string[] {
  return members.filter((m) => m.active).map((m) => m.id);
}

/** 구성원 개인 목표만 (가족 공동 제외) */
export function personalGoalsOf(goals: GoalRow[], memberId: string): GoalRow[] {
  return goals.filter((g) => g.owner_member_id === memberId);
}

export function familyGoals(goals: GoalRow[]): GoalRow[] {
  return goals.filter((g) => g.owner_member_id === null);
}

/** 구성원의 기간 달성률 (개인 목표, kind 필터) */
export function memberTally(
  goals: GoalRow[],
  memberId: string,
  checkins: CheckinRow[],
  from: string,
  to: string,
  kind: RateKind = "all",
): Tally {
  const idx = indexCheckins(checkins);
  const live = personalGoalsOf(goals, memberId).filter((g) => matchesKind(g, kind) && isGoalLiveOn(g, to));
  return sumTally(live.map((g) => tallyGoal(g, [memberId], idx, from, to)));
}

/** 가족 공동 목표의 기간 달성률 */
export function familyTally(goals: GoalRow[], members: MemberRow[], checkins: CheckinRow[], from: string, to: string): Tally {
  const idx = indexCheckins(checkins);
  const participants = activeMemberIds(members);
  const live = familyGoals(goals).filter((g) => isGoalLiveOn(g, to));
  return sumTally(live.map((g) => tallyGoal(g, participants, idx, from, to)));
}

/**
 * 오늘 할 일 목록: 요일형은 오늘 예정인 것, 주 N회형은 이번 주 목표를 아직 못 채운 것(채웠으면 완료로 표시).
 */
export interface TodayItem {
  goal: GoalRow;
  checkin: CheckinRow | undefined;
  done: boolean;
  /** 주 N회형: 이번 주 완료 수 */
  weekDone?: number;
  weekTarget?: number;
}

export function todayItems(goals: GoalRow[], memberId: string, checkins: CheckinRow[], date: string): TodayItem[] {
  const idx = indexCheckins(checkins);
  const live = personalGoalsOf(goals, memberId).filter((g) => isGoalLiveOn(g, date));
  const items: TodayItem[] = [];
  for (const g of live) {
    const checkin = idx.get(g.id, memberId, date);
    if (isWeeklyGoal(g)) {
      const ws = startOfWeek(date);
      const weekDone = eachDay(ws, endOfWeek(ws)).filter((d) => idx.get(g.id, memberId, d)?.done).length;
      items.push({ goal: g, checkin, done: checkin?.done === true, weekDone, weekTarget: g.weekly_target ?? 0 });
    } else if (isScheduledOn(g, date)) {
      items.push({ goal: g, checkin, done: checkin?.done === true });
    }
  }
  return items;
}

/** 오늘 N / M (M = 오늘 예정, 주 N회형은 목표 미달이거나 오늘 완료면 포함) */
export function todayCount(items: TodayItem[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const it of items) {
    if (it.weekTarget !== undefined) {
      const reached = (it.weekDone ?? 0) >= it.weekTarget;
      if (!reached && !it.done) {
        total += 1;
      } else if (it.done) {
        total += 1;
        done += 1;
      }
    } else {
      total += 1;
      if (it.done) done += 1;
    }
  }
  return { done, total };
}

/**
 * 연속 달성(스트릭): 오늘부터 거꾸로, 예정된 요일형 목표를 전부 완료한 날을 센다.
 * 예정이 없는 날은 건너뛴다. 오늘 아직 미완이면 어제부터 센다. 표시만 하고 스티커와 무관.
 */
export function streakDays(goals: GoalRow[], memberId: string, checkins: CheckinRow[], today: string): number {
  const idx = indexCheckins(checkins);
  const daily = personalGoalsOf(goals, memberId).filter((g) => !isWeeklyGoal(g) && g.active && g.status === "approved");
  const fullDay = (d: string): boolean | null => {
    const due = daily.filter((g) => createdDate(g) <= d && isScheduledOn(g, d));
    if (due.length === 0) return null;
    return due.every((g) => idx.get(g.id, memberId, d)?.done);
  };
  let streak = 0;
  let d = today;
  const first = fullDay(d);
  if (first === false) d = addDays(d, -1); // 오늘 미완이면 어제부터
  for (let i = 0; i < 366; i++) {
    const r = fullDay(d);
    if (r === false) break;
    if (r === true) streak += 1;
    d = addDays(d, -1);
    if (d < addDays(today, -366)) break;
  }
  return streak;
}
