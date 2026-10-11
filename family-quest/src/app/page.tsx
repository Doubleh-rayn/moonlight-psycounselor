import { AppShell } from "@/components/layout/AppShell";
import { TodayHero } from "@/components/today/TodayHero";
import { FamilyRateCard } from "@/components/today/FamilyRateCard";
import { QuestList } from "@/components/today/QuestList";
import { FamilyQuestCard } from "@/components/today/FamilyQuestCard";
import { CheerRow } from "@/components/today/CheerRow";
import {
  ME_ID,
  familyQuest,
  familyWeeklyRate,
  members,
  myQuests,
  myStage,
  myStickers,
} from "@/lib/mock/today";

/** 오늘 (첫 화면) — 1단계: 임시 데이터로 정적 구성 */
export default function TodayPage() {
  const me = members.find((m) => m.id === ME_ID)!;

  return (
    <AppShell>
      <TodayHero memberName={me.display_name} stickers={myStickers} stage={myStage} />
      <div className="flex flex-col gap-4 px-4 pt-5">
        <FamilyRateCard members={members} familyRate={familyWeeklyRate} />
        <QuestList quests={myQuests} />
        <FamilyQuestCard quest={familyQuest} members={members} meId={ME_ID} />
        <CheerRow members={members} meId={ME_ID} />
      </div>
    </AppShell>
  );
}
