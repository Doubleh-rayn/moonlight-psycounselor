import type { HTMLAttributes } from "react";
import clsx from "clsx";
import { toneStyle, type Tone } from "@/lib/design/tokens";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 면 색. 기본은 흰 surface */
  tone?: Tone;
}

/**
 * 카드: radius 22px, 아래 4px edge 띠 + 부드러운 그림자 (6절 입체 규칙).
 * 글자색은 톤의 deep 으로 자동 설정된다.
 */
export function Card({ tone = "surface", className, style, children, ...rest }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-card bg-(--face) text-(--deep) raised-card p-4",
        className,
      )}
      style={{ ...toneStyle(tone), ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
