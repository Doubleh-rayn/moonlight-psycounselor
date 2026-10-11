"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChipGroup, Field, TextInput } from "@/components/ui/Field";
import { useReadyFamily } from "@/lib/store/FamilyStore";
import { useActions } from "@/lib/store/actions";
import { useToast } from "@/components/app/Toast";
import { HABIT_CATEGORIES, SUGGESTIONS } from "@/lib/goals/suggestions";
import { checkLimit, ACTIVE_LIMIT, activeCounts } from "@/lib/goals/limits";
import type { GoalRow, Measure } from "@/lib/db/types";

const FAMILY = "family";
const DAYS = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ value: d, label: ["일", "월", "화", "수", "목", "금", "토"][d] }));

/** 습관 추가: 분류 → 추천 또는 직접 입력 → 대상, 반복, 측정, 스티커. 관리자는 즉시 승인, 구성원은 제안 */
export function NewHabitScreen() {
  const { snapshot, me } = useReadyFamily();
  const { run } = useActions();
  const toast = useToast();
  const router = useRouter();
  const members = snapshot.members.filter((m) => m.active);

  const [catKey, setCatKey] = useState("diet");
  const [title, setTitle] = useState("");
  const [measure, setMeasure] = useState<Measure>("done");
  const [target, setTarget] = useState("1");
  const [owner, setOwner] = useState<string>(me.id);
  const [repeat, setRepeat] = useState<"days" | "weekly">("days");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [weekly, setWeekly] = useState("3");
  const [stickers, setStickers] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);

  const cat = HABIT_CATEGORIES.find((c) => c.key === catKey)!;
  const ownerId = owner === FAMILY ? null : owner;
  const limitMsg = checkLimit(snapshot.goals, ownerId, cat.type);
  const counts = ownerId ? activeCounts(snapshot.goals, ownerId) : null;
  const isAdmin = me.role === "admin";

  const pick = (s: { title: string; measure: Measure; target: number }) => {
    setTitle(s.title);
    setMeasure(s.measure);
    setTarget(String(s.target));
  };

  const save = async () => {
    const t = title.trim();
    if (!t) return toast("습관 이름을 입력해 주세요", "error");
    if (limitMsg) return toast(limitMsg, "error");
    const tv = measure === "done" ? 1 : Number(target);
    if (!(tv > 0)) return toast("목표 값을 확인해 주세요", "error");
    if (repeat === "days" && days.length === 0) return toast("요일을 하나 이상 골라 주세요", "error");
    const wt = Number(weekly);
    if (repeat === "weekly" && !(wt >= 1 && wt <= 7)) return toast("주 횟수는 1~7 입니다", "error");
    const status: GoalRow["status"] = isAdmin ? "approved" : "proposed";
    setBusy(true);
    try {
      await run(
        "습관 추가",
        (s) => s,
        (repo) =>
          repo.insert("goals", {
            owner_member_id: ownerId, type: cat.type, category: cat.category, title: t, measure, target_value: tv,
            days_of_week: repeat === "days" ? [...days].sort() : [], weekly_target: repeat === "weekly" ? wt : null,
            stickers, status, created_by_member_id: me.id,
          }),
      );
      toast(isAdmin ? "습관을 추가했습니다" : "제안했습니다. 관리자가 승인하면 시작됩니다.");
      router.push("/");
    } catch {
      /* 토스트는 run 이 표시 */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-5">
      <h1 className="text-[28px] font-extrabold">습관 추가</h1>

      <Card className="flex flex-col gap-3">
        <div>
          <span className="mb-1.5 block text-[13px] font-bold text-muted">분류</span>
          <ChipGroup ariaLabel="분류" options={HABIT_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))} value={catKey} onChange={(v) => { setCatKey(v); setTitle(""); }} />
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
          <ChipGroup ariaLabel="대상" options={[...members.map((m) => ({ value: m.id, label: m.id === me.id ? `본인 (${m.display_name})` : m.display_name })), { value: FAMILY, label: "가족 공동" }]} value={owner} onChange={setOwner} />
          {counts && (
            <p className="mt-1.5 text-[12px] text-muted">
              진행 중: 건강 {counts.health}/{ACTIVE_LIMIT.health} · 생활습관 {counts.habit}/{ACTIVE_LIMIT.habit}
            </p>
          )}
          {limitMsg && <p className="mt-1 text-[13px] font-semibold text-peach-deep" role="alert">{limitMsg}</p>}
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
          <ChipGroup ariaLabel="스티커" options={[{ value: 1, label: "1개" }, { value: 2, label: "2개" }]} value={stickers} onChange={(v) => setStickers(v as 1 | 2)} />
        </div>
      </Card>

      {!isAdmin && <p className="text-[12px] text-muted">구성원이 추가한 습관은 관리자 승인 후 시작됩니다.</p>}
      <Button tone="gold" size="lg" block disabled={busy || !!limitMsg} onClick={() => void save()}>
        {isAdmin ? "추가" : "제안하기"}
      </Button>
    </div>
  );
}
