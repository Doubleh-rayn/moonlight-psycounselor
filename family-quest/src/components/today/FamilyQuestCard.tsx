"use client";

import { Card } from "@/components/ui/Card";
import { CheckButton } from "@/components/ui/CheckButton";
import { QuestIcon } from "@/components/quest/QuestIcon";
import { useReadyFamily } from "@/lib/store/FamilyStore";
import { useActions } from "@/lib/store/actions";
import { familyGoals, indexCheckins, isGoalLiveOn, isScheduledOn, isWeeklyGoal } from "@/lib/stats/schedule";
import { scheduleLabel } from "@/lib/goals/kind";
import { canEditGoal } from "@/lib/goals/permissions";
import { useRouter } from "next/navigation";

/** 가족 공동 퀘스트: 활성 구성원 전원이 체크해야 성공. "N명 중 M명 완료" */
export function FamilyQuestCards() {
  const { snapshot, me, today, online } = useReadyFamily();
  const { setCheckin } = useActions();
  const router = useRouter();
  const idx = indexCheckins(snapshot.checkins);
  const members = snapshot.members.filter((m) => m.active);
  const goals = familyGoals(snapshot.goals).filter((g) => isGoalLiveOn(g, today) && (isWeeklyGoal(g) || isScheduledOn(g, today)));
  if (goals.length === 0) return null;

  return (
    <>
      {goals.map((g) => {
        const doneIds = members.filter((m) => idx.get(g.id, m.id, today)?.done).map((m) => m.id);
        const myDone = doneIds.includes(me.id);
        const success = doneIds.length === members.length;
        return (
          <Card key={g.id} tone="pink">
            <div className="flex items-center gap-3">
              <QuestIcon goal={g} />
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => router.push(`/habits/${g.id}`)}
                aria-label={`${g.title} ${canEditGoal(me, g) ? "수정" : "보기"}`}
              >
                <p className="text-[13px] font-semibold opacity-80">가족 공동 퀘스트</p>
                <p className="truncate text-[16px] font-bold">{g.title}</p>
              </button>
              <CheckButton checked={myDone} disabled={!online} onChange={(n) => void setCheckin(g, me.id, today, n).catch(() => {})} label={g.title} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-[13px] opacity-80">
                {scheduleLabel(g)} · 스티커 {g.stickers}
              </p>
              <p className="text-[13px] font-bold">{success ? "전원 완료" : `${members.length}명 중 ${doneIds.length}명 완료`}</p>
            </div>
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="참여 구성원">
              {members.map((m) => {
                const d = doneIds.includes(m.id);
                return (
                  <li
                    key={m.id}
                    className={
                      "rounded-full border px-2.5 py-1 text-[12px] font-semibold " +
                      (d ? "border-transparent bg-white/70" : "border-pink-deep/30 opacity-70")
                    }
                  >
                    {m.display_name}
                    {d ? " · 완료" : ""}
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </>
  );
}
