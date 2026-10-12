"use client";

import { useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChipGroup, Field, TextInput } from "@/components/ui/Field";
import { useReadyFamily } from "@/lib/store/FamilyStore";
import { useToast } from "@/components/app/Toast";
import { HABIT_CATEGORIES, SUGGESTIONS } from "@/lib/goals/suggestions";
import type { GoalRow, Measure } from "@/lib/db/types";

const FAMILY = "family";
const DAYS = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ value: d, label: ["일", "월", "화", "수", "목", "금", "토"][d] }));

/** 폼이 내놓는 값 (DB 행에 그대로 들어가는 부분) */
export type HabitValues = Pick<
  GoalRow,
  "owner_member_id" | "type" | "category" | "title" | "measure" | "target_value" | "days_of_week" | "weekly_target" | "stickers"
>;

function catKeyOf(goal: Pick<GoalRow, "type" | "category">): string {
  if (goal.type === "habit") return goal.category ?? "etc";
  return goal.type;
}

/**
 * 습관 추가·수정 공용 폼. initial 이 있으면 그 값으로 시작한다.
 * 개수 한도는 두지 않는다 (요청: 무제한).
 */
export function HabitForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  footer,
}: {
  initial?: GoalRow;
  submitLabel: string;
  busy: boolean;
  onSubmit: (values: HabitValues) => Promise<void>;
  /** 저장 버튼 아래 추가 영역 (수정 화면의 그만하기·삭제) */
  footer?: ReactNode;
}) {
  const { snapshot, me } = useReadyFamily();
  const toast = useToast();
  const members = snapshot.members.filter((m) => m.active);

  const [catKey, setCatKey] = useState(initial ? catKeyOf(initial) : "diet");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [measure, setMeasure] = useState<Measure>(initial?.measure ?? "done");
  const [target, setTarget] = useState(initial ? String(initial.target_value) : "1");
  const [owner, setOwner] = useState<string>(initial ? (initial.owner_member_id ?? FAMILY) : me.id);
  const [repeat, setRepeat] = useState<"days" | "weekly">(initial && initial.days_of_week.length === 0 ? "weekly" : "days");
  const [days, setDays] = useState<number[]>(initial && initial.days_of_week.length > 0 ? initial.days_of_week : [0, 1, 2, 3, 4, 5, 6]);
  const [weekly, setWeekly] = useState(initial?.weekly_target ? String(initial.weekly_target) : "3");
  const [stickers, setStickers] = useState<number>(initial?.stickers ?? 1);

  const cat = HABIT_CATEGORIES.find((c) => c.key === catKey)!;
  const ownerId = owner === FAMILY ? null : owner;
  const isAdmin = me.role === "admin";
  // 구성원은 자기 것 또는 가족 공동 대상 선택 가능하되, 가족 공동은 관리자만 (권한 규칙과 동일)
  const ownerOptions = [
    ...members.map((m) => ({ value: m.id, label: m.id === me.id ? `본인 (${m.display_name})` : m.display_name })),
    ...(isAdmin ? [{ value: FAMILY, label: "가족 공동" }] : []),
  ];

  const pick = (s: { title: string; measure: Measure; target: number }) => {
    setTitle(s.title);
    setMeasure(s.measure);
    setTarget(String(s.target));
  };

  const submit = async () => {
    const t = title.trim();
    if (!t) return toast("습관 이름을 입력해 주세요", "error");
    const tv = measure === "done" ? 1 : Number(target);
    if (!(tv > 0)) return toast("목표 값을 확인해 주세요", "error");
    if (repeat === "days" && days.length === 0) return toast("요일을 하나 이상 골라 주세요", "error");
    const wt = Number(weekly);
    if (repeat === "weekly" && !(wt >= 1 && wt <= 7)) return toast("주 횟수는 1~7 입니다", "error");
    await onSubmit({
      owner_member_id: ownerId,
      type: cat.type,
      category: cat.category,
      title: t,
      measure,
      target_value: tv,
      days_of_week: repeat === "days" ? [...days].sort() : [],
      weekly_target: repeat === "weekly" ? wt : null,
      stickers: Math.min(5, Math.max(1, Math.round(stickers))),
    });
  };

  return (
    <>
      <Card className="flex flex-col gap-3">
        <div>
          <span className="mb-1.5 block text-[13px] font-bold text-muted">분류</span>
          <ChipGroup ariaLabel="분류" options={HABIT_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))} value={catKey} onChange={(v) => { setCatKey(v); if (!initial) setTitle(""); }} />
        </div>
        <div>
          <span className="mb-1.5 block text-[13px] font-bold text-muted">추천 항목</span>
          <ul className="flex flex-wrap gap-2">
            {SUGGESTIONS[catKey].map((s) => (
              <li key={s.title}>
                <button type="button" onClick={() => pick(s)} aria-pressed={title === s.title}
                  className={"min-h-[40px] rounded-[14px] border-2 px-3 text-[13px] font-bold " + (title === s.title ? "border-blue-edge bg-blue text-blue-deep" : "border-line bg-surface text-ink")}>
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <Field label="이름" hint="(직접 입력 가능)">
          <TextInput maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 저녁 먹고 산책" />
        </Field>
      </Card>

      <Card className="flex flex-col gap-3">
        <div>
          <span className="mb-1.5 block text-[13px] font-bold text-muted">대상</span>
          <ChipGroup ariaLabel="대상" options={ownerOptions} value={owner} onChange={setOwner} />
        </div>
        <div>
          <span className="mb-1.5 block text-[13px] font-bold text-muted">반복</span>
          <ChipGroup ariaLabel="반복 방식" options={[{ value: "days", label: "요일 선택" }, { value: "weekly", label: "주 N회" }]} value={repeat} onChange={setRepeat} />
          {repeat === "days" ? (
            <div className="mt-2">
              <ChipGroup ariaLabel="요일" multiple options={DAYS} value={days} onChange={(d) => setDays((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d]))} />
              <div className="mt-2 flex gap-2">
                <button type="button" className="min-h-[32px] text-[12px] font-bold text-blue-deep" onClick={() => setDays([0, 1, 2, 3, 4, 5, 6])}>매일</button>
                <button type="button" className="min-h-[32px] text-[12px] font-bold text-blue-deep" onClick={() => setDays([1, 2, 3, 4, 5])}>평일</button>
                <button type="button" className="min-h-[32px] text-[12px] font-bold text-blue-deep" onClick={() => setDays([6, 0])}>주말</button>
              </div>
            </div>
          ) : (
            <div className="mt-2 max-w-[160px]">
              <Field label="주 횟수"><TextInput type="number" inputMode="numeric" min={1} max={7} value={weekly} onChange={(e) => setWeekly(e.target.value)} /></Field>
            </div>
          )}
        </div>
        <div>
          <span className="mb-1.5 block text-[13px] font-bold text-muted">측정 방식</span>
          <ChipGroup ariaLabel="측정 방식" options={[{ value: "done", label: "완료 여부" }, { value: "count", label: "횟수" }, { value: "minutes", label: "분" }]} value={measure} onChange={setMeasure} />
          {measure !== "done" && (
            <div className="mt-2 max-w-[160px]">
              <Field label={measure === "count" ? "목표 횟수" : "목표 분"}><TextInput type="number" inputMode="numeric" min={1} value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
            </div>
          )}
        </div>
        <div>
          <span className="mb-1.5 block text-[13px] font-bold text-muted">성공 시 스티커</span>
          <ChipGroup ariaLabel="스티커" options={[{ value: 1, label: "1개" }, { value: 2, label: "2개" }]} value={stickers} onChange={(v) => setStickers(v)} />
        </div>
      </Card>

      {!isAdmin && <p className="text-[12px] text-muted">구성원이 추가하거나 고친 습관은 관리자 승인 후 시작됩니다.</p>}
      <Button tone="gold" size="lg" block disabled={busy} onClick={() => void submit()}>
        {submitLabel}
      </Button>
      {footer}
    </>
  );
}
