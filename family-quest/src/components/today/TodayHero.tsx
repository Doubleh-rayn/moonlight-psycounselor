"use client";

import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { toneStyle } from "@/lib/design/tokens";
import { useSeoulToday } from "@/lib/useSeoulToday";

interface TodayHeroProps {
  memberName: string;
  stickers: number;
  stage: { no: number; name: string; weeklyRate: number };
}

/** 단계 통과 기준 실천율 (PLAN.md 5.2) */
const PASS_RATE = 70;

/** 상단 hero: 날짜, 내 스티커, 현재 단계와 이번 주 실천율. 누르면 퀘스트 화면. */
export function TodayHero({ memberName, stickers, stage }: TodayHeroProps) {
  const { label } = useSeoulToday();

  return (
    <header
      className="rounded-b-hero bg-(--face) text-(--deep) raised-hero px-5 pb-6 pt-[max(20px,env(safe-area-inset-top))]"
      style={toneStyle("hero")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {/* 서버 렌더 시 빈 문자열 → 자리 높이 유지 */}
          <p className="min-h-[20px] text-[13px] font-medium text-muted">{label || " "}</p>
          <h1 className="mt-1 text-[28px] font-extrabold leading-tight">{memberName}의 오늘</h1>
        </div>
        <div
          className="flex min-h-[44px] items-center gap-1.5 rounded-[16px] bg-(--face) px-3 text-(--deep) raised-3"
          style={toneStyle("gold")}
          aria-label={`내 스티커 ${stickers}개`}
        >
          <Star size={18} strokeWidth={2.2} aria-hidden />
          <span className="text-[16px] font-extrabold">{stickers}</span>
        </div>
      </div>

      <Link
        href="/quest"
        className="mt-4 block rounded-card bg-(--face) p-4 text-(--deep) raised-card"
        style={toneStyle("panel")}
      >
        <div className="flex items-center justify-between">
          <p className="text-[16px] font-bold">
            {stage.no}단계 · {stage.name}
          </p>
          <span className="flex items-center text-[13px] font-semibold text-muted">
            퀘스트 지도 <ChevronRight size={16} aria-hidden />
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <p className="text-[13px] text-muted">이번 주 실천율</p>
          <p className="text-[16px] font-extrabold">{stage.weeklyRate}%</p>
        </div>
        <ProgressBar
          className="mt-2"
          value={stage.weeklyRate}
          color="var(--color-graph-blue)"
          marker={PASS_RATE}
          label={`이번 주 실천율 ${stage.weeklyRate}%, 통과 기준 ${PASS_RATE}%`}
        />
        <p className="mt-1.5 text-[12px] text-muted">기준선 {PASS_RATE}% 를 넘으면 다음 단계가 열립니다</p>
      </Link>
    </header>
  );
}
