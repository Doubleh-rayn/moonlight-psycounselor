"use client";

import Link from "next/link";
import { ChevronRight, Star, Flame } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { toneStyle } from "@/lib/design/tokens";
import { useSeoulToday } from "@/lib/useSeoulToday";
import { useReadyFamily } from "@/lib/store/FamilyStore";
import { memberTally, rateOf, streakDays } from "@/lib/stats/schedule";
import { startOfWeek } from "@/lib/date";
import { activePlanOf, currentWeek, STAGE_LABEL, stageNo } from "@/lib/plan/progress";
import { PASS_RATE } from "@/lib/plan/constants";

/** 상단 hero: 날짜, 내 스티커, 현재 단계와 이번 주 실천율(70% 기준선). 누르면 퀘스트 화면 */
export function TodayHero() {
  const { snapshot, me, today } = useReadyFamily();
  const { label } = useSeoulToday();

  const balance = snapshot.memberBalances.find((b) => b.member_id === me.id)?.balance ?? 0;
  const plan = activePlanOf(snapshot.plans, me.id);
  const week = plan ? currentWeek(plan, snapshot.planWeeks, today) : null;
  const kind = plan ? "health" : "all";
  const weekRate = rateOf(memberTally(snapshot.goals, me.id, snapshot.checkins, startOfWeek(today), today, kind));
  const streak = streakDays(snapshot.goals, me.id, snapshot.checkins, today);

  return (
    <header
      className="rounded-b-hero bg-(--face) text-(--deep) raised-hero px-5 pb-6 pt-[max(20px,env(safe-area-inset-top))]"
      style={toneStyle("hero")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="min-h-[20px] text-[13px] font-medium text-muted">{label || " "}</p>
          <h1 className="mt-1 text-[28px] font-extrabold leading-tight">{me.display_name}의 오늘</h1>
          {streak > 0 && (
            <p className="mt-1 flex items-center gap-1 text-[13px] font-bold text-muted">
              <Flame size={14} strokeWidth={2.2} aria-hidden /> {streak}일 연속 달성
            </p>
          )}
        </div>
        <Link
          href="/rewards"
          className="flex min-h-[44px] items-center gap-1.5 rounded-[16px] bg-(--face) px-3 text-(--deep) raised-3"
          style={toneStyle("gold")}
          aria-label={`내 스티커 ${balance}개`}
        >
          <Star size={18} strokeWidth={2.2} aria-hidden />
          <span className="text-[16px] font-extrabold">{balance}</span>
        </Link>
      </div>

      <Link href="/quest" className="mt-4 block rounded-card bg-(--face) p-4 text-(--deep) raised-card" style={toneStyle("panel")}>
        <div className="flex items-center justify-between">
          <p className="text-[16px] font-bold">
            {week ? `${stageNo(week.stage)}단계 · ${STAGE_LABEL[week.stage]}` : plan ? "계획 기간 종료" : "계획 없음"}
          </p>
          <span className="flex items-center text-[13px] font-semibold text-muted">
            퀘스트 지도 <ChevronRight size={16} aria-hidden />
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <p className="text-[13px] text-muted">{plan ? "이번 주 건강 퀘스트 실천율" : "이번 주 실천율"}</p>
          <p className="text-[16px] font-extrabold">{weekRate === null ? "–" : `${weekRate}%`}</p>
        </div>
        <ProgressBar
          className="mt-2"
          value={weekRate ?? 0}
          color="var(--color-graph-blue)"
          marker={PASS_RATE}
          label={`이번 주 실천율 ${weekRate ?? 0}%, 통과 기준 ${PASS_RATE}%`}
        />
        <p className="mt-1.5 text-[12px] text-muted">
          {plan ? `기준선 ${PASS_RATE}% 를 넘으면 다음 단계가 열립니다` : "설정에서 계획을 만들면 단계가 시작됩니다"}
        </p>
      </Link>
    </header>
  );
}
