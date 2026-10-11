import clsx from "clsx";

interface ProgressRingProps {
  /** 0~100 */
  value: number;
  /** 선 색 (CSS 색상 또는 var()) */
  color: string;
  size?: number;
  stroke?: number;
  /** 가운데에 표시할 내용. 없으면 "N%" */
  children?: React.ReactNode;
  className?: string;
  label?: string;
}

/** 원형 진행 그래프. 트랙은 line 색, 진행선은 구성원 color 에 따른 그래프 선 색. */
export function ProgressRing({
  value,
  color,
  size = 64,
  stroke = 7,
  children,
  className,
  label,
}: ProgressRingProps) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - v / 100);

  return (
    <div
      className={clsx("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(v)}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-ink">
        {children ?? `${Math.round(v)}%`}
      </div>
    </div>
  );
}
