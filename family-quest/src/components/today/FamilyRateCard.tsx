import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { GRAPH_COLOR } from "@/lib/design/tokens";
import type { MockMember } from "@/lib/mock/today";

interface FamilyRateCardProps {
  members: MockMember[];
  familyRate: number;
}

/**
 * 가족 주간 달성률 카드.
 * 구성원은 sort_order 고정 순서. 달성률로 정렬하거나 순위를 매기지 않는다 (PLAN.md 3절 공개 범위).
 */
export function FamilyRateCard({ members, familyRate }: FamilyRateCardProps) {
  const ordered = [...members].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Card>
      <h2 className="text-[16px] font-bold">가족 주간 달성률</h2>
      <ul className="mt-3 grid grid-cols-4 gap-2">
        {ordered.map((m) => (
          <li key={m.id}>
            <Link
              href={`/records?member=${m.id}`}
              className="flex min-h-[44px] flex-col items-center gap-1.5 rounded-[16px] py-1"
              aria-label={`${m.display_name} 주간 달성률 ${m.weekly_rate}%, 오늘 ${m.today_done} / ${m.today_total}`}
            >
              <ProgressRing value={m.weekly_rate} color={GRAPH_COLOR[m.color]} size={60} />
              <span className="text-[13px] font-bold">{m.display_name}</span>
              <span className="text-[12px] text-muted">
                오늘 {m.today_done} / {m.today_total}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-line pt-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-muted">가족 공동</p>
          <p className="text-[13px] font-bold">{familyRate}%</p>
        </div>
        <ProgressBar
          className="mt-1.5"
          value={familyRate}
          color="var(--color-graph-pink)"
          label={`가족 공동 달성률 ${familyRate}%`}
        />
      </div>
    </Card>
  );
}
