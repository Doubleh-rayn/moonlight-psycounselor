"use client";

import { AppShell } from "@/components/layout/AppShell";
import { QuestMapScreen } from "@/components/quest/QuestMapScreen";

export default function QuestPage() {
  return (
    <AppShell>
      <QuestMapScreen />
    </AppShell>
  );
}
