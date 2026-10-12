import type { GoalType, HabitCategory, Measure } from "@/lib/db/types";

/** 습관 추가 화면의 분류와 추천 항목 (코드에 고정, PLAN.md 5.5) */
export interface HabitCategoryOption {
  key: string;
  label: string;
  type: GoalType;
  category: HabitCategory | null;
}

export const HABIT_CATEGORIES: HabitCategoryOption[] = [
  { key: "diet", label: "식단", type: "diet", category: null },
  { key: "exercise", label: "운동", type: "exercise", category: null },
  { key: "tidy", label: "정리정돈", type: "habit", category: "tidy" },
  { key: "study", label: "공부·독서", type: "habit", category: "study" },
  { key: "sleep", label: "수면", type: "habit", category: "sleep" },
  { key: "etc", label: "기타", type: "habit", category: "etc" },
];

export interface Suggestion {
  title: string;
  measure: Measure;
  target: number;
}

export const SUGGESTIONS: Record<string, Suggestion[]> = {
  diet: [
    { title: "가당 음료 1잔을 물로 바꾸기", measure: "done", target: 1 },
    { title: "밥 3분의 1공기 덜기", measure: "done", target: 1 },
    { title: "과자·야식 1회 건너뛰기", measure: "done", target: 1 },
    { title: "채소 반찬 먼저 먹기", measure: "done", target: 1 },
    { title: "물 6잔 마시기", measure: "count", target: 6 },
    { title: "아침 먹기", measure: "done", target: 1 },
  ],
  exercise: [
    { title: "빠르게 걷기 30분", measure: "minutes", target: 30 },
    { title: "계단으로 올라가기", measure: "done", target: 1 },
    { title: "줄넘기 100개", measure: "count", target: 100 },
    { title: "스트레칭 10분", measure: "minutes", target: 10 },
    { title: "자전거 타기 20분", measure: "minutes", target: 20 },
  ],
  tidy: [
    { title: "자기 전 10분 정리", measure: "minutes", target: 10 },
    { title: "책상 정리", measure: "done", target: 1 },
    { title: "장난감 제자리에 두기", measure: "done", target: 1 },
    { title: "이불 개기", measure: "done", target: 1 },
  ],
  study: [
    { title: "책 20분 읽기", measure: "minutes", target: 20 },
    { title: "숙제 먼저 하기", measure: "done", target: 1 },
    { title: "영어 단어 10개", measure: "count", target: 10 },
  ],
  sleep: [
    { title: "10시 전에 잠자리", measure: "done", target: 1 },
    { title: "자기 전 스마트폰 끄기", measure: "done", target: 1 },
    { title: "7시에 일어나기", measure: "done", target: 1 },
  ],
  etc: [
    { title: "식사 후 양치", measure: "count", target: 3 },
    { title: "일기 쓰기", measure: "done", target: 1 },
    { title: "화분에 물 주기", measure: "done", target: 1 },
  ],
};
