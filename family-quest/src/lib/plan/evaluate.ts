/**
 * 단계 통과 판정과 퀘스트 교체 (PLAN.md 5.2). 판정은 순수 함수, 적용은 저장소 호출.
 *  - 주차가 끝나면 passed 를 채운다 (그 주 건강 퀘스트 실천율 ≥ 70%).
 *  - 단계의 마지막 주가 끝나면 단계 전체 실천율로 통과를 판정한다.
 *      통과: 보너스 스티커 5개 (reason_key 로 중복 방지)
 *      미통과: 벌칙 없이 같은 단계를 1주 연장 (뒤 주차 번호를 민다)
 *  - 유지 단계 통과 조건: 마지막 체중이 목표 ±1kg 이내. 통과하면 계획 종료.
 *  - 현재 단계의 plan 퀘스트가 없으면 만들고, 지난 단계의 plan 퀘스트는 비활성화한다.
 */
import type { CheckinRow, GoalRow, PlanRow, PlanStage, PlanWeekRow, WeightLogRow } from "@/lib/db/types";
import type { FamilyRepo, FamilySnapshot } from "@/lib/repo/types";
import { memberTally, rateOf } from "@/lib/stats/schedule";
import { MAINTAIN_TOLERANCE_KG, PASS_RATE, STAGE_BONUS_STICKERS } from "./constants";
import { STAGE_LABEL, stageSpans, weekNoOn, weekRange, weeksOf } from "./progress";
import { draftStageGoals } from "./quests";
import { isAdultAge, ageFromYearMonth } from "./calc";

export interface WeekVerdict {
  week: PlanWeekRow;
  rate: number | null;
  passed: boolean;
}

/** 끝난 주 중 아직 판정하지 않은 주의 결과 */
export function pendingWeekVerdicts(plan: PlanRow, weeks: PlanWeekRow[], goals: GoalRow[], checkins: CheckinRow[], today: string): WeekVerdict[] {
  const out: WeekVerdict[] = [];
  for (const w of weeks) {
    if (w.passed !== null) continue;
    const { from, to } = weekRange(plan, w.week_no);
    if (to >= today) continue; // 아직 진행 중
    const rate = rateOf(memberTally(goals, plan.member_id, checkins, from, to, "health"));
    out.push({ week: w, rate, passed: (rate ?? 0) >= PASS_RATE });
  }
  return out;
}

export interface StageVerdict {
  stage: PlanStage;
  lastWeek: PlanWeekRow;
  rate: number | null;
  passed: boolean;
}

/**
 * 판정이 필요한 단계: 주차 순서대로 보며, 마지막 주가 끝나지 않은 단계에 닿으면 멈춘다.
 * 이미 판정된 단계(judgedKeys 에 보너스 키가 있음)는 건너뛴다.
 * 미통과로 연장된 단계는 연장 주가 끝난 뒤 다시 판정된다 (키가 달라진다).
 */
export function stageVerdictAt(
  plan: PlanRow,
  weeks: PlanWeekRow[],
  goals: GoalRow[],
  checkins: CheckinRow[],
  logs: WeightLogRow[],
  today: string,
  judgedKeys: Set<string> = new Set(),
): StageVerdict | null {
  for (const span of stageSpans(weeks)) {
    const last = span.weeks[span.weeks.length - 1];
    const { to } = weekRange(plan, last.week_no);
    if (to >= today) return null;
    if (judgedKeys.has(bonusKey(plan, span.stage, last.week_no))) continue;

    if (span.stage === "maintain") {
      const latest = [...logs].filter((l) => l.member_id === plan.member_id && l.date <= today).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
      const passed = latest !== undefined && Math.abs(latest.weight - plan.target_weight) <= MAINTAIN_TOLERANCE_KG;
      return { stage: "maintain", lastWeek: last, rate: null, passed };
    }
    const from = weekRange(plan, span.weeks[0].week_no).from;
    const rate = rateOf(memberTally(goals, plan.member_id, checkins, from, to, "health"));
    return { stage: span.stage, lastWeek: last, rate, passed: (rate ?? 0) >= PASS_RATE };
  }
  return null;
}

export function bonusKey(plan: PlanRow, stage: PlanStage, weekNo: number): string {
  return `plan:${plan.id}:${stage}:${weekNo}`;
}

/**
 * 계획 상태를 오늘 기준으로 맞춘다. 앱이 열릴 때 호출하며 여러 번 실행해도 결과가 같다.
 * 돌려주는 문자열 배열은 사용자 안내 문구.
 */
export async function maintainPlans(repo: FamilyRepo, snap: FamilySnapshot, today: string): Promise<string[]> {
  const notes: string[] = [];
  for (const plan of snap.plans.filter((p) => p.status === "active")) {
    const member = snap.members.find((m) => m.id === plan.member_id);
    if (!member) continue;
    const weeks = weeksOf(snap.planWeeks, plan.id);
    if (weeks.length === 0) continue;

    // 1) 끝난 주 판정 기록
    for (const v of pendingWeekVerdicts(plan, weeks, snap.goals, snap.checkins, today)) {
      await repo.update("plan_weeks", v.week.id, { passed: v.passed });
      v.week.passed = v.passed;
    }

    // 2) 방금 끝난 단계 판정 → 보너스 또는 연장
    const judged = new Set(snap.bonuses.map((b) => b.reason_key).filter((k): k is string => !!k));
    const sv = stageVerdictAt(plan, weeks, snap.goals, snap.checkins, snap.weightLogs, today, judged);
    if (sv) {
      const key = bonusKey(plan, sv.stage, sv.lastWeek.week_no);
      if (sv.passed) {
        const b = await repo.insertBonusOnce({ member_id: plan.member_id, amount: STAGE_BONUS_STICKERS, reason: `${STAGE_LABEL[sv.stage]} 단계 통과`, reason_key: key });
        if (b) notes.push(`${member.display_name}: ${STAGE_LABEL[sv.stage]} 단계 통과! 보너스 스티커 ${STAGE_BONUS_STICKERS}개`);
        if (sv.stage === "maintain") {
          await repo.update("plans", plan.id, { status: "done" });
          notes.push(`${member.display_name}: 계획을 모두 마쳤습니다.`);
          continue;
        }
      } else {
        const after = weeks.filter((w) => w.week_no > sv.lastWeek.week_no);
        for (const w of [...after].reverse()) await repo.update("plan_weeks", w.id, { week_no: w.week_no + 1 });
        try {
          await repo.insert("plan_weeks", {
            plan_id: plan.id, week_no: sv.lastWeek.week_no + 1, stage: sv.stage, diet_ratio: sv.lastWeek.diet_ratio,
            daily_deficit: sv.lastWeek.daily_deficit, diet_kcal: sv.lastWeek.diet_kcal, exercise_kcal: sv.lastWeek.exercise_kcal,
            exercise_minutes_per_week: sv.lastWeek.exercise_minutes_per_week, extended: true,
          });
          await repo.update("plans", plan.id, { weeks: plan.weeks + (sv.stage === "maintain" ? 0 : 1) });
          notes.push(`${member.display_name}: ${STAGE_LABEL[sv.stage]} 단계 실천율 ${sv.rate ?? 0}% 로 1주 연장합니다 (기준 ${PASS_RATE}%).`);
        } catch {
          /* 다른 기기가 먼저 연장한 경우 */
        }
        continue; // 연장 후에는 재조회 뒤 다시 처리
      }
    }

    // 3) 현재 단계 퀘스트 동기화
    const cur = weekNoOn(plan, today);
    const curWeek = weeks.find((w) => w.week_no === cur);
    if (!curWeek) continue;
    const planGoals = snap.goals.filter((g) => g.plan_id === plan.id && g.active);
    const stale = planGoals.filter((g) => g.plan_stage !== curWeek.stage);
    for (const g of stale) await repo.update("goals", g.id, { active: false });
    if (!planGoals.some((g) => g.plan_stage === curWeek.stage)) {
      const age = member.birth_year_month ? ageFromYearMonth(member.birth_year_month, today).years : 30;
      const existingTitles = snap.goals.filter((g) => g.owner_member_id === plan.member_id && g.active && g.plan_id !== plan.id).map((g) => g.title);
      const drafts = draftStageGoals({ planId: plan.id, memberId: plan.member_id, stage: curWeek.stage, week: curWeek, minor: member.is_minor || !isAdultAge(age), existingTitles });
      if (drafts.length > 0) {
        await repo.insertMany("goals", drafts);
        notes.push(`${member.display_name}: ${STAGE_LABEL[curWeek.stage]} 단계 퀘스트 ${drafts.length}개를 만들었습니다.`);
      }
    }
  }
  return notes;
}
