"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { QuestIcon } from "@/components/quest/QuestIcon";
import { useReadyFamily } from "@/lib/store/FamilyStore";
import { useActions } from "@/lib/store/actions";
import { usePinGate } from "@/components/app/PinGate";
import { useToast } from "@/components/app/Toast";
import { scheduleLabel, typeLabel } from "@/lib/goals/kind";
import type { GoalRow, MemberRow } from "@/lib/db/types";

/** 승인 대기 중인 제안 습관과 승인 버튼 (관리자 PIN) */
export function PendingGoals({ member }: { member: MemberRow }) {
  const { snapshot } = useReadyFamily();
  const { run } = useActions();
  const requirePin = usePinGate();
  const toast = useToast();
  const pending = snapshot.goals.filter((g) => g.owner_member_id === member.id && g.active && g.status === "proposed");
  if (pending.length === 0) return null;

  const decide = async (g: GoalRow, approve: boolean) => {
    const ok = await requirePin(approve ? "습관 승인에는 관리자 PIN 이 필요합니다" : "제안 거절에는 관리자 PIN 이 필요합니다");
    if (!ok) return;
    const patch: Partial<GoalRow> = approve ? { status: "approved", created_at: new Date().toISOString() } : { active: false };
    await run(
      "승인",
      (s) => ({ ...s, goals: s.goals.map((x) => (x.id === g.id ? { ...x, ...patch } : x)) }),
      (repo) => repo.update("goals", g.id, patch),
    ).catch(() => {});
    toast(approve ? "승인했습니다. 오늘부터 시작합니다." : "제안을 거절했습니다");
  };

  return (
    <Card tone="lavender">
      <h2 className="text-[16px] font-bold">승인 대기 중인 습관</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {pending.map((g) => (
          <li key={g.id} className="flex items-center gap-3 rounded-[16px] bg-white/60 p-2.5">
            <QuestIcon goal={g} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold">{g.title}</p>
              <p className="text-[12px] opacity-80">
                {scheduleLabel(g)} · {typeLabel(g)} · 스티커 {g.stickers}
              </p>
            </div>
            <Button tone="surface" onClick={() => void decide(g, false)} aria-label={`${g.title} 거절`}>
              거절
            </Button>
            <Button tone="gold" onClick={() => void decide(g, true)} aria-label={`${g.title} 승인`}>
              승인
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
