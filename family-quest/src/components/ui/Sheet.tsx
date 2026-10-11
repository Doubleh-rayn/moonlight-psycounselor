"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

/** 아래에서 올라오는 시트. 모달·확인창·입력창에 공통으로 쓴다 */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div
        className="relative w-full max-w-[480px] rounded-t-[28px] bg-surface px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 sm:rounded-[28px]"
        style={{ boxShadow: "0 -4px 0 var(--color-surface-edge)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="flex size-11 items-center justify-center rounded-full text-muted">
            <X size={22} strokeWidth={2.2} />
          </button>
        </div>
        <div className="mt-3 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
