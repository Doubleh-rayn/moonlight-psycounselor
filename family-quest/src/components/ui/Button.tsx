import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";
import { toneStyle, type Tone } from "@/lib/design/tokens";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  size?: "md" | "lg";
  /** 가로 꽉 채우기 */
  block?: boolean;
}

/**
 * 버튼: 3px edge 띠. 누르면 2px 내려가며 띠가 1px 로 줄어든다.
 * 터치 영역 최소 44px.
 */
export function Button({
  tone = "gold",
  size = "md",
  block = false,
  className,
  style,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-[16px] font-bold",
        "bg-(--face) text-(--deep) raised-3 select-none",
        "disabled:opacity-50 disabled:pointer-events-none",
        size === "md" ? "min-h-[44px] px-4 text-[15px]" : "min-h-[52px] px-5 text-[16px]",
        block && "w-full",
        className,
      )}
      style={{ ...toneStyle(tone), ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
