import { describe, expect, it } from "vitest";
import { canDeleteGoal, canEditGoal, statusAfterEdit } from "./permissions";

const admin = { id: "a", role: "admin" as const };
const kid = { id: "k", role: "member" as const };

describe("canEditGoal", () => {
  it("관리자는 개인·가족 공동 모두 수정", () => {
    expect(canEditGoal(admin, { owner_member_id: "k" })).toBe(true);
    expect(canEditGoal(admin, { owner_member_id: null })).toBe(true);
  });
  it("구성원은 자기 것만, 가족 공동은 불가", () => {
    expect(canEditGoal(kid, { owner_member_id: "k" })).toBe(true);
    expect(canEditGoal(kid, { owner_member_id: "a" })).toBe(false);
    expect(canEditGoal(kid, { owner_member_id: null })).toBe(false);
  });
});

describe("canDeleteGoal / statusAfterEdit", () => {
  it("삭제는 관리자만", () => {
    expect(canDeleteGoal(admin)).toBe(true);
    expect(canDeleteGoal(kid)).toBe(false);
  });
  it("구성원이 고치면 다시 승인 대기, 관리자는 승인 상태", () => {
    expect(statusAfterEdit(kid, "approved")).toBe("proposed");
    expect(statusAfterEdit(kid, "proposed")).toBe("proposed");
    expect(statusAfterEdit(admin, "proposed")).toBe("approved");
  });
});
