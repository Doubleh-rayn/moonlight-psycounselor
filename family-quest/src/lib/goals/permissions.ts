import type { GoalRow, MemberRow } from "@/lib/db/types";

/** 퀘스트 수정 권한: 관리자는 전부, 구성원은 자기 개인 퀘스트만 (가족 공동은 관리자만) */
export function canEditGoal(me: Pick<MemberRow, "id" | "role">, goal: Pick<GoalRow, "owner_member_id">): boolean {
  if (me.role === "admin") return true;
  return goal.owner_member_id === me.id;
}

/** 삭제는 관리자만. 구성원은 "그만하기"(비활성화)까지 */
export function canDeleteGoal(me: Pick<MemberRow, "role">): boolean {
  return me.role === "admin";
}

/** 수정 후 상태: 관리자가 고치면 그대로 승인, 구성원이 고치면 다시 승인 대기 */
export function statusAfterEdit(me: Pick<MemberRow, "role">, current: GoalRow["status"]): GoalRow["status"] {
  return me.role === "admin" ? "approved" : current === "proposed" ? "proposed" : "proposed";
}
