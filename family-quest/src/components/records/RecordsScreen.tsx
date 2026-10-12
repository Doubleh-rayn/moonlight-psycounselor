"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import clsx from "clsx";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ChipGroup } from "@/components/ui/Field";
import { QuestIcon } from "@/components/quest/QuestIcon";
import { useReadyFamily } from "@/lib/store/FamilyStore";
import { useActions } from "@/lib/store/actions";
import { usePinGate } from "@/components/app/PinGate";
import { useToast } from "@/components/app/Toast";
import {
  activeMemberIds,
  createdDate,
  familyGoals,
  familyTally,
  indexCheckins,
  isGoalLiveOn,
  isScheduledOn,
  isWeeklyGoal,
  memberTally,
  personalGoalsOf,
  rateOf,
  tallyGoal,
  type RateKind,
} from "@/lib/stats/schedule";
import { addDays, addMonths, eachDay, endOfMonth, endOfWeek, parseKey, startOfMonth, startOfWeek, WEEKDAY_LABELS, weekdayOf } from "@/lib/date";
import { measureUnit, scheduleLabel, typeLabel } from "@/lib/goals/kind";
import { GRAPH_COLOR } from "@/lib/design/tokens";
import type { GoalRow } from "@/lib/db/types";
import { WeightSection } from "./WeightSection";
import { PendingGoals } from "./PendingGoals";

const FAMILY = "family";

/** 기록 화면: 주간/월간, 구성원 선택(나·다른 구성원·가족 공동), 분류별 요약, 항목별 표 */
export function RecordsScreen() {
  const { snapshot, me, today, ensureCheckinsFrom, online } = useReadyFamily();
  const { setCheckin } = useActions();
  const requirePin = usePinGate();
  const toast = useToast();
  const params = useSearchParams();
  const router = useRouter();

  const members = snapshot.members.filter((m) => m.active);
  const selected = params.get("member") ?? me.id;
  const isFamily = selected === FAMILY;
  const member = members.find((m) => m.id === selected) ?? me;

  const [mode, setMode] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(today);

  const range = useMemo(() => {
    if (mode === "week") return { from: startOfWeek(anchor), to: endOfWeek(anchor) };
    return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
  }, [mode, anchor]);
  const to = range.to > today ? today : range.to;

  useEffect(() => {
    void ensureCheckinsFrom(range.from);
  }, [range.from, ensureCheckinsFrom]);

  const idx = indexCheckins(snapshot.checkins);
  const participants = isFamily ? activeMemberIds(snapshot.members) : [member.id];
  const goals = (isFamily ? familyGoals(snapshot.goals) : personalGoalsOf(snapshot.goals, member.id)).filter(
    (g) => g.status === "approved" && (g.active || snapshot.checkins.some((c) => c.goal_id === g.id && c.date >= range.from && c.date <= to)) && createdDate(g) <= to,
  );

  const summary = (kind: RateKind) =>
    isFamily
      ? rateOf(familyTally(snapshot.goals, snapshot.members, snapshot.checkins, range.from, to))
      : rateOf(memberTally(snapshot.goals, member.id, snapshot.checkins, range.from, to, kind));

  const move = (dir: -1 | 1) => setAnchor((a) => (mode === "week" ? addDays(a, 7 * dir) : addMonths(a, dir)));
  const title =
    mode === "week"
      ? `${parseKey(range.from).month}월 ${parseKey(range.from).day}일 ~ ${parseKey(range.to).month}월 ${parseKey(range.to).day}일`
      : `${parseKey(range.from).year}년 ${parseKey(range.from).month}월`;

  /** 과거 체크 수정: 당일·전날의 내 기록은 바로, 그 외는 관리자 PIN */
  const toggleDay = async (goal: GoalRow, memberId: string, date: string) => {
    if (date > today) return;
    const recent = date === today || date === addDays(today, -1);
    const mine = memberId === me.id;
    if (!(recent && mine)) {
      const ok = await requirePin(mine ? "이틀 이전 기록 수정은 관리자 PIN 이 필요합니다" : "다른 구성원의 기록 수정은 관리자 PIN 이 필요합니다");
      if (!ok) return;
    }
    const cur = idx.get(goal.id, memberId, date)?.done === true;
    await setCheckin(goal, memberId, date, !cur).catch(() => {});
    if (!(recent && mine)) toast("기록을 수정했습니다");
  };

  const color = isFamily ? "var(--color-graph-pink)" : GRAPH_COLOR[member.color];

  return (
    <div className="flex flex-col gap-4 px-4 pt-5">
      <h1 className="text-[28px] font-extrabold">기록</h1>

      <ChipGroup
        ariaLabel="구성원"
        options={[...members.map((m) => ({ value: m.id, label: m.id === me.id ? `나 (${m.display_name})` : m.display_name })), { value: FAMILY, label: "가족 공동" }]}
        value={selected}
        onChange={(v) => router.replace(`/records?member=${v}`)}
      />

      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex rounded-full border-2 border-line p-0.5" role="radiogroup" aria-label="기간">
            {(["week", "month"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
                className={clsx("min-h-[36px] rounded-full px-3 text-[13px] font-bold", mode === m ? "bg-blue text-blue-deep" : "text-muted")}>
                {m === "week" ? "주간" : "월간"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="이전" className="flex size-11 items-center justify-center text-muted" onClick={() => move(-1)}>
              <ChevronLeft size={22} strokeWidth={2.2} />
            </button>
            <span className="min-w-[120px] text-center text-[14px] font-bold">{title}</span>
            <button type="button" aria-label="다음" className="flex size-11 items-center justify-center text-muted disabled:opacity-30" onClick={() => move(1)} disabled={range.to >= today}>
              <ChevronRight size={22} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <div className={clsx("mt-4 grid gap-2", isFamily ? "grid-cols-1" : "grid-cols-3")}>
          {(isFamily ? (["all"] as RateKind[]) : (["all", "health", "habit"] as RateKind[])).map((k) => {
            const r = summary(k);
            return (
              <div key={k} className="rounded-[16px] bg-panel px-3 py-2.5 text-panel-deep">
                <p className="text-[12px] font-semibold text-muted">{k === "all" ? (isFamily ? "가족 공동 달성률" : "전체") : k === "health" ? "건강" : "생활습관"}</p>
                <p className="text-[20px] font-extrabold">{r === null ? "–" : `${r}%`}</p>
                <ProgressBar value={r ?? 0} color={color} height={6} className="mt-1" />
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-0">
        <h2 className="px-4 pt-4 text-[16px] font-bold">항목별 {mode === "week" ? "주간" : "월간"} 표</h2>
        {goals.length === 0 && <p className="px-4 py-6 text-center text-[14px] font-semibold text-muted">이 기간에 기록할 항목이 없습니다.</p>}
        <ul className="mt-2 divide-y divide-line">
          {goals.map((g) => {
            const t = tallyGoal(g, participants, idx, range.from, to);
            const unit = measureUnit(g.measure);
            const todayValue = !isFamily ? idx.get(g.id, member.id, today)?.value ?? 0 : 0;
            const showProgress = !isFamily && g.measure !== "done" && isGoalLiveOn(g, today) && (isWeeklyGoal(g) || isScheduledOn(g, today));
            return (
              <li key={g.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <QuestIcon goal={g} />
                  <div className="min-w-0 flex-1">
                    <p className={clsx("truncate text-[15px] font-bold", !g.active && "text-muted line-through")}>{g.title}</p>
                    <p className="text-[12px] text-muted">
                      {scheduleLabel(g)} · {typeLabel(g)}
                    </p>
                  </div>
                  <p className="shrink-0 text-[13px] font-bold">
                    {t.completed}/{t.scheduled}
                  </p>
                </div>
                {showProgress && (
                  <div className="mt-2 flex items-center gap-2 pl-[60px]">
                    <ProgressBar value={Math.round((todayValue / g.target_value) * 100)} color="var(--color-graph-peach)" height={6} label={`오늘 ${g.target_value}${unit} 중 ${todayValue}${unit}`} />
                    <span className="shrink-0 text-[12px] font-semibold text-muted">오늘 {todayValue}/{g.target_value}{unit}</span>
                  </div>
                )}
                {mode === "week" ? (
                  <WeekDots goal={g} participants={participants} from={range.from} today={today} idx={idx} disabled={!online} onToggle={(d) => void toggleDay(g, isFamily ? me.id : member.id, d)} />
                ) : (
                  <MonthDots goal={g} participants={participants} from={range.from} to={range.to} today={today} idx={idx} disabled={!online} onToggle={(d) => void toggleDay(g, isFamily ? me.id : member.id, d)} />
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {!isFamily && <PendingGoals member={member} />}
      {!isFamily && <WeightSection member={member} />}
    </div>
  );
}

type DotState = "done" | "missed" | "pending" | "none" | "future";

function dotState(goal: GoalRow, participants: string[], idx: ReturnType<typeof indexCheckins>, date: string, today: string): DotState {
  if (date > today) return "future";
  if (createdDate(goal) > date) return "none";
  const allDone = participants.every((m) => idx.get(goal.id, m, date)?.done);
  if (isWeeklyGoal(goal)) return allDone ? "done" : "none";
  if (!isScheduledOn(goal, date)) return "none";
  if (allDone) return "done";
  return date === today ? "pending" : "missed";
}

/** 요일별 완료 점. 예정일 미완료는 작은 회색 점, 예정 없는 날은 빈칸. 빨간색을 쓰지 않는다 */
function Dot({ state, label, onClick, disabled }: { state: DotState; label: string; onClick: () => void; disabled: boolean }) {
  const clickable = state !== "future" && !disabled;
  return (
    <button
      type="button"
      aria-label={label}
      disabled={!clickable}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-full disabled:cursor-default"
    >
      {state === "done" && (
        <span className="flex size-7 items-center justify-center rounded-full bg-check-on text-check-on-deep">
          <Check size={16} strokeWidth={2.6} aria-hidden />
        </span>
      )}
      {(state === "missed" || state === "pending") && <span className={clsx("size-2.5 rounded-full", state === "pending" ? "bg-blue-edge" : "bg-line")} aria-hidden />}
    </button>
  );
}

function WeekDots({ goal, participants, from, today, idx, onToggle, disabled }: { goal: GoalRow; participants: string[]; from: string; today: string; idx: ReturnType<typeof indexCheckins>; onToggle: (d: string) => void; disabled: boolean }) {
  const days = eachDay(from, addDays(from, 6));
  return (
    <div className="mt-2 grid grid-cols-7 gap-1 pl-[60px]">
      {days.map((d) => {
        const s = dotState(goal, participants, idx, d, today);
        return (
          <div key={d} className="flex flex-col items-center">
            <span className={clsx("text-[11px] font-semibold", d === today ? "text-blue-deep" : "text-muted")}>{WEEKDAY_LABELS[weekdayOf(d)]}</span>
            <Dot state={s} label={`${d} ${goal.title} ${s === "done" ? "완료" : "미완료"}`} onClick={() => onToggle(d)} disabled={disabled} />
          </div>
        );
      })}
    </div>
  );
}

function MonthDots({ goal, participants, from, to, today, idx, onToggle, disabled }: { goal: GoalRow; participants: string[]; from: string; to: string; today: string; idx: ReturnType<typeof indexCheckins>; onToggle: (d: string) => void; disabled: boolean }) {
  const days = eachDay(from, to);
  const lead = (weekdayOf(from) + 6) % 7; // 월요일 시작 그리드
  return (
    <div className="mt-2 grid grid-cols-7 gap-0.5 pl-[60px]">
      {Array.from({ length: lead }).map((_, i) => (
        <span key={`lead-${i}`} />
      ))}
      {days.map((d) => {
        const s = dotState(goal, participants, idx, d, today);
        return (
          <div key={d} className="flex flex-col items-center">
            <span className={clsx("text-[10px]", d === today ? "font-bold text-blue-deep" : "text-muted")}>{parseKey(d).day}</span>
            <Dot state={s} label={`${d} ${goal.title} ${s === "done" ? "완료" : "미완료"}`} onClick={() => onToggle(d)} disabled={disabled} />
          </div>
        );
      })}
    </div>
  );
}
