import { Droplets, Utensils, Footprints, Sparkles, Users, BookOpen, Moon, Boxes, type LucideIcon } from "lucide-react";
import { IconTile } from "@/components/ui/IconTile";
import { KIND_TONE, type QuestKind } from "@/lib/design/tokens";
import type { GoalRow } from "@/lib/db/types";
import { kindOf, typeLabel } from "@/lib/goals/kind";

const ICON: Record<QuestKind, LucideIcon> = {
  water: Droplets,
  meal: Utensils,
  exercise: Footprints,
  habit: Sparkles,
  family: Users,
};

const HABIT_ICON: Record<string, LucideIcon> = { study: BookOpen, sleep: Moon, tidy: Boxes };

export function iconFor(goal: Pick<GoalRow, "type" | "owner_member_id" | "title" | "category">): LucideIcon {
  if (goal.type === "habit" && goal.owner_member_id !== null && goal.category && HABIT_ICON[goal.category]) return HABIT_ICON[goal.category];
  return ICON[kindOf(goal)];
}

export function QuestIcon({ goal, className }: { goal: Pick<GoalRow, "type" | "owner_member_id" | "title" | "category">; className?: string }) {
  return <IconTile icon={iconFor(goal)} tone={KIND_TONE[kindOf(goal)]} label={typeLabel(goal)} className={className} />;
}
