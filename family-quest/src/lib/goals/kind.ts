import type { GoalRow, GoalType, HabitCategory } from "@/lib/db/types";
import type { QuestKind, Tone } from "@/lib/design/tokens";

/** 목표 → 화면 분류 (아이콘·색). 식단은 물/음료 관련이면 blue, 그 외 mint */
export function kindOf(goal: Pick<GoalRow, "type" | "owner_member_id" | "title">): QuestKind {
  if (goal.owner_member_id === null) return "family";
  if (goal.type === "exercise") return "exercise";
  if (goal.type === "habit") return "habit";
  return /물|음료|주스|탄산|커피/.test(goal.title) ? "water" : "meal";
}

export const TYPE_LABEL: Record<GoalType, string> = { diet: "식단", exercise: "운동", habit: "생활습관" };
export const CATEGORY_LABEL: Record<HabitCategory, string> = { tidy: "정리정돈", study: "공부·독서", sleep: "수면", etc: "기타" };

export function typeLabel(goal: Pick<GoalRow, "type" | "category">): string {
  if (goal.type === "habit" && goal.category) return CATEGORY_LABEL[goal.category];
  return TYPE_LABEL[goal.type];
}

const DAY = ["일", "월", "화", "수", "목", "금", "토"];

/** 반복 규칙 문구: "매일", "월·수·금", "주 3회" */
export function scheduleLabel(goal: Pick<GoalRow, "days_of_week" | "weekly_target">): string {
  if (goal.days_of_week.length === 0) return `주 ${goal.weekly_target ?? 0}회`;
  if (goal.days_of_week.length === 7) return "매일";
  const sorted = [...goal.days_of_week].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)); // 월요일부터
  if (sorted.join() === "1,2,3,4,5") return "평일";
  if (sorted.join() === "6,0") return "주말";
  return sorted.map((d) => DAY[d]).join("·");
}

export function measureUnit(measure: GoalRow["measure"]): string {
  return measure === "minutes" ? "분" : measure === "count" ? "회" : "";
}

export const TONE_OF_TYPE: Record<GoalType, Tone> = { diet: "mint", exercise: "peach", habit: "lavender" };
