"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { EditHabitScreen } from "@/components/habits/EditHabitScreen";

function EditHabitInner() {
  const params = useParams<{ id: string }>();
  return <EditHabitScreen id={String(params.id)} />;
}

/** 퀘스트 수정 (/habits/<id>). 동적 구간이라 Suspense 로 감싼다 (cacheComponents 요구) */
export default function EditHabitPage() {
  return (
    <Suspense fallback={null}>
      <AppShell>
        <EditHabitInner />
      </AppShell>
    </Suspense>
  );
}
