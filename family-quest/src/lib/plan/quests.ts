/**
 * 계획 → 퀘스트 생성 (PLAN.md 8.4). 순수 함수.
 * 식단 감소분은 대체 행동 퀘스트의 조합으로, 운동 증가분은 "빠르게 걷기 N분, 주 M회"로 바꾼다.
 */
import type { PlanStage } from "@/lib/db/types";
import type { InsertInput } from "@/lib/repo/types";
import { DIET_QUEST_OPTIONS, EXERCISE_SESSIONS, WALK_SESSION_MIN } from "./constants";
import type { StageWeek } from "./calc";

export type GoalDraft = InsertInput<"quests">;

/**
 * 식단 kcal 에 가장 가까운 대체 퀘스트 조합 (각 항목 0~1회).
 * 미성년은 끼니를 줄이는 항목(밥 덜기)을 빼고 가당 음료·과자·야식 대체만 쓴다.
 */
export function pickDietQuests(dietKcal: number, minor: boolean): { key: string; title: string; kcal: number }[] {
  const options = DIET_QUEST_OPTIONS.filter((o) => !(minor && o.key === "rice"));
  if (dietKcal <= 0) return [];
  let best: typeof options = [];
  let bestDiff = Infinity;
  const n = options.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const subset = options.filter((_, i) => mask & (1 << i));
    const sum = subset.reduce((s, o) => s + o.kcal, 0);
    const diff = Math.abs(sum - dietKcal);
    if (diff < bestDiff - 1e-9 || (Math.abs(diff - bestDiff) < 1e-9 && subset.length < best.length)) {
      best = subset;
      bestDiff = diff;
    }
  }
  return best.map((o) => ({ key: o.key, title: o.title, kcal: o.kcal }));
}

/** 주간 운동 분 → 주 3~5회, 1회 15~60분 (5분 단위). 30분에 가장 가까운 분할을 고른다 */
export function pickWalkQuest(weeklyMinutes: number): { minutes: number; sessions: number } | null {
  if (weeklyMinutes < WALK_SESSION_MIN.min) return null;
  let best: { minutes: number; sessions: number } | null = null;
  for (let s = EXERCISE_SESSIONS.min; s <= EXERCISE_SESSIONS.max; s++) {
    const raw = weeklyMinutes / s;
    const minutes = Math.min(WALK_SESSION_MIN.max, Math.max(WALK_SESSION_MIN.min, Math.round(raw / 5) * 5));
    if (!best || Math.abs(minutes - 30) < Math.abs(best.minutes - 30)) best = { minutes, sessions: s };
  }
  return best;
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/**
 * 한 단계의 건강 퀘스트 초안 (goals 행). plan_id 와 plan_stage 로 단계 교체 시 식별한다.
 * existingTitles: 이미 활성인 같은 제목의 목표가 있으면 중복 생성하지 않는다.
 */
export function draftStageGoals(opts: {
  planId: string;
  memberId: string;
  stage: PlanStage;
  week: StageWeek;
  minor: boolean;
  existingTitles?: Iterable<string>;
}): GoalDraft[] {
  const { planId, memberId, stage, week, minor } = opts;
  const existing = new Set(opts.existingTitles ?? []);
  const base = { owner_member_id: memberId, source: "plan" as const, plan_id: planId, plan_stage: stage, status: "approved" as const };
  const drafts: GoalDraft[] = [];

  for (const d of pickDietQuests(week.diet_kcal, minor)) {
    drafts.push({ ...base, type: "diet", title: d.title, measure: "done", target_value: 1, days_of_week: ALL_DAYS, stickers: 1 });
  }

  if (minor) {
    const daily = Math.round(week.exercise_minutes_per_week / 7);
    if (daily > 0) {
      drafts.push({ ...base, type: "exercise", title: `활발하게 움직이기 ${daily}분`, measure: "minutes", target_value: daily, days_of_week: ALL_DAYS, stickers: 1 });
    }
  } else {
    const walk = pickWalkQuest(week.exercise_minutes_per_week);
    if (walk) {
      drafts.push({ ...base, type: "exercise", title: `빠르게 걷기 ${walk.minutes}분`, measure: "minutes", target_value: walk.minutes, days_of_week: [], weekly_target: walk.sessions, stickers: 2 });
    }
  }
  return drafts.filter((d) => !existing.has(d.title));
}
