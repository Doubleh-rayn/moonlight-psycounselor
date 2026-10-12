import { ProgressBar } from "@/components/ui/ProgressBar";
import { MEDICAL_DISCLAIMER } from "@/lib/plan/constants";
import { STAGE_LABEL, stageNo } from "@/lib/plan/progress";
import type { PlanWeekRow } from "@/lib/db/types";

/** 이번 주 가이드 카드 내용: 식단:운동 비율 막대, 식단 감소 kcal, 운동 증가 kcal, 주간 운동 분, 면책 문구 */
export function WeekGuide({ week }: { week: PlanWeekRow }) {
  const diet = Math.round(week.diet_ratio * 10);
  return (
    <div className="rounded-[16px] bg-mint p-3 text-mint-deep">
      <p className="text-[13px] font-bold">
        이번 주 가이드 · {stageNo(week.stage)}단계 {STAGE_LABEL[week.stage]} ({week.week_no}주차{week.extended ? " · 연장" : ""})
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[11px] opacity-80">식단 감소</p>
          <p className="text-[15px] font-extrabold">{Math.round(week.diet_kcal)} kcal</p>
        </div>
        <div>
          <p className="text-[11px] opacity-80">운동 증가</p>
          <p className="text-[15px] font-extrabold">{Math.round(week.exercise_kcal)} kcal</p>
        </div>
        <div>
          <p className="text-[11px] opacity-80">주간 운동</p>
          <p className="text-[15px] font-extrabold">{Math.round(week.exercise_minutes_per_week)}분</p>
        </div>
      </div>
      <ProgressBar className="mt-2" value={week.diet_ratio * 100} color="var(--color-graph-mint)" height={8} label={`식단 ${diet} : 운동 ${10 - diet}`} />
      <p className="mt-1 text-[11px] opacity-80">
        식단 {diet} : 운동 {10 - diet} · {MEDICAL_DISCLAIMER}
      </p>
    </div>
  );
}
