"use client";

import { Check } from "lucide-react";
import clsx from "clsx";
import { toneStyle } from "@/lib/design/tokens";

interface CheckButtonProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** 접근성 라벨: 퀘스트 제목 */
  label: string;
  disabled?: boolean;
}

/**
 * 체크 버튼: 44px 원형. 한 번 탭으로 체크·해제.
 * 미완료: 흰 면 + surface edge / 완료: check-on 토큰.
 */
export function CheckButton({ checked, onChange, label, disabled }: CheckButtonProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "flex size-11 shrink-0 items-center justify-center rounded-full",
        "bg-(--face) text-(--deep) raised-3",
        !checked && "border-2 border-line",
        "disabled:opacity-50",
      )}
      style={toneStyle(checked ? "check-on" : "surface")}
    >
      <Check
        size={22}
        strokeWidth={2.4}
        aria-hidden
        className={clsx(checked ? "opacity-100" : "opacity-25")}
      />
    </button>
  );
}
