/**
 * 1단계 임시 데이터. 4단계에서 Supabase 실데이터로 교체한다.
 * 필드 이름은 PLAN.md 4절 데이터 모델을 그대로 따른다.
 */
import type { MemberColor, QuestKind } from "@/lib/design/tokens";

export interface MockMember {
  id: string;
  display_name: string;
  role: "admin" | "member";
  color: MemberColor;
  sort_order: number;
  /** 이번 주 달성률 % (0~100) */
  weekly_rate: number;
  /** 오늘 완료 / 오늘 예정 */
  today_done: number;
  today_total: number;
}

export interface MockQuest {
  id: string;
  kind: QuestKind;
  title: string;
  /** 보조 설명: 반복 규칙이나 단위 */
  note: string;
  measure: "done" | "count" | "minutes";
  target_value: number;
  /** 오늘 입력값 (count/minutes 일 때 진행률 표시용) */
  value: number;
  done: boolean;
  stickers: number;
}

export interface MockFamilyQuest {
  id: string;
  title: string;
  note: string;
  participants: string[]; // member id
  completed: string[]; // member id
}

/** 현재 선택된 구성원 (3단계 프로필 선택에서 저장되는 값) */
export const ME_ID = "m1";

export const members: MockMember[] = [
  { id: "m1", display_name: "엄마", role: "admin", color: "blue", sort_order: 1, weekly_rate: 64, today_done: 2, today_total: 4 },
  { id: "m2", display_name: "아빠", role: "admin", color: "peach", sort_order: 2, weekly_rate: 78, today_done: 3, today_total: 3 },
  { id: "m3", display_name: "지우", role: "member", color: "mint", sort_order: 3, weekly_rate: 52, today_done: 1, today_total: 3 },
  { id: "m4", display_name: "하준", role: "member", color: "lavender", sort_order: 4, weekly_rate: 85, today_done: 2, today_total: 2 },
];

export const familyWeeklyRate = 57;

export const myStickers = 12;

export const myStage = { no: 1, name: "적응", weeklyRate: 64 };

export const myQuests: MockQuest[] = [
  { id: "g1", kind: "water", title: "가당 음료 1잔을 물로 바꾸기", note: "매일 · 식단", measure: "done", target_value: 1, value: 0, done: true, stickers: 1 },
  { id: "g2", kind: "meal", title: "밥 3분의 1공기 덜기", note: "저녁 식사 · 식단", measure: "done", target_value: 1, value: 0, done: true, stickers: 1 },
  { id: "g3", kind: "exercise", title: "빠르게 걷기 30분", note: "주 3회 · 이번 주 1/3", measure: "minutes", target_value: 30, value: 15, done: false, stickers: 2 },
  { id: "g4", kind: "habit", title: "자기 전 10분 정리", note: "매일 · 정리정돈", measure: "done", target_value: 1, value: 0, done: false, stickers: 1 },
];

export const familyQuest: MockFamilyQuest = {
  id: "f1",
  title: "저녁 식사 후 함께 산책 20분",
  note: "월·수·금 · 가족 공동",
  participants: ["m1", "m2", "m3"],
  completed: ["m2", "m3"],
};
