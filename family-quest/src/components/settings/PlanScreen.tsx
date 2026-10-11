"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChipGroup, Field, Select, TextInput } from "@/components/ui/Field";
import { useReadyFamily } from "@/lib/store/FamilyStore";
import { usePinGate } from "@/components/app/PinGate";
import { useToast } from "@/components/app/Toast";
import { ageFromYearMonth, buildAdultPlan, buildMinorPlan, isAdultAge, type PlanCalc, type PlanOutcome } from "@/lib/plan/calc";
import { assessChildBmi, ageInMonthsFromYearMonth, BMI_LABELS } from "@/lib/bmi";
import { draftStageGoals } from "@/lib/plan/quests";
import { STAGE_LABEL } from "@/lib/plan/progress";
import { ADULT_MIN_WEEKS, MEDICAL_DISCLAIMER } from "@/lib/plan/constants";
import { parseKey } from "@/lib/date";
import type { ActivityLevel, Sex } from "@/lib/db/types";

const ACTIVITY: { value: ActivityLevel; label: string }[] = [
  { value: "light", label: "적음 (1.2)" }, { value: "moderate", label: "보통 (1.375)" }, { value: "active", label: "많음 (1.55)" },
];

/** 계획 만들기: 대상 선택 → 입력 → 8절 계산 미리보기 → 시작 또는 직접 수정 */
export function PlanScreen() {
  const { snapshot, me, today, repo, reload } = useReadyFamily();
  const requirePin = usePinGate();
  const toast = useToast();
  const router = useRouter();
  const members = snapshot.members.filter((m) => m.active);
  const [memberId, setMemberId] = useState(me.id);
  const member = members.find((m) => m.id === memberId) ?? me;

  const initialForm = (m: typeof member) => {
    const lastWeight = snapshot.weightLogs.filter((w) => w.member_id === m.id).sort((a, b) => b.date.localeCompare(a.date))[0]?.weight;
    return { current: lastWeight ? String(lastWeight) : "", target: "", height: m.height_cm ? String(m.height_cm) : "", birth: m.birth_year_month ?? "", sex: (m.sex ?? "") as Sex | "", activity: "light" as ActivityLevel };
  };
  const [form, setForm] = useState(() => initialForm(member));
  const [edit, setEdit] = useState({ on: false, weeks: "", ratio: "" });
  const [busy, setBusy] = useState(false);

  const pickMember = (id: string) => {
    setMemberId(id);
    const m = members.find((x) => x.id === id);
    if (m) setForm(initialForm(m));
    setEdit({ on: false, weeks: "", ratio: "" });
  };

  const current = Number(form.current);
  const target = Number(form.target);
  const height = Number(form.height);
  const age = form.birth ? ageFromYearMonth(form.birth, today) : null;
  const adult = age ? isAdultAge(age.years) : !member.is_minor;

  const bmi = (() => {
    if (adult || !form.birth || !form.sex || !(current > 0) || !(height > 0)) return null;
    const { year, month, day } = parseKey(today);
    const months = ageInMonthsFromYearMonth({ year: Number(form.birth.slice(0, 4)), month: Number(form.birth.slice(5, 7)) }, { year, month, day });
    if (months === null) return null;
    return assessChildBmi({ sex: form.sex, ageMonths: months, weightKg: current, heightCm: height });
  })();

  const outcome: PlanOutcome | null = (() => {
    if (!(current > 0 && target > 0 && height > 0) || !form.sex || !age) return null;
    const weeksOverride = edit.on && edit.weeks ? Number(edit.weeks) : undefined;
    if (adult) {
      const dietRatioOverride = edit.on && edit.ratio ? Number(edit.ratio) / 10 : undefined;
      return buildAdultPlan({ currentWeight: current, targetWeight: target, heightCm: height, ageYears: age.years, sex: form.sex, activity: form.activity, weeksOverride, dietRatioOverride });
    }
    const percentile = bmi && bmi.status === "ok" ? bmi.percentile : null;
    return buildMinorPlan({ currentWeight: current, targetWeight: target, heightCm: height, sex: form.sex, ageMonths: age.months, bmiPercentile: percentile, weeksOverride });
  })();

  const start = async (plan: PlanCalc) => {
    if (!repo) return;
    const ok = await requirePin("계획 시작에는 관리자 PIN 이 필요합니다");
    if (!ok) return;
    setBusy(true);
    try {
      // 구성원 정보 갱신 (키·생년월·성별)
      const patch: Record<string, unknown> = {};
      if (height !== member.height_cm) patch.height_cm = height;
      if (form.birth !== (member.birth_year_month ?? "")) patch.birth_year_month = form.birth;
      if (form.sex !== (member.sex ?? "")) patch.sex = form.sex;
      if (Object.keys(patch).length) await repo.update("members", member.id, patch);
      // 이전 계획 종료 + 그 퀘스트 비활성화
      for (const p of snapshot.plans.filter((p) => p.member_id === member.id && p.status === "active")) {
        await repo.update("plans", p.id, { status: "done" });
        for (const g of snapshot.goals.filter((g) => g.plan_id === p.id && g.active)) await repo.update("goals", g.id, { active: false });
      }
      const row = await repo.insert("plans", {
        member_id: member.id, start_weight: current, target_weight: target, weeks: plan.weeks, activity_level: form.activity, kind: plan.kind, start_date: today,
      });
      await repo.insertMany("plan_weeks", plan.stageWeeks.map((w) => ({ plan_id: row.id, ...w, daily_deficit: r1(w.daily_deficit), diet_kcal: r1(w.diet_kcal), exercise_kcal: r1(w.exercise_kcal), exercise_minutes_per_week: r1(w.exercise_minutes_per_week) })));
      const first = plan.stageWeeks[0];
      const existingTitles = snapshot.goals.filter((g) => g.owner_member_id === member.id && g.active && g.plan_id === null).map((g) => g.title);
      await repo.insertMany("goals", draftStageGoals({ planId: row.id, memberId: member.id, stage: first.stage, week: first, minor: !adult, existingTitles }));
      await repo.upsertWeightLog({ member_id: member.id, date: today, weight: current });
      await reload();
      toast(`${member.display_name}의 계획을 시작했습니다`);
      router.push("/quest");
    } catch (e) {
      toast(e instanceof Error ? e.message : "계획을 저장하지 못했습니다", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-5">
      <h1 className="text-[28px] font-extrabold">계획 만들기</h1>
      <ChipGroup ariaLabel="대상 구성원" options={members.map((m) => ({ value: m.id, label: m.display_name }))} value={memberId} onChange={pickMember} />

      <Card className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="현재 체중 (kg)"><TextInput type="number" step="0.1" inputMode="decimal" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} /></Field>
          <Field label="목표 체중 (kg)"><TextInput type="number" step="0.1" inputMode="decimal" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="키 (cm)"><TextInput type="number" step="0.1" inputMode="decimal" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} /></Field>
          <Field label="생년월"><TextInput type="month" value={form.birth} onChange={(e) => setForm({ ...form, birth: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="성별"><Select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value as Sex | "" })}><option value="">선택</option><option value="female">여</option><option value="male">남</option></Select></Field>
          {adult && <Field label="활동량"><Select value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value as ActivityLevel })}>{ACTIVITY.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</Select></Field>}
        </div>
        {age && <p className="text-[12px] text-muted">만 {age.years}세 · {adult ? "성인 기준(8.1)" : "미성년 기준(8.2): 끼니를 줄이지 않고 음료·간식 대체 퀘스트만, 월 약 0.5kg"}</p>}
      </Card>

      {bmi && (
        <Card tone="mint">
          <p className="text-[13px] font-bold">소아청소년 BMI 백분위수</p>
          {bmi.status === "ok" ? (
            <p className="mt-1 text-[14px]">
              BMI {bmi.bmi} · {bmi.percentileLabel}백분위 · {BMI_LABELS.category[bmi.verdict.category]}
              {bmi.verdict.caution ? ` · ${BMI_LABELS.caution}` : ""}
              {bmi.whoRange ? ` · ${BMI_LABELS.whoRangeNote}` : ""}
            </p>
          ) : (
            <p className="mt-1 text-[14px]">{BMI_LABELS.status[bmi.status]}</p>
          )}
          <p className="mt-1 text-[11px] opacity-80">{BMI_LABELS.disclaimer} {BMI_LABELS.growthNote} 출처: {BMI_LABELS.source}</p>
        </Card>
      )}

      {outcome && !outcome.ok && (
        <Card tone="peach">
          <p className="text-[14px] font-bold">계획을 만들 수 없습니다</p>
          <p className="mt-1 text-[13px]">{outcome.problem.message}</p>
        </Card>
      )}

      {outcome && outcome.ok && (
        <>
          <Card tone="panel">
            <p className="text-[16px] font-bold">
              {outcome.plan.kind === "maintain" ? "유지 계획" : `${outcome.plan.lossKg}kg 감량 · ${outcome.plan.weeks}주 + 유지 4주`}
            </p>
            {outcome.plan.kind === "loss" && (
              <p className="mt-1 text-[12px] text-muted">
                적응 {outcome.plan.split.adapt}주 / 확장 {outcome.plan.split.expand}주 / 강화 {outcome.plan.split.strengthen}주 · 기본 조정량 {Math.round(outcome.plan.baseDeficit)} kcal/일
                {outcome.plan.maintenanceKcal ? ` · 유지열량 약 ${Math.round(outcome.plan.maintenanceKcal)} kcal` : ""}
              </p>
            )}
            {outcome.plan.notes.map((n) => (
              <p key={n} className="mt-1 text-[12px] font-semibold text-peach-deep">{n}</p>
            ))}
            <p className="mt-2 text-[11px] text-muted">{MEDICAL_DISCLAIMER}</p>
          </Card>

          <Card className="overflow-x-auto p-0">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-muted">
                  <th className="px-3 py-2 font-semibold">주</th><th className="px-2 py-2 font-semibold">단계</th><th className="px-2 py-2 font-semibold">조정</th><th className="px-2 py-2 font-semibold">식단</th><th className="px-2 py-2 font-semibold">운동</th><th className="px-2 py-2 font-semibold">운동 분/주</th>
                </tr>
              </thead>
              <tbody>
                {outcome.plan.stageWeeks.map((w) => (
                  <tr key={w.week_no} className="border-t border-line">
                    <td className="px-3 py-1.5 font-bold">{w.week_no}</td>
                    <td className="px-2 py-1.5">{STAGE_LABEL[w.stage]}</td>
                    <td className="px-2 py-1.5">{Math.round(w.daily_deficit)}</td>
                    <td className="px-2 py-1.5">{Math.round(w.diet_kcal)}</td>
                    <td className="px-2 py-1.5">{Math.round(w.exercise_kcal)}</td>
                    <td className="px-2 py-1.5">{Math.round(w.exercise_minutes_per_week)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {edit.on && (
            <Card className="flex flex-col gap-3">
              <p className="text-[14px] font-bold">직접 수정 (한도를 넘는 값은 자동으로 조정됩니다)</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="기간 (주)" hint={adult ? `(최소 ${ADULT_MIN_WEEKS})` : ""}><TextInput type="number" min={1} value={edit.weeks} onChange={(e) => setEdit({ ...edit, weeks: e.target.value })} /></Field>
                {adult && <Field label="식단 비율 (5~9)" hint="(식단:운동)"><TextInput type="number" min={5} max={9} value={edit.ratio} onChange={(e) => setEdit({ ...edit, ratio: e.target.value })} /></Field>}
              </div>
            </Card>
          )}

          <div className="flex gap-2">
            <Button tone="panel" block onClick={() => setEdit({ ...edit, on: !edit.on })}>{edit.on ? "수정 닫기" : "직접 수정"}</Button>
            <Button tone="gold" block disabled={busy} onClick={() => void start(outcome.plan)}>이 계획으로 시작</Button>
          </div>
        </>
      )}
    </div>
  );
}

function r1(x: number): number {
  return Math.round(x * 10) / 10;
}
