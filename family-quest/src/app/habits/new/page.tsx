"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { NewHabitScreen } from "@/components/habits/NewHabitScreen";

/** 습관 추가. ?owner=<구성원 id|family> 로 대상을 미리 고를 수 있다 (관리 화면에서 진입) */
export default function NewHabitPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <NewHabitScreen />
      </Suspense>
    </AppShell>
  );
}
