/**
 * 진행 상황에 따른 계획 조정 (PLAN.md 8.3 마지막 항목).
 *  2주 연속 실제 감량이 계획보다 빠르면 조정량 10% 낮춘다.
 *  느리면 조정량은 그대로 두고 기간을 1주 늘린다.
 * 체중 기록이 저장될 때 호출된다. 판단은 순수 함수(judgeProgress)로 분리해 테스트한다.
 */
import type { FamilyRepo } from "@/lib/repo/types";
import type { PlanRow, PlanWeekRow, WeightLogRow } from "@/lib/db/types";
import { diffDays } from "@/lib/date";
import { KCAL_PER_KG, PROGRESS_FAST_REDUCTION, PROGRESS_SLOW_EXTEND_WEEKS } from "./constants";
import { weeksOf, weekNoOn } from "./progress";

export type ProgressVerdict = "fast" | "slow" | "on_track" | "insufficient";

/**
 * 최근 두 번의 주간 비교. 기록은 날짜순. 각 비교 구간(7일 이상 떨어진 두 기록)의 실제 감량을
 * 계획 감량(그 구간 plan_weeks 의 daily_deficit 합 ÷ 7700)과 비교한다. 허용 오차 ±25%.
 */
export function judgeProgress(plan: PlanRow, weeks: PlanWeekRow[], logs: WeightLogRow[], today: string): ProgressVerdict {
  if (plan.kind !== "loss") return "insufficient";
  const sorted = [...logs].filter((l) => l.date <= today && l.date >= plan.start_date).sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 3) return "insufficient";
  const last3 = sorted.slice(-3);
  const verdicts: ("fast" | "slow" | "ok")[] = [];
  for (let i = 1; i < last3.length; i++) {
    const a = last3[i - 1];
    const b = last3[i];
    const days = diffDays(a.date, b.date);
    if (days < 5) return "insufficient";
    const actual = a.weight - b.weight;
    // 구간의 계획 감량
    let planned = 0;
    for (let d = 0; d < days; d++) {
      const wn = weekNoOn(plan, a.date) + Math.floor((diffDays(plan.start_date, a.date) % 7 + d) / 7);
      const w = weeks.find((x) => x.week_no === wn);
      planned += (w?.daily_deficit ?? 0) / KCAL_PER_KG;
    }
    if (planned <= 0) return "insufficient";
    const ratio = actual / planned;
    verdicts.push(ratio > 1.25 ? "fast" : ratio < 0.75 ? "slow" : "ok");
  }
  if (verdicts.every((v) => v === "fast")) return "fast";
  if (verdicts.every((v) => v === "slow")) return "slow";
  return "on_track";
}

/** 조정을 저장소에 반영한다. 돌려주는 문자열은 사용자 안내 문구 */
export async function applyProgressAdjustment(
  repo: FamilyRepo,
  plan: PlanRow,
  planWeeks: PlanWeekRow[],
  logs: WeightLogRow[],
  today: string,
): Promise<string | null> {
  const weeks = weeksOf(planWeeks, plan.id);
  const verdict = judgeProgress(plan, weeks, logs, today);
  const cur = weekNoOn(plan, today);
  if (verdict === "fast") {
    const future = weeks.filter((w) => w.week_no >= cur && w.stage !== "maintain");
    for (const w of future) {
      const f = 1 - PROGRESS_FAST_REDUCTION;
      await repo.update("plan_weeks", w.id, {
        daily_deficit: round1(w.daily_deficit * f),
        diet_kcal: round1(w.diet_kcal * f),
        exercise_kcal: round1(w.exercise_kcal * f),
        exercise_minutes_per_week: round1(w.exercise_minutes_per_week * f),
      });
    }
    return "2주 연속 계획보다 빠르게 줄어 조정량을 10% 낮췄습니다.";
  }
  if (verdict === "slow") {
    const last = weeks.filter((w) => w.stage !== "maintain").at(-1);
    if (!last) return null;
    const after = weeks.filter((w) => w.week_no > last.week_no);
    // 마지막 감량 주 뒤에 같은 내용의 주를 1주 추가하고, 뒤따르는 주(유지)는 번호를 민다
    for (const w of [...after].reverse()) await repo.update("plan_weeks", w.id, { week_no: w.week_no + PROGRESS_SLOW_EXTEND_WEEKS });
    await repo.insert("plan_weeks", {
      plan_id: plan.id,
      week_no: last.week_no + 1,
      stage: last.stage,
      diet_ratio: last.diet_ratio,
      daily_deficit: last.daily_deficit,
      diet_kcal: last.diet_kcal,
      exercise_kcal: last.exercise_kcal,
      exercise_minutes_per_week: last.exercise_minutes_per_week,
      extended: true,
    });
    await repo.update("plans", plan.id, { weeks: plan.weeks + PROGRESS_SLOW_EXTEND_WEEKS });
    return "2주 연속 계획보다 느려 기간을 1주 늘렸습니다.";
  }
  return null;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
