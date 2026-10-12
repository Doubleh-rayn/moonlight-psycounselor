import { describe, expect, it } from "vitest";
import { computeFamilyBalance, computeMemberBalances, type LedgerInput } from "./stickers";
import type { CheckinRow, GoalRow, MemberRow, RedemptionRow, RewardRow, StickerBonusRow } from "@/lib/db/types";

const F = "fam";
const member = (id: string, active = true): MemberRow => ({
  id, family_id: F, display_name: id, role: "member", is_minor: false, color: "blue",
  birth_year_month: null, sex: null, height_cm: null, sort_order: 0, active, user_id: null, created_at: "",
});
const goal = (id: string, owner: string | null, stickers: number): GoalRow => ({
  id, family_id: F, owner_member_id: owner, type: "exercise", category: null, title: id, measure: "done",
  target_value: 1, days_of_week: [1], weekly_target: null, stickers, status: "approved", source: "manual",
  plan_id: null, plan_stage: null, created_by_member_id: null, active: true, created_at: "",
});
const checkin = (goal_id: string, member_id: string, date: string, done: boolean): CheckinRow => ({
  id: `${goal_id}-${member_id}-${date}`, family_id: F, goal_id, member_id, date, value: 0, done, created_at: "", updated_at: "",
});
const reward = (id: string, cost: number, scope: "personal" | "family"): RewardRow => ({
  id, family_id: F, title: id, cost, scope, status: "approved", proposed_by_member_id: null, active: true, created_at: "",
});
const redemption = (reward_id: string, member_id: string, status: RedemptionRow["status"]): RedemptionRow => ({
  id: `${reward_id}-${member_id}-${status}`, family_id: F, reward_id, member_id, status, requested_at: "", approved_at: null, fulfilled_at: null,
});
const bonus = (member_id: string, amount: number): StickerBonusRow => ({
  id: `b-${member_id}-${amount}`, family_id: F, member_id, amount, reason: "", reason_key: null, created_at: "",
});

// SQL 테스트(supabase/tests/10_rls_test.sql)와 같은 시나리오
const input: LedgerInput = {
  familyId: F,
  members: [member("mom"), member("kid")],
  goals: [goal("walk", "mom", 2), goal("family-walk", null, 3)],
  checkins: [
    checkin("walk", "mom", "2026-10-05", true),
    checkin("walk", "mom", "2026-10-07", true),
    checkin("walk", "mom", "2026-10-09", false),
    checkin("family-walk", "mom", "2026-10-05", true),
    checkin("family-walk", "kid", "2026-10-05", true),
    checkin("family-walk", "mom", "2026-10-06", true),
  ],
  rewards: [reward("movie", 3, "personal"), reward("trip", 10, "family")],
  redemptions: [redemption("movie", "mom", "approved"), redemption("movie", "mom", "requested")],
  bonuses: [bonus("mom", 5)],
};

describe("스티커 잔액", () => {
  it("개인: 완료 체크 4 + 보너스 5 − 승인 보상 3 = 6, 신청만 한 건은 차감 안 함", () => {
    const b = computeMemberBalances(input);
    expect(b.find((x) => x.member_id === "mom")).toMatchObject({ earned: 4, bonus: 5, spent: 3, balance: 6 });
    expect(b.find((x) => x.member_id === "kid")).toMatchObject({ earned: 0, bonus: 0, spent: 0, balance: 0 });
  });

  it("가족 공동 체크는 개인 잔액에 들어가지 않는다", () => {
    const b = computeMemberBalances(input);
    expect(b.find((x) => x.member_id === "kid")!.earned).toBe(0);
  });

  it("가족: 전원 완료한 날(10/05)만 인정 = 3", () => {
    expect(computeFamilyBalance(input)).toMatchObject({ earned: 3, spent: 0, balance: 3 });
  });

  it("가족 보상 승인 시 가족 잔액에서 차감", () => {
    const b = computeFamilyBalance({ ...input, redemptions: [...input.redemptions, redemption("trip", "mom", "fulfilled")] });
    expect(b.balance).toBe(-7);
  });

  it("비활성 구성원은 전원 판단에서 제외", () => {
    const b = computeFamilyBalance({
      ...input,
      members: [member("mom"), member("kid"), member("grandma", false)],
    });
    expect(b.earned).toBe(3);
  });
});
