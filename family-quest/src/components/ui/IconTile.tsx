import type { LucideIcon } from "lucide-react";
import clsx from "clsx";
import { toneStyle, type Tone } from "@/lib/design/tokens";

interface IconTileProps {
  icon: LucideIcon;
  tone: Tone;
  /** 접근성 라벨 (분류 이름) */
  label: string;
  className?: string;
}

/** 아이콘 타일: 48px, radius 15px, 4px edge 띠. 아이콘은 선형 2.2px, deep 색. */
export function IconTile({ icon: Icon, tone, label, className }: IconTileProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={clsx(
        "flex size-12 shrink-0 items-center justify-center rounded-tile",
        "bg-(--face) text-(--deep) raised-4",
        className,
      )}
      style={toneStyle(tone)}
    >
      <Icon size={22} strokeWidth={2.2} aria-hidden />
    </div>
  );
}
