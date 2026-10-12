"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useReadyFamily } from "@/lib/store/FamilyStore";
import { useActions } from "@/lib/store/actions";
import { useToast } from "@/components/app/Toast";
import { canDeleteGoal, canEditGoal, statusAfterEdit } from "@/lib/goals/permissions";
import { HabitForm, type HabitValues } from "./HabitForm";

/**
 * 퀘스트 수정. 오늘 화면·가족 공동 카드·퀘스트 지도에서 항목을 누르면 온다.
 * 관리자: 전부 수정·그만하기·삭제. 구성원: 자기 것만 수정·그만하기 (고치면 다시 승인 대기).
 */
export function EditHabitScreen({ id }: { id: string }) {
  const { snapshot, me } = useReadyFamily();
  const { run } = useActions();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const goal = snapshot.goals.find((g) => g.id === id) ?? null;
  const back = () => (typeof window !== "undefined" && window.history.length > 1 ? router.back() : router.push("/"));

  if (!goal) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-5">
        <h1 className="text-[28px] font-extrabold">퀘스트 수정</h1>
        <Card><p className="text-[14px] font-semibold text-muted">퀘스트를 찾을 수 없습니다. 삭제되었거나 다른 가족의 항목입니다.</p></Card>
        <Button tone="surface" block onClick={back}>돌아가기</Button>
      </div>
    );
  }
  if (!canEditGoal(me, goal)) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-5">
        <h1 className="text-[28px] font-extrabold">{goal.title}</h1>
        <Card><p className="text-[14px] font-semibold text-muted">이 퀘스트는 관리자 또는 본인만 고칠 수 있습니다.</p></Card>
        <Button tone="surface" block onClick={back}>돌아가기</Button>
      </div>
    );
  }

  const save = async (v: HabitValues) => {
    const status = statusAfterEdit(me, goal.status);
    setBusy(true);
    try {
      await run(
        "수정",
        (s) => ({ ...s, goals: s.goals.map((g) => (g.id === goal.id ? { ...g, ...v, status } : g)) }),
        (repo) => repo.update("quests", goal.id, { ...v, status }),
      );
      toast(me.role === "admin" ? "저장했습니다" : "고쳤습니다. 관리자가 승인하면 다시 시작됩니다.");
      back();
    } catch {
      /* 토스트는 run 이 표시 */
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    const active = !goal.active;
    setBusy(true);
    try {
      await run(
        active ? "다시 시작" : "그만하기",
        (s) => ({ ...s, goals: s.goals.map((g) => (g.id === goal.id ? { ...g, active } : g)) }),
        (repo) => repo.update("quests", goal.id, { active }),
      );
      toast(active ? "다시 시작합니다" : "이 퀘스트를 멈췄습니다. 기록은 남습니다.");
      back();
    } catch {
      /* 토스트는 run 이 표시 */
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await run(
        "삭제",
        (s) => ({ ...s, goals: s.goals.filter((g) => g.id !== goal.id), checkins: s.checkins.filter((c) => c.goal_id !== goal.id) }),
        (repo) => repo.remove("quests", goal.id),
      );
      toast("삭제했습니다");
      setConfirmDelete(false);
      router.push("/");
    } catch {
      /* 토스트는 run 이 표시 */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-5">
      <h1 className="text-[28px] font-extrabold">퀘스트 수정</h1>
      {goal.source === "plan" && (
        <p className="text-[12px] font-semibold text-muted">계획에서 자동으로 만든 퀘스트입니다. 고쳐도 단계(퀘스트 지도) 연결은 유지됩니다.</p>
      )}
      {!goal.active && <p className="text-[12px] font-semibold text-peach-deep">멈춘 퀘스트입니다. 아래에서 다시 시작할 수 있습니다.</p>}
      <HabitForm
        initial={goal}
        submitLabel={me.role === "admin" ? "저장" : "고쳐서 제안하기"}
        busy={busy}
        onSubmit={save}
        footer={
          <div className="flex gap-2">
            <Button tone="surface" block disabled={busy} onClick={() => void toggleActive()}>
              {goal.active ? <Pause size={16} strokeWidth={2.2} aria-hidden /> : <Play size={16} strokeWidth={2.2} aria-hidden />}
              {goal.active ? "그만하기" : "다시 시작"}
            </Button>
            {canDeleteGoal(me) && (
              <Button tone="peach" block disabled={busy} onClick={() => setConfirmDelete(true)}>
                <Trash2 size={16} strokeWidth={2.2} aria-hidden /> 삭제
              </Button>
            )}
          </div>
        }
      />
      <Sheet open={confirmDelete} title="퀘스트 삭제" onClose={() => setConfirmDelete(false)}>
        <p className="text-[14px]">{`"${goal.title}" 과(와) 그동안의 체크 기록이 모두 지워집니다. 기록을 남기려면 삭제 대신 "그만하기"를 쓰세요.`}</p>
        <div className="mt-4 flex gap-2">
          <Button tone="surface" block onClick={() => setConfirmDelete(false)}>취소</Button>
          <Button tone="peach" block disabled={busy} onClick={() => void remove()}>삭제</Button>
        </div>
      </Sheet>
    </div>
  );
}
