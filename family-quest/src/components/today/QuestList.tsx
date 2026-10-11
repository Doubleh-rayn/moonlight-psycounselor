"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import clsx from "clsx";
import { Card } from "@/components/ui/Card";
import { CheckButton } from "@/components/ui/CheckButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Field, TextInput } from "@/components/ui/Field";
import { QuestIcon } from "@/components/quest/QuestIcon";
import { useReadyFamily } from "@/lib/store/FamilyStore";
import { useActions } from "@/lib/store/actions";
import { todayCount, todayItems, type TodayItem } from "@/lib/stats/schedule";
import { measureUnit, scheduleLabel, typeLabel } from "@/lib/goals/kind";
import { addDays } from "@/lib/date";

/**
 * 내 퀘스트 목록. 한 번 탭으로 체크·해제. 횟수·분 항목은 제목을 눌러 값을 입력한다.
 * 체크 수정은 당일과 전날까지 (그 이전은 기록 화면에서 PIN).
 */
export function QuestList() {
  const { snapshot, me, today, online } = useReadyFamily();
  const { setCheckin } = useActions();
  const [day, setDay] = useState<"today" | "yesterday">("today");
  const [editing, setEditing] = useState<TodayItem | null>(null);
  const date = day === "today" ? today : addDays(today, -1);

  const items = todayItems(snapshot.goals, me.id, snapshot.checkins, date);
  const proposed = snapshot.goals.filter((g) => g.owner_member_id === me.id && g.active && g.status === "proposed");
  const count = todayCount(items);

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-[16px] font-bold">내 퀘스트</h2>
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-muted">
            {count.done} / {count.total} 완료
          </p>
          <div className="flex rounded-full border-2 border-line p-0.5" role="radiogroup" aria-label="날짜">
            {(["today", "yesterday"] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={day === d}
                onClick={() => setDay(d)}
                className={clsx("min-h-[32px] rounded-full px-2.5 text-[12px] font-bold", day === d ? "bg-blue text-blue-deep" : "text-muted")}
              >
                {d === "today" ? "오늘" : "어제"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {items.length === 0 && proposed.length === 0 && (
        <p className="px-4 py-6 text-center text-[14px] font-semibold text-muted">
          {day === "today" ? "오늘 예정된 퀘스트가 없습니다. 아래에서 습관을 추가해 보세요." : "어제 예정된 퀘스트가 없습니다."}
        </p>
      )}

      <ul className="mt-2 divide-y divide-line">
        {items.map((it) => {
          const g = it.goal;
          const unit = measureUnit(g.measure);
          const showProgress = g.measure !== "done";
          const value = it.checkin?.value ?? 0;
          const pct = showProgress ? Math.round((value / g.target_value) * 100) : 0;
          const weekly = it.weekTarget !== undefined ? ` · 이번 주 ${it.weekDone}/${it.weekTarget}` : "";
          return (
            <li key={g.id} className="flex items-center gap-3 px-4 py-3">
              <QuestIcon goal={g} />
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => showProgress && setEditing(it)}
                aria-label={showProgress ? `${g.title} 값 입력` : g.title}
              >
                <p className="truncate text-[16px] font-bold">{g.title}</p>
                <p className="mt-0.5 text-[13px] text-muted">
                  {scheduleLabel(g)} · {typeLabel(g)}{weekly} · 스티커 {g.stickers}
                </p>
                {showProgress && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <ProgressBar value={pct} color="var(--color-graph-peach)" height={6} label={`${g.target_value}${unit} 중 ${value}${unit}`} />
                    <span className="shrink-0 text-[12px] font-semibold text-muted">
                      {value}/{g.target_value}
                      {unit}
                    </span>
                  </div>
                )}
              </button>
              <CheckButton
                checked={it.done}
                disabled={!online}
                onChange={(next) => void setCheckin(g, me.id, date, next).catch(() => {})}
                label={g.title}
              />
            </li>
          );
        })}
        {proposed.map((g) => (
          <li key={g.id} className="flex items-center gap-3 px-4 py-3 opacity-70">
            <QuestIcon goal={g} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-bold">{g.title}</p>
              <p className="mt-0.5 text-[13px] text-muted">관리자 승인 대기 중</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="px-4 pb-4 pt-2">
        <Link href="/habits/new" className="block">
          <Button tone="gold" block className="pointer-events-none">
            <Plus size={18} strokeWidth={2.4} aria-hidden /> 습관 추가
          </Button>
        </Link>
      </div>

      <ValueSheet item={editing} date={date} onClose={() => setEditing(null)} />
    </Card>
  );
}

/** 횟수·분 입력 시트. 목표값 이상이면 완료로 저장 */
function ValueSheet({ item, date, onClose }: { item: TodayItem | null; date: string; onClose: () => void }) {
  const { me } = useReadyFamily();
  const { setCheckin } = useActions();
  const [value, setValue] = useState<string>("");
  const g = item?.goal;
  const unit = g ? measureUnit(g.measure) : "";

  const save = async () => {
    if (!g) return;
    const v = Math.max(0, Number(value || 0));
    await setCheckin(g, me.id, date, v >= g.target_value, v).catch(() => {});
    onClose();
    setValue("");
  };

  return (
    <Sheet open={!!item} title={g?.title ?? ""} onClose={onClose}>
      {g && (
        <div className="flex flex-col gap-3">
          <Field label={`오늘 한 양 (${unit})`} hint={`목표 ${g.target_value}${unit}`}>
            <TextInput
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              autoFocus
              value={value}
              placeholder={String(item?.checkin?.value ?? 0)}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <Button tone="panel" block onClick={() => setValue(String(g.target_value))}>
              목표만큼 ({g.target_value}
              {unit})
            </Button>
            <Button tone="gold" block onClick={() => void save()}>
              저장
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
