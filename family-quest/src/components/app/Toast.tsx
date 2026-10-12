"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

interface Toast {
  id: number;
  message: string;
  kind: "info" | "error";
}

const Ctx = createContext<(message: string, kind?: Toast["kind"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const push = useCallback((message: string, kind: Toast["kind"] = "info") => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "rounded-[16px] px-4 py-3 text-[14px] font-bold",
              t.kind === "error" ? "bg-peach text-peach-deep" : "bg-panel text-panel-deep",
            )}
            style={{ boxShadow: `0 3px 0 var(--color-${t.kind === "error" ? "peach" : "panel"}-edge)` }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
