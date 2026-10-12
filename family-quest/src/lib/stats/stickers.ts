import type {
  CheckinRow,
  FamilyStickerBalanceRow,
  GoalRow,
  MemberRow,
  MemberStickerBalanceRow,
  RedemptionRow,
  RewardRow,
  StickerBonusRow,
} from "@/lib/db/types";

/**
 * 스티커 잔액 계산 (PLAN.md 4절 규칙). SQL 뷰(member_sticker_balances 등)와 같은 규칙이며,
 * 데모 모드와 단위 테스트에서 쓴다.
 *  개인 = 개인 목표 완료 체크의 stickers 합 + 보너스 − 승인·지급된 개인 보상 cost 합
 *  가족 = 가족 공동 목표를 활성 구성원 전원이 완료한 날의 stickers 합 − 승인·지급된 가족 보상 cost 합
 */
export interface LedgerInput {
  familyId: string;
  members: MemberRow[];
  goals: GoalRow[];
  checkins: CheckinRow[];
  rewards: RewardRow[];
  redemptions: RedemptionRow[];
  bonuses: StickerBonusRow[];
}

const SPENT_STATUSES = new Set(["approved", "fulfilled"]);

export function computeMemberBalances(input: LedgerInput): MemberStickerBalanceRow[] {
  const goalById = new Map(input.goals.map((g) => [g.id, g]));
  const rewardById = new Map(input.rewards.map((r) => [r.id, r]));

  return input.members.map((m) => {
    let earned = 0;
    for (const c of input.checkins) {
      if (c.member_id !== m.id || !c.done) continue;
      const g = goalById.get(c.goal_id);
      if (g && g.owner_member_id !== null) earned += g.stickers;
    }
    const bonus = input.bonuses.filter((b) => b.member_id === m.id).reduce((s, b) => s + b.amount, 0);
    let spent = 0;
    for (const r of input.redemptions) {
      if (r.member_id !== m.id || !SPENT_STATUSES.has(r.status)) continue;
      const rw = rewardById.get(r.reward_id);
      if (rw && rw.scope === "personal") spent += rw.cost;
    }
    return { family_id: input.familyId, member_id: m.id, earned, bonus, spent, balance: earned + bonus - spent };
  });
}

export function computeFamilyBalance(input: LedgerInput): FamilyStickerBalanceRow {
  const activeCount = input.members.filter((m) => m.active).length;
  const goalById = new Map(input.goals.map((g) => [g.id, g]));
  const rewardById = new Map(input.rewards.map((r) => [r.id, r]));

  // 가족 공동 목표 × 날짜 → 완료 구성원 집합
  const doneBy = new Map<string, Set<string>>();
  for (const c of input.checkins) {
    if (!c.done) continue;
    const g = goalById.get(c.goal_id);
    if (!g || g.owner_member_id !== null) continue;
    const key = `${g.id}|${c.date}`;
    if (!doneBy.has(key)) doneBy.set(key, new Set());
    doneBy.get(key)!.add(c.member_id);
  }
  let earned = 0;
  for (const [key, set] of doneBy) {
    if (activeCount > 0 && set.size >= activeCount) {
      const g = goalById.get(key.split("|")[0]);
      if (g) earned += g.stickers;
    }
  }
  let spent = 0;
  for (const r of input.redemptions) {
    if (!SPENT_STATUSES.has(r.status)) continue;
    const rw = rewardById.get(r.reward_id);
    if (rw && rw.scope === "family") spent += rw.cost;
  }
  return { family_id: input.familyId, earned, spent, balance: earned - spent };
}
