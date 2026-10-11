import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

const base =
  "w-full min-h-[48px] rounded-[16px] border-2 border-line bg-surface px-4 text-[16px] font-semibold text-ink outline-none placeholder:font-medium placeholder:text-muted/70 focus:border-blue-edge";

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="mb-1.5 block text-[13px] font-bold text-muted">
      {children}
      {hint && <span className="ml-1 font-medium">{hint}</span>}
    </span>
  );
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(base, className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(base, "appearance-none", className)} {...rest}>
      {children}
    </select>
  );
}

export function Field({ label, hint, children, error }: { label: string; hint?: string; children: ReactNode; error?: string }) {
  return (
    <label className="block">
      <Label hint={hint}>{label}</Label>
      {children}
      {error && <span className="mt-1 block text-[13px] font-semibold text-peach-deep">{error}</span>}
    </label>
  );
}

/** 선택지 버튼 묶음 (요일, 분류 등). 선택 상태는 blue 톤 */
export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  multiple = false,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T | T[] | null;
  onChange: (v: T) => void;
  multiple?: boolean;
  ariaLabel?: string;
}) {
  const selected = new Set<T>(Array.isArray(value) ? value : value === null ? [] : [value]);
  return (
    <div className="flex flex-wrap gap-2" role={multiple ? "group" : "radiogroup"} aria-label={ariaLabel}>
      {options.map((o) => {
        const on = selected.has(o.value);
        return (
          <button
            key={String(o.value)}
            type="button"
            role={multiple ? "checkbox" : "radio"}
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={clsx(
              "min-h-[40px] rounded-full border-2 px-3.5 text-[14px] font-bold",
              on ? "border-blue-edge bg-blue text-blue-deep" : "border-line bg-surface text-muted",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
