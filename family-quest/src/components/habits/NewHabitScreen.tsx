"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useReadyFamily } from "@/lib/store/FamilyStore";
import { useActions } from "@/lib/store/actions";
import { useToast } from "@/components/app/Toast";
import { HabitForm, type HabitValues } from "./HabitForm";
import type { GoalRow } from "@/lib/db/types";

/** 습관 추가: 관리자는 즉시 승인, 구성원은 제안. 개수 한도 없음 */
export function NewHabitScreen() {
  const { me } = useReadyFamily();
  const { run } = useActions();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isAdmin = me.role === "admin";

  const save = async (v: HabitValues) => {
    const status: GoalRow["status"] = isAdmin ? "approved" : "proposed";
    setBusy(true);
    try {
      await run("습관 추가", (s) => s, (repo) => repo.insert("quests", { ...v, status, created_by_member_id: me.id }));
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
      <HabitForm submitLabel={isAdmin ? "추가" : "제안하기"} busy={busy} onSubmit={save} />
    </div>
  );
}
