"use client";

/**
 * 앱이 열릴 때(그리고 데이터가 갱신될 때) 계획 상태를 오늘 기준으로 맞춘다:
 * 주차 판정, 단계 통과 보너스·연장, 현재 단계 퀘스트 생성. 여러 번 실행해도 결과가 같다.
 */
import { useEffect, useRef } from "react";
import { useFamily } from "@/lib/store/FamilyStore";
import { maintainPlans } from "@/lib/plan/evaluate";
import { useToast } from "./Toast";

export function PlanMaintenance() {
  const { repo, snapshot, familyStatus, today, reload } = useFamily();
  const toast = useToast();
  const busy = useRef(false);
  const lastKey = useRef("");

  useEffect(() => {
    if (!repo || familyStatus !== "ready" || !snapshot || !today) return;
    if (!snapshot.plans.some((p) => p.status === "active")) return;
    // 같은 날, 같은 계획 상태에서는 한 번만
    const key = `${today}|${snapshot.plans.map((p) => `${p.id}:${p.weeks}`).join(",")}|${snapshot.planWeeks.length}|${snapshot.goals.length}`;
    if (busy.current || lastKey.current === key) return;
    busy.current = true;
    lastKey.current = key;
    maintainPlans(repo, snapshot, today)
      .then((notes) => {
        if (notes.length > 0) {
          notes.forEach((n) => toast(n));
          return reload();
        }
      })
      .catch(() => {})
      .finally(() => {
        busy.current = false;
      });
  }, [repo, snapshot, familyStatus, today, reload, toast]);

  return null;
}
