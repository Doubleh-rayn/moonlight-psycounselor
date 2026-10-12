"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChipGroup } from "@/components/ui/Field";
import { QuestIcon } from "@/components/quest/QuestIcon";
import { useReadyFamily } from "@/lib/store/FamilyStore";
import { useActions } from "@/lib/store/actions";
import { usePinGate } from "@/components/app/PinGate";
import { useToast } from "@/components/app/Toast";
import { scheduleLabel, typeLabel } from "@/lib/goals/kind";
import type { GoalRow } from "@/lib/db/types";

const FAMILY = "family";

/**
 * 구성원 퀘스트 관리 (관리자 전용).
 * 구성원을 고르면 그 사람의 퀘스트 전부(승인 대기·진행 중·멈춤)를 보여 주고, 눌러서 고치거나 바로 추가한다.
 */
export function ManageQuestsScreen() {
  const { snapshot, me } = useReadyFamily();
  const { run } = useActions();
  const requirePin = usePinGate();
  const toast = useToast();
  const members = snapshot.members.filter((m) => m.active);
  const [selected, setSelected] = useState<string>(me.id);

  if (me.role !== "admin") {
    return (
      <div className="flex flex-col gap-4 px-4 pt-5">
        <h1 className="text-[28px] font-extrabold">퀘스트 관리</h1>
        <Card><p className="text-[14px] font-semibold text-muted">관리자만 다른 구성원의 퀘스트를 관리할 수 있습니다.</p></Card>
      </div>
    );
  }

  const ownerId = selected === FAMILY ? null : selected;
  const mine = snapshot.goals.filter((g) => g.owner_member_id === ownerId);
  const pending = mine.filter((g) => g.active && g.status === "proposed");
  const active = mine.filter((g) => g.active && g.status === "approved");
  const stopped = mine.filter((g) => !g.active);
  const name = ownerId ? (members.find((m) => m.id === ownerId)?.display_name ?? "") : "가족 공동";

  const decide = async (g: GoalRow, approve: boolean) => {
    const ok = await requirePin(approve ? "습관 승인에는 관리자 PIN 이 필요합니다" : "제안 거절에는 관리자 PIN 이 필요합니다");
    if (!ok) return;
    const patch: Partial<GoalRow> = approve ? { status: "approved", created_at: new Date().toISOString() } : { active: false };
    await run(
      approve ? "승인" : "거절",
      (s) => ({ ...s, goals: s.goals.map((x) => (x.id === g.id ? { ...x, ...patch } : x)) }),
      (repo) => repo.update("quests", g.id, patch),
    ).catch(() => {});
    toast(approve ? "승인했습니다. 오늘부터 시작합니다." : "제안을 거절했습니다");
  };

  const Row = ({ g, dim }: { g: GoalRow; dim?: boolean }) => (
    <li className={clsx(dim && "opacity-60")}>
      <Link href={`/habits/${g.id}`} className="flex items-center gap-3 px-4 py-3" aria-label={`${g.title} 수정`}>
        <QuestIcon goal={g} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold">{g.title}</p>
          <p className="text-[12px] text-muted">
            {scheduleLabel(g)} · {typeLabel(g)} · 스티커 {g.stickers}
            {g.source === "plan" ? " · 계획" : ""}
          </p>
        </div>
        <ChevronRight size={18} strokeWidth={2.2} aria-hidden className="text-muted" />
      </Link>
    </li>
  );

  return (
    <div className="flex flex-col gap-4 px-4 pt-5">
      <h1 className="text-[28px] font-extrabold">퀘스트 관리</h1>
      <ChipGroup
        ariaLabel="구성원"
        options={[...members.map((m) => ({ value: m.id, label: m.id === me.id ? `나 (${m.display_name})` : m.display_name })), { value: FAMILY, label: "가족 공동" }]}
        value={selected}
        onChange={setSelected}
      />

      <Link href={`/habits/new?owner=${selected}`} className="block">
        <Button tone="gold" block className="pointer-events-none">
          <Plus size={18} strokeWidth={2.4} aria-hidden /> {name} 퀘스트 추가
        </Button>
      </Link>

      {pending.length > 0 && (
        <Card tone="lavender" className="p-0">
          <h2 className="px-4 pt-4 text-[16px] font-bold">승인 대기 {pending.length}</h2>
          <ul className="mt-1 divide-y divide-white/60">
            {pending.map((g) => (
              <li key={g.id} className="flex items-center gap-2 px-4 py-3">
                <Link href={`/habits/${g.id}`} className="flex min-w-0 flex-1 items-center gap-3" aria-label={`${g.title} 수정`}>
                  <QuestIcon goal={g} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold">{g.title}</p>
                    <p className="text-[12px] opacity-80">{scheduleLabel(g)} · {typeLabel(g)} · 스티커 {g.stickers}</p>
                  </div>
                </Link>
                <Button tone="surface" onClick={() => void decide(g, false)} aria-label={`${g.title} 거절`}>거절</Button>
                <Button tone="gold" onClick={() => void decide(g, true)} aria-label={`${g.title} 승인`}>승인</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-0">
        <h2 className="px-4 pt-4 text-[16px] font-bold">진행 중 {active.length}</h2>
        {active.length === 0 ? (
          <p className="px-4 py-5 text-center text-[13px] font-semibold text-muted">진행 중인 퀘스트가 없습니다. 위에서 추가해 주세요.</p>
        ) : (
          <ul className="mt-1 divide-y divide-line">{active.map((g) => <Row key={g.id} g={g} />)}</ul>
        )}
      </Card>

      {stopped.length > 0 && (
        <Card className="p-0">
          <h2 className="px-4 pt-4 text-[16px] font-bold">멈춤 {stopped.length}</h2>
          <p className="px-4 text-[12px] text-muted">눌러서 다시 시작하거나 삭제할 수 있습니다</p>
          <ul className="mt-1 divide-y divide-line">{stopped.map((g) => <Row key={g.id} g={g} dim />)}</ul>
        </Card>
      )}
    </div>
  );
}
