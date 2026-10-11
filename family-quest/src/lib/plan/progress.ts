/**
 * 계획 진행 위치 (순수 함수). 계산 로직(8절)은 lib/plan/calc 에, 여기는 "지금 몇 주차·어느 단계인가"만 다룬다.
 */
import { addDays, diffDays } from "@/lib/date";
import type { PlanRow, PlanStage, PlanWeekRow } from "@/lib/db/types";

export const STAGE_ORDER: PlanStage[] = ["adapt", "expand", "strengthen", "maintain"];

export const STAGE_LABEL: Record<PlanStage, string> = {
  adapt: "적응",
  expand: "확장",
  strengthen: "강화",
  maintain: "유지",
};

export function stageNo(stage: PlanStage): number {
  return STAGE_ORDER.indexOf(stage) + 1;
}

/** 계획 시작일 기준 주차 (1부터). 시작 전이면 0 */
export function weekNoOn(plan: Pick<PlanRow, "start_date">, date: string): number {
  const d = diffDays(plan.start_date, date);
  if (d < 0) return 0;
  return Math.floor(d / 7) + 1;
}

/** 주차의 날짜 범위 */
export function weekRange(plan: Pick<PlanRow, "start_date">, weekNo: number): { from: string; to: string } {
  const from = addDays(plan.start_date, (weekNo - 1) * 7);
  return { from, to: addDays(from, 6) };
}

export function activePlanOf(plans: PlanRow[], memberId: string): PlanRow | null {
  return plans.find((p) => p.member_id === memberId && p.status === "active") ?? null;
}

export function weeksOf(planWeeks: PlanWeekRow[], planId: string): PlanWeekRow[] {
  return planWeeks.filter((w) => w.plan_id === planId).sort((a, b) => a.week_no - b.week_no);
}

/** 오늘 해당하는 plan_week. 계획 기간이 끝났으면 null */
export function currentWeek(plan: PlanRow, planWeeks: PlanWeekRow[], date: string): PlanWeekRow | null {
  const n = weekNoOn(plan, date);
  if (n <= 0) return null;
  return weeksOf(planWeeks, plan.id).find((w) => w.week_no === n) ?? null;
}

/** 단계별 주차 범위 (연장 포함) */
export function stageSpans(weeks: PlanWeekRow[]): { stage: PlanStage; from: number; to: number; weeks: PlanWeekRow[] }[] {
  const out: { stage: PlanStage; from: number; to: number; weeks: PlanWeekRow[] }[] = [];
  for (const w of weeks) {
    const last = out[out.length - 1];
    if (last && last.stage === w.stage) {
      last.to = w.week_no;
      last.weeks.push(w);
    } else out.push({ stage: w.stage, from: w.week_no, to: w.week_no, weeks: [w] });
  }
  return out;
}
