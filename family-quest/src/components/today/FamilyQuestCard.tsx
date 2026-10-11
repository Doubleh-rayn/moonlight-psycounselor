"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { IconTile } from "@/components/ui/IconTile";
import { CheckButton } from "@/components/ui/CheckButton";
import type { MockFamilyQuest, MockMember } from "@/lib/mock/today";

interface FamilyQuestCardProps {
  quest: MockFamilyQuest;
  members: MockMember[];
  meId: string;
}

/** 가족 공동 퀘스트: 참여 구성원 전원이 체크해야 성공. "3명 중 2명 완료" 표시. */
export function FamilyQuestCard({ quest, members, meId }: FamilyQuestCardProps) {
  const [completed, setCompleted] = useState<string[]>(quest.completed);
  const isParticipant = quest.participants.includes(meId);
  const myDone = completed.includes(meId);

  const toggleMe = (next: boolean) =>
    setCompleted((c) => (next ? [...c, meId] : c.filter((id) => id !== meId)));

  const total = quest.participants.length;
  const done = completed.filter((id) => quest.participants.includes(id)).length;
  const success = done === total;

  const byId = new Map(members.map((m) => [m.id, m]));

  return (
    <Card tone="pink">
      <div className="flex items-center gap-3">
        <IconTile icon={Users} tone="pink" label="가족 공동" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold opacity-80">가족 공동 퀘스트</p>
          <p className="truncate text-[16px] font-bold">{quest.title}</p>
        </div>
        {isParticipant && <CheckButton checked={myDone} onChange={toggleMe} label={quest.title} />}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-[13px] opacity-80">{quest.note}</p>
        <p className="text-[13px] font-bold">
          {success ? "전원 완료" : `${total}명 중 ${done}명 완료`}
        </p>
      </div>
      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="참여 구성원">
        {quest.participants.map((id) => {
          const m = byId.get(id);
          const isDone = completed.includes(id);
          return (
            <li
              key={id}
              className={
                "rounded-full border px-2.5 py-1 text-[12px] font-semibold " +
                (isDone ? "border-transparent bg-white/70" : "border-pink-deep/30 opacity-70")
              }
            >
              {m?.display_name ?? id}
              {isDone ? " · 완료" : ""}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
