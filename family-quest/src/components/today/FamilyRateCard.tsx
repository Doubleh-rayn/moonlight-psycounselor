"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { GRAPH_COLOR } from "@/lib/design/tokens";
import { useReadyFamily } from "@/lib/store/FamilyStore";
import { familyTally, memberTally, rateOf, todayCount, todayItems } from "@/lib/stats/schedule";
import { startOfWeek } from "@/lib/date";

/**
 * 가족 주간 달성률 카드. 구성원은 sort_order 고정 순서, 달성률 정렬·순위 없음 (PLAN.md 3절).
 */
export function FamilyRateCard() {
  const { snapshot, today } = useReadyFamily();
  const from = startOfWeek(today);
  const members = snapshot.members.filter((m) => m.active).sort((a, b) => a.sort_order - b.sort_order);
  const familyRate = rateOf(familyTally(snapshot.goals, snapshot.members, snapshot.checkins, from, today));
  const hasFamilyGoals = snapshot.goals.some((g) => g.owner_member_id === null && g.active && g.status === "approved");

  return (
    <Card>
      <h2 className="text-[16px] font-bold">가족 주간 달성률</h2>
      <ul className="mt-3 grid grid-cols-4 gap-2">
        {members.map((m) => {
          const rate = rateOf(memberTally(snapshot.goals, m.id, snapshot.checkins, from, today));
          const tc = todayCount(todayItems(snapshot.goals, m.id, snapshot.checkins, today));
          return (
            <li key={m.id}>
              <Link
                href={`/records?member=${m.id}`}
                className="flex min-h-[44px] flex-col items-center gap-1.5 rounded-[16px] py-1"
                aria-label={`${m.display_name} 주간 달성률 ${rate ?? 0}%, 오늘 ${tc.done} / ${tc.total}`}
              >
                <ProgressRing value={rate ?? 0} color={GRAPH_COLOR[m.color]} size={60}>
                  {rate === null ? "–" : `${rate}%`}
                </ProgressRing>
                <span className="text-[13px] font-bold">{m.display_name}</span>
                <span className="text-[12px] text-muted">
                  오늘 {tc.done} / {tc.total}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {hasFamilyGoals && (
        <div className="mt-4 border-t border-line pt-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-muted">가족 공동</p>
            <p className="text-[13px] font-bold">{familyRate === null ? "–" : `${familyRate}%`}</p>
          </div>
          <ProgressBar className="mt-1.5" value={familyRate ?? 0} color="var(--color-graph-pink)" label={`가족 공동 달성률 ${familyRate ?? 0}%`} />
        </div>
      )}
    </Card>
  );
}
