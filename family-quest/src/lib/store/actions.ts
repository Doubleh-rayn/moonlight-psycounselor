"use client";

/**
 * 화면에서 쓰는 변경 동작 모음. 낙관적 업데이트 + 실패 시 토스트.
 */
import { useCallback } from "react";
import { useFamily } from "./FamilyStore";
import { useToast } from "@/components/app/Toast";
import type { CheckinRow, CheerRow, GoalRow } from "@/lib/db/types";
import type { FamilyRepo, FamilySnapshot } from "@/lib/repo";

function tempId(): string {
  return `tmp-${Math.random().toString(36).slice(2)}`;
}

export function useActions() {
  const { mutate, me, today } = useFamily();
  const toast = useToast();

  const run = useCallback(
    async <T,>(label: string, apply: (s: FamilySnapshot) => FamilySnapshot, commit: (repo: FamilyRepo) => Promise<T>) => {
      try {
        return await mutate<T>(apply, commit);
      } catch (e) {
        toast(e instanceof Error ? e.message : `${label}에 실패했습니다`, "error");
        throw e;
      }
    },
    [mutate, toast],
  );

  /** 체크·해제 (value 는 횟수·분 입력값, done 과 함께 저장) */
  const setCheckin = useCallback(
    (goal: GoalRow, memberId: string, date: string, done: boolean, value?: number) => {
      const v = value ?? (done ? goal.target_value : 0);
      const now = new Date().toISOString();
      return run<CheckinRow>(
        "체크",
        (s) => {
          const i = s.checkins.findIndex((c) => c.goal_id === goal.id && c.member_id === memberId && c.date === date);
          const next = [...s.checkins];
          if (i >= 0) next[i] = { ...next[i], done, value: v, updated_at: now };
          else
            next.push({
              id: tempId(), family_id: s.family.id, goal_id: goal.id, member_id: memberId, date, done, value: v,
              created_at: now, updated_at: now,
            });
          return { ...s, checkins: next };
        },
        (repo) => repo.upsertCheckin({ goal_id: goal.id, member_id: memberId, date, done, value: v }),
      );
    },
    [run],
  );

  const sendCheer = useCallback(
    (toMemberId: string, message: string) => {
      if (!me) return Promise.reject(new Error("구성원이 선택되지 않았습니다"));
      const now = new Date().toISOString();
      return run<CheerRow>(
        "응원 보내기",
        (s) => ({
          ...s,
          cheers: [
            { id: tempId(), family_id: s.family.id, from_member_id: me.id, to_member_id: toMemberId, date: today, message, created_at: now },
            ...s.cheers,
          ],
        }),
        (repo) => repo.insert("cheers", { from_member_id: me.id, to_member_id: toMemberId, date: today, message }),
      );
    },
    [run, me, today],
  );

  return { run, setCheckin, sendCheer };
}
