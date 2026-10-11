"use client";

import Link from "next/link";
import { useState } from "react";
import { Award, Lock, CircleCheck, Play } from "lucide-react";
import clsx from "clsx";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ChipGroup } from "@/components/ui/Field";
import { QuestIcon } from "@/components/quest/QuestIcon";
import { WeekGuide } from "@/components/plan/WeekGuide";
import { useReadyFamily } from "@/lib/store/FamilyStore";
import { activePlanOf, currentWeek, STAGE_LABEL, STAGE_ORDER, stageSpans, weekNoOn, weekRange, weeksOf } from "@/lib/plan/progress";
import { PASS_RATE, STAGE_BONUS_STICKERS } from "@/lib/plan/constants";
import { memberTally, rateOf } from "@/lib/stats/schedule";
import { scheduleLabel } from "@/lib/goals/kind";
import { toneStyle, type Tone } from "@/lib/design/tokens";
import { formatShortDate } from "@/lib/date";
import type { PlanStage } from "@/lib/db/types";

const STAGE_TONE: Record<PlanStage, Tone> = { adapt: "blue", expand: "mint", strengthen: "peach", maintain: "lavender" };
const STAGE_DESC: Record<PlanStage, string> = {
  adapt: "작은 변화에 익숙해지는 기간. 조정량은 2/3 수준",
  expand: "식단 7 : 운동 3 으로 운동 비중을 늘립니다",
  strengthen: "식단 6 : 운동 4. 가장 활동량이 많은 단계",
  maintain: "목표 도달 후 4주. 체중 ±1kg 유지가 목표",
};

/** 퀘스트 지도: 4단계 경로, 통과 조건, 이번 주 가이드, 배지 */
export function QuestMapScreen() {
  const { snapshot, me, today } = useReadyFamily();
  const [memberId, setMemberId] = useState(me.id);
  const members = snapshot.members.filter((m) => m.active);
  const member = members.find((m) => m.id === memberId) ?? me;

  const plan = activePlanOf(snapshot.plans, member.id) ?? snapshot.plans.filter((p) => p.member_id === member.id).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  const weeks = plan ? weeksOf(snapshot.planWeeks, plan.id) : [];
  const spans = stageSpans(weeks);
  const cur = plan ? weekNoOn(plan, today) : 0;
  const curWeek = plan ? currentWeek(plan, snapshot.planWeeks, today) : null;
  const judged = new Set(snapshot.bonuses.map((b) => b.reason_key));
  const stageGoals = (stage: PlanStage) => snapshot.goals.filter((g) => g.plan_id === plan?.id && g.plan_stage === stage);

  return (
    <div className="flex flex-col gap-4 px-4 pt-5">
      <h1 className="text-[28px] font-extrabold">퀘스트 지도</h1>
      <ChipGroup ariaLabel="구성원" options={members.map((m) => ({ value: m.id, label: m.id === me.id ? `나 (${m.display_name})` : m.display_name }))} value={memberId} onChange={setMemberId} />

      {!plan && (
        <Card>
          <p className="text-[16px] font-bold">{member.display_name}의 계획이 아직 없습니다</p>
          <p className="mt-1 text-[13px] text-muted">설정에서 계획을 만들면 적응 → 확장 → 강화 → 유지 4단계가 시작되고, 단계별 건강 퀘스트가 자동으로 생깁니다.</p>
          {me.role === "admin" && (
            <Link href="/settings/plan" className="mt-3 block">
              <Button tone="gold" block className="pointer-events-none">계획 만들기</Button>
            </Link>
          )}
        </Card>
      )}

      {plan && (
        <>
          <Card tone="panel">
            <div className="flex items-center justify-between">
              <p className="text-[16px] font-bold">
                {plan.kind === "maintain" ? "유지 계획" : `${plan.start_weight}kg → ${plan.target_weight}kg`}
              </p>
              <p className="text-[13px] font-semibold text-muted">{plan.status === "done" ? "완료" : `${cur}주차 / ${weeks.length}주`}</p>
            </div>
            <p className="mt-1 text-[12px] text-muted">
              {formatShortDate(plan.start_date)} 시작 · 통과 기준: 단계 기간의 건강 퀘스트 실천율 {PASS_RATE}% 이상 (생활습관 제외) · 미통과 시 같은 단계 1주 연장
            </p>
          </Card>

          {curWeek && <Card className="p-0"><div className="p-3"><WeekGuide week={curWeek} /></div></Card>}

          <ol className="flex flex-col gap-3" aria-label="단계">
            {STAGE_ORDER.map((stage, i) => {
              const span = spans.find((s) => s.stage === stage);
              const first = span?.weeks[0];
              const last = span?.weeks[span.weeks.length - 1];
              const passedKey = last ? `plan:${plan.id}:${stage}:${last.week_no}` : "";
              const passed = span ? judged.has(passedKey) : false;
              const isCurrent = !!span && !!curWeek && curWeek.stage === stage;
              const started = !!first && weekRange(plan, first.week_no).from <= today;
              const locked = !span || (!started && !passed);
              const range = span && first && last ? { from: weekRange(plan, first.week_no).from, to: weekRange(plan, last.week_no).to } : null;
              const rate = span && started && range ? rateOf(memberTally(snapshot.goals, member.id, snapshot.checkins, range.from, range.to > today ? today : range.to, "health")) : null;
              const extended = span?.weeks.filter((w) => w.extended).length ?? 0;
              return (
                <li key={stage} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex size-11 items-center justify-center rounded-full bg-(--face) text-(--deep) raised-3" style={toneStyle(locked ? "surface" : STAGE_TONE[stage])} aria-hidden>
                      {passed ? <CircleCheck size={22} strokeWidth={2.2} /> : locked ? <Lock size={20} strokeWidth={2.2} className="opacity-40" /> : isCurrent ? <Play size={20} strokeWidth={2.2} /> : <span className="text-[15px] font-extrabold">{i + 1}</span>}
                    </div>
                    {i < STAGE_ORDER.length - 1 && <div className={clsx("mt-1 w-[3px] flex-1 rounded-full", passed ? "bg-blue-edge" : "bg-line")} aria-hidden />}
                  </div>
                  <Card tone={isCurrent ? STAGE_TONE[stage] : "surface"} className={clsx("flex-1", locked && "opacity-60")}>
                    <div className="flex items-center justify-between">
                      <p className="text-[16px] font-bold">
                        {i + 1}단계 · {STAGE_LABEL[stage]}
                      </p>
                      <p className="text-[12px] font-semibold opacity-80">
                        {passed ? "통과" : isCurrent ? "진행 중" : locked ? "잠김" : started ? "판정 대기" : ""}
                        {span ? ` · ${span.weeks.length}주${extended ? ` (연장 ${extended})` : ""}` : ""}
                      </p>
                    </div>
                    <p className="mt-1 text-[12px] opacity-80">{STAGE_DESC[stage]}</p>
                    {range && started && (
                      <>
                        <div className="mt-2 flex items-center justify-between text-[12px]">
                          <span className="opacity-80">{formatShortDate(range.from)} ~ {formatShortDate(range.to)}</span>
                          <span className="font-bold">{rate === null ? "–" : `${rate}%`}</span>
                        </div>
                        <ProgressBar className="mt-1" value={rate ?? 0} color="var(--color-graph-blue)" marker={PASS_RATE} height={8} label={`${STAGE_LABEL[stage]} 실천율`} />
                      </>
                    )}
                    {(isCurrent || passed) && stageGoals(stage).length > 0 && (
                      <ul className="mt-3 flex flex-col gap-1.5">
                        {stageGoals(stage).map((g) => (
                          <li key={g.id} className={clsx("flex items-center gap-2 rounded-[14px] bg-white/60 px-2 py-1.5", !g.active && "opacity-60")}>
                            <QuestIcon goal={g} className="size-9 rounded-[11px]" />
                            <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{g.title}</span>
                            <span className="text-[11px] opacity-80">{scheduleLabel(g)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {passed && (
                      <p className="mt-2 flex items-center gap-1 text-[12px] font-bold">
                        <Award size={14} strokeWidth={2.2} aria-hidden /> {STAGE_LABEL[stage]} 배지 · 보너스 스티커 {STAGE_BONUS_STICKERS}
                      </p>
                    )}
                  </Card>
                </li>
              );
            })}
          </ol>

          {judged.size > 0 && (
            <Card>
              <h2 className="text-[16px] font-bold">배지</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {snapshot.bonuses.filter((b) => b.member_id === member.id).map((b) => (
                  <li key={b.id} className="flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-[13px] font-bold text-gold-deep">
                    <Award size={14} strokeWidth={2.2} aria-hidden /> {b.reason}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
