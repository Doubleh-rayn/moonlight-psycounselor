/**
 * 데모 모드 시드: 로그인 화면의 "데모 가족으로 시작" 이 만든다.
 * 구성원 4명, 목표 몇 개, 지난 2주 체크, 보상 2개.
 */
import type { MemoryRepo } from "./memory";
import type { InsertInput } from "./types";
import { addDays, todayKey, weekdayOf } from "@/lib/date";

export const DEMO_EMAIL = "demo@family.quest";
export const DEMO_PASSWORD = "demo1234";
export const DEMO_PIN = "1234";

export async function seedDemo(repo: MemoryRepo): Promise<void> {
  repo.reset();
  await repo.signUp(DEMO_EMAIL, DEMO_PASSWORD);
  await repo.createFamily({
    name: "우리 가족",
    pin: DEMO_PIN,
    members: [
      { display_name: "엄마", role: "admin", is_minor: false, color: "blue", birth_year_month: "1985-04", sex: "female", height_cm: 162 },
      { display_name: "아빠", role: "admin", is_minor: false, color: "peach", birth_year_month: "1983-09", sex: "male", height_cm: 175 },
      { display_name: "지우", role: "member", is_minor: true, color: "mint", birth_year_month: "2015-03", sex: "female", height_cm: 146 },
      { display_name: "하준", role: "member", is_minor: true, color: "lavender", birth_year_month: "2018-07", sex: "male", height_cm: 128 },
    ],
  });
  const snap = await repo.loadSnapshot(todayKey());
  const [mom, dad, jiwoo, hajun] = snap.members;

  // 목표는 30일 전에 만든 것으로 두어 지난 체크가 달성률에 반영되게 한다
  const createdAt = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const goalRows: InsertInput<"quests">[] = [
    { owner_member_id: mom.id, type: "diet", title: "가당 음료 1잔을 물로 바꾸기", days_of_week: [0, 1, 2, 3, 4, 5, 6], stickers: 1 },
    { owner_member_id: mom.id, type: "diet", title: "밥 3분의 1공기 덜기", days_of_week: [0, 1, 2, 3, 4, 5, 6], stickers: 1 },
    { owner_member_id: mom.id, type: "exercise", title: "빠르게 걷기 30분", measure: "minutes", target_value: 30, days_of_week: [], weekly_target: 3, stickers: 2 },
    { owner_member_id: mom.id, type: "habit", category: "tidy", title: "자기 전 10분 정리", days_of_week: [0, 1, 2, 3, 4, 5, 6], stickers: 1 },
    { owner_member_id: dad.id, type: "exercise", title: "계단으로 올라가기", days_of_week: [1, 2, 3, 4, 5], stickers: 1 },
    { owner_member_id: dad.id, type: "diet", title: "야식 건너뛰기", days_of_week: [0, 1, 2, 3, 4, 5, 6], stickers: 1 },
    { owner_member_id: jiwoo.id, type: "habit", category: "study", title: "책 20분 읽기", measure: "minutes", target_value: 20, days_of_week: [1, 2, 3, 4, 5], stickers: 1 },
    { owner_member_id: jiwoo.id, type: "habit", category: "sleep", title: "10시 전에 잠자리", days_of_week: [0, 1, 2, 3, 4, 5, 6], stickers: 1 },
    { owner_member_id: jiwoo.id, type: "exercise", title: "줄넘기 100개", measure: "count", target_value: 100, days_of_week: [1, 3, 5], stickers: 1 },
    { owner_member_id: hajun.id, type: "habit", category: "tidy", title: "장난감 정리", days_of_week: [0, 1, 2, 3, 4, 5, 6], stickers: 1 },
    { owner_member_id: hajun.id, type: "diet", title: "과자 대신 과일", days_of_week: [0, 1, 2, 3, 4, 5, 6], stickers: 1 },
    { owner_member_id: null, type: "exercise", title: "저녁 식사 후 함께 산책 20분", days_of_week: [0, 1, 2, 3, 4, 5, 6], stickers: 2 },
  ];
  const goals = await repo.insertMany("quests", goalRows.map((g) => ({ ...g, created_at: createdAt })));

  // 지난 14일 체크 (오늘 제외): 구성원별 대략적인 달성률 차이를 둔다
  const rate: Record<string, number> = { [mom.id]: 0.65, [dad.id]: 0.8, [jiwoo.id]: 0.55, [hajun.id]: 0.85 };
  const today = todayKey();
  let seed = 7;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const checkins: InsertInput<"checkins">[] = [];
  for (let i = 14; i >= 1; i--) {
    const date = addDays(today, -i);
    const wd = weekdayOf(date);
    for (const g of goals) {
      const scheduled = g.days_of_week.length === 0 ? wd === 1 || wd === 3 || wd === 5 : g.days_of_week.includes(wd);
      if (!scheduled) continue;
      const members = g.owner_member_id ? [g.owner_member_id] : [mom.id, dad.id, jiwoo.id, hajun.id];
      for (const mid of members) {
        const p = g.owner_member_id ? rate[mid] : 0.7;
        const done = rand() < p;
        if (!done && rand() < 0.5) continue; // 아예 입력하지 않은 날
        const value = done ? g.target_value : g.measure === "done" ? 0 : Math.round(g.target_value * 0.5);
        checkins.push({ goal_id: g.id, member_id: mid, date, done, value });
      }
    }
  }
  await repo.insertMany("checkins", checkins);

  await repo.insertMany("rewards", [
    { title: "주말 영화 고르기", cost: 10, scope: "personal" },
    { title: "보드게임 밤", cost: 15, scope: "personal" },
    { title: "가족 나들이", cost: 30, scope: "family" },
  ]);
  await repo.insertMany("weight_logs", [
    { member_id: mom.id, date: addDays(today, -14), weight: 60.0 },
    { member_id: mom.id, date: addDays(today, -7), weight: 59.6 },
  ]);
}
