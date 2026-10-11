import type { CSSProperties } from "react";

/**
 * 색상 톤 — PLAN.md 6절의 "면 / edge / deep" 3단 토큰.
 * CSS 변수 값은 globals.css 의 @theme 에 정의되어 있고,
 * 여기서는 톤 이름 → Tailwind 클래스 / CSS 변수 매핑만 담당한다.
 */
export const TONES = [
  "surface",
  "hero",
  "panel",
  "gold",
  "blue",
  "mint",
  "peach",
  "lavender",
  "pink",
  "check-on",
] as const;

export type Tone = (typeof TONES)[number];

/** 구성원 color 값 (members.color). 원형 그래프와 아바타 색을 정한다. */
export type MemberColor = "blue" | "peach" | "mint" | "lavender" | "pink";

/** 구성원 color → 그래프 선 색 (6절 "그래프 선 색") */
export const GRAPH_COLOR: Record<MemberColor, string> = {
  blue: "var(--color-graph-blue)",
  peach: "var(--color-graph-peach)",
  mint: "var(--color-graph-mint)",
  pink: "var(--color-graph-pink)",
  // lavender 는 그래프 선 색이 명세에 없어 edge 색을 사용한다 (사용자 확인 필요)
  lavender: "var(--color-lavender-edge)",
};

/**
 * 톤에 해당하는 CSS 변수 3개(--face, --edge, --deep)를 style 로 주입한다.
 * raised-* 유틸리티와 bg-(--face) 류 클래스가 이 변수를 읽는다.
 */
export function toneStyle(tone: Tone): CSSProperties {
  const face = `var(--color-${tone})`;
  const edge = `var(--color-${tone}-edge)`;
  // surface 는 deep 이 없으므로 ink 를 쓴다
  const deep = tone === "surface" ? "var(--color-ink)" : `var(--color-${tone}-deep)`;
  return {
    "--face": face,
    "--edge": edge,
    "--deep": deep,
  } as CSSProperties;
}

/** 퀘스트 분류(goals.type / category) → 톤. 6절 용도 표 기준 */
export type QuestKind = "water" | "meal" | "exercise" | "habit" | "family";

export const KIND_TONE: Record<QuestKind, Tone> = {
  water: "blue",
  meal: "mint",
  exercise: "peach",
  habit: "lavender",
  family: "pink",
};
