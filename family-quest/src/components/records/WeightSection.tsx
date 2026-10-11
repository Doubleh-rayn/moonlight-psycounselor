"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Field, TextInput } from "@/components/ui/Field";
import { useReadyFamily } from "@/lib/store/FamilyStore";
import { useActions } from "@/lib/store/actions";
import { usePinGate } from "@/components/app/PinGate";
import { useToast } from "@/components/app/Toast";
import { activePlanOf, currentWeek } from "@/lib/plan/progress";
import { WeekGuide } from "@/components/plan/WeekGuide";
import { applyProgressAdjustment } from "@/lib/plan/adjust";
import { formatShortDate } from "@/lib/date";
import type { MemberRow, WeightLogRow } from "@/lib/db/types";

/** 체중 기록(주 1회 권장)과 이번 주 열량 가이드. 가족 전원 조회 가능, 타인 기록 입력은 PIN */
export function WeightSection({ member }: { member: MemberRow }) {
  const { snapshot, me, today, online } = useReadyFamily();
  const { run } = useActions();
  const requirePin = usePinGate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState("");

  const logs = snapshot.weightLogs.filter((w) => w.member_id === member.id).sort((a, b) => b.date.localeCompare(a.date));
  const plan = activePlanOf(snapshot.plans, member.id);
  const week = plan ? currentWeek(plan, snapshot.planWeeks, today) : null;
  const lastWeekAgo = logs[0] ? Math.floor((Date.parse(today) - Date.parse(logs[0].date)) / 86_400_000) : null;

  const save = async () => {
    const w = Number(weight);
    if (!(w > 0 && w < 300)) return toast("체중을 확인해 주세요", "error");
    if (member.id !== me.id) {
      const ok = await requirePin("다른 구성원의 체중 기록은 관리자 PIN 이 필요합니다");
      if (!ok) return;
    }
    const now = new Date().toISOString();
    await run<WeightLogRow>(
      "체중 기록",
      (s) => {
        const others = s.weightLogs.filter((x) => !(x.member_id === member.id && x.date === today));
        return { ...s, weightLogs: [...others, { id: `tmp-${Date.now()}`, family_id: s.family.id, member_id: member.id, date: today, weight: w, created_at: now }] };
      },
      async (repo) => {
        const row = await repo.upsertWeightLog({ member_id: member.id, date: today, weight: w });
        // 2주 연속 계획보다 빠르거나 느리면 조정 (8.3)
        if (plan) {
          const result = await applyProgressAdjustment(repo, plan, snapshot.planWeeks, [...snapshot.weightLogs.filter((x) => x.member_id === member.id && x.date !== today), row], today);
          if (result) toast(result);
        }
        return row;
      },
    ).catch(() => {});
    setOpen(false);
    setWeight("");
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold">체중과 열량 가이드</h2>
        <Button tone="panel" disabled={!online} onClick={() => setOpen(true)}>
          체중 기록
        </Button>
      </div>
      <p className="mt-1 text-[12px] text-muted">
        주 1회 기록을 권장합니다.
        {lastWeekAgo !== null && lastWeekAgo >= 7 && ` 마지막 기록 ${lastWeekAgo}일 전.`}
      </p>

      {logs.length > 0 ? (
        <ul className="mt-3 flex gap-3 overflow-x-auto" aria-label="체중 기록">
          {logs.slice(0, 8).map((l) => (
            <li key={l.id} className="shrink-0 rounded-[14px] bg-panel px-3 py-2 text-center">
              <p className="text-[16px] font-extrabold">{l.weight}kg</p>
              <p className="text-[11px] text-muted">{formatShortDate(l.date)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[13px] font-semibold text-muted">아직 기록이 없습니다.</p>
      )}

      {plan && week && (
        <div className="mt-4">
          <WeekGuide week={week} />
        </div>
      )}

      <Sheet open={open} title={`${member.display_name} 체중 기록`} onClose={() => setOpen(false)}>
        <Field label="오늘 체중 (kg)">
          <TextInput type="number" inputMode="decimal" step="0.1" min={1} max={300} autoFocus value={weight} onChange={(e) => setWeight(e.target.value)} />
        </Field>
        <Button tone="gold" block className="mt-3" onClick={() => void save()}>
          저장
        </Button>
      </Sheet>
    </Card>
  );
}
