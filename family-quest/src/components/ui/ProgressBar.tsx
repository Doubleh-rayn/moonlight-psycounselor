import clsx from "clsx";

interface ProgressBarProps {
  /** 0~100 */
  value: number;
  /** 채움 색 (CSS 색상 또는 var()) */
  color: string;
  /** 기준선 위치 % (예: 단계 통과 기준 70). 없으면 표시 안 함 */
  marker?: number;
  height?: number;
  className?: string;
  label?: string;
}

/** 막대 진행 그래프. 트랙은 line 색. 미달성에 빨간색을 쓰지 않는다. */
export function ProgressBar({ value, color, marker, height = 10, className, label }: ProgressBarProps) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className={clsx("relative w-full overflow-visible rounded-full bg-line", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${v}%`, background: color }}
      />
      {marker !== undefined && (
        <div
          aria-hidden
          className="absolute -top-[3px] w-[2px] rounded-full bg-ink/60"
          style={{ left: `calc(${marker}% - 1px)`, height: height + 6 }}
        />
      )}
    </div>
  );
}
