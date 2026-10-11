import type { GoalRow } from "@/lib/db/types";
import { isHealth } from "@/lib/stats/schedule";

/** 동시 활성 한도 (PLAN.md 5.5): 구성원당 건강 5개, 생활습관 3개. 가족 공동 목표는 한도에 넣지 않는다 */
export const ACTIVE_LIMIT = { health: 5, habit: 3 } as const;

export function activeCounts(goals: GoalRow[], memberId: string): { health: number; habit: number } {
  const mine = goals.filter((g) => g.owner_member_id === memberId && g.active);
  return { health: mine.filter(isHealth).length, habit: mine.filter((g) => g.type === "habit").length };
}

/** 추가 가능 여부. 불가하면 안내 문구 */
export function checkLimit(goals: GoalRow[], memberId: string | null, type: GoalRow["type"]): string | null {
  if (memberId === null) return null;
  const c = activeCounts(goals, memberId);
  if (type === "habit" && c.habit >= ACTIVE_LIMIT.habit) return `생활습관은 한 번에 ${ACTIVE_LIMIT.habit}개까지 진행할 수 있습니다. 기존 항목을 끝내거나 비활성화한 뒤 추가해 주세요.`;
  if (type !== "habit" && c.health >= ACTIVE_LIMIT.health) return `건강 퀘스트(식단·운동)는 한 번에 ${ACTIVE_LIMIT.health}개까지 진행할 수 있습니다.`;
  return null;
}
