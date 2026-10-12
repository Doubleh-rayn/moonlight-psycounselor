"use client";

import { AppShell } from "@/components/layout/AppShell";
import { TodayHero } from "@/components/today/TodayHero";
import { FamilyRateCard } from "@/components/today/FamilyRateCard";
import { QuestList } from "@/components/today/QuestList";
import { FamilyQuestCards } from "@/components/today/FamilyQuestCard";
import { CheerRow } from "@/components/today/CheerRow";

/** 오늘 (첫 화면) */
export default function TodayPage() {
  return (
    <AppShell>
      <TodayHero />
      <div className="flex flex-col gap-4 px-4 pt-5">
        <FamilyRateCard />
        <QuestList />
        <FamilyQuestCards />
        <CheerRow />
      </div>
    </AppShell>
  );
}
