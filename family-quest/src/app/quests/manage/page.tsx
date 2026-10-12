"use client";

import { AppShell } from "@/components/layout/AppShell";
import { ManageQuestsScreen } from "@/components/quest/ManageQuestsScreen";

/** 구성원 퀘스트 관리 (관리자) */
export default function ManageQuestsPage() {
  return (
    <AppShell>
      <ManageQuestsScreen />
    </AppShell>
  );
}
