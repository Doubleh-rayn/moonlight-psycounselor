"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Droplets, Utensils, Footprints, Sparkles, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { IconTile } from "@/components/ui/IconTile";
import { CheckButton } from "@/components/ui/CheckButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { KIND_TONE, type QuestKind } from "@/lib/design/tokens";
import type { MockQuest } from "@/lib/mock/today";

const KIND_ICON: Record<QuestKind, { icon: LucideIcon; label: string }> = {
  water: { icon: Droplets, label: "식단(물)" },
  meal: { icon: Utensils, label: "식단(식사)" },
  exercise: { icon: Footprints, label: "운동" },
  habit: { icon: Sparkles, label: "생활습관" },
  family: { icon: Sparkles, label: "가족 공동" },
};

/**
 * 내 퀘스트 목록. 1단계에서는 화면 안 상태만 바뀐다 (저장 없음).
 * 4단계에서 낙관적 업데이트 + Supabase 저장으로 교체한다.
 */
export function QuestList({ quests: initial }: { quests: MockQuest[] }) {
  const [quests, setQuests] = useState(initial);

  const toggle = (id: string, next: boolean) =>
    setQuests((qs) => qs.map((q) => (q.id === id ? { ...q, done: next } : q)));

  const doneCount = quests.filter((q) => q.done).length;

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-[16px] font-bold">내 퀘스트</h2>
        <p className="text-[13px] font-semibold text-muted">
          {doneCount} / {quests.length} 완료
        </p>
      </div>
      <ul className="mt-2 divide-y divide-line">
        {quests.map((q) => {
          const { icon, label } = KIND_ICON[q.kind];
          const showProgress = q.measure !== "done";
          const pct = showProgress ? Math.round((q.value / q.target_value) * 100) : 0;
          const unit = q.measure === "minutes" ? "분" : "회";
          return (
            <li key={q.id} className="flex items-center gap-3 px-4 py-3">
              <IconTile icon={icon} tone={KIND_TONE[q.kind]} label={label} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-bold">{q.title}</p>
                <p className="mt-0.5 text-[13px] text-muted">
                  {q.note} · 스티커 {q.stickers}
                </p>
                {showProgress && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <ProgressBar
                      value={pct}
                      color="var(--color-graph-peach)"
                      height={6}
                      label={`${q.target_value}${unit} 중 ${q.value}${unit}`}
                    />
                    <span className="shrink-0 text-[12px] font-semibold text-muted">
                      {q.value}/{q.target_value}
                      {unit}
                    </span>
                  </div>
                )}
              </div>
              <CheckButton checked={q.done} onChange={(n) => toggle(q.id, n)} label={q.title} />
            </li>
          );
        })}
      </ul>
      <div className="px-4 pb-4 pt-2">
        <Link href="/habits/new" className="block">
          <Button tone="gold" block className="pointer-events-none">
            <Plus size={18} strokeWidth={2.4} aria-hidden /> 습관 추가
          </Button>
        </Link>
      </div>
    </Card>
  );
}
