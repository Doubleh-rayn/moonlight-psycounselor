"use client";

/**
 * 관리자 PIN 확인 모달.
 * requirePin() 을 부르면 모달이 열리고, 맞는 PIN 을 입력하면 true, 닫으면 false 로 끝난다.
 * 5회 연속 실패 시 30초 잠금 (화면 쪽 제한).
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Delete } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useFamily } from "@/lib/store/FamilyStore";

type Resolver = (ok: boolean) => void;

const Ctx = createContext<(reason?: string) => Promise<boolean>>(async () => false);

const MAX_FAILS = 5;
const LOCK_MS = 30_000;

export function PinGateProvider({ children }: { children: ReactNode }) {
  const { verifyPin } = useFamily();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fails = useRef(0);
  const lockedUntil = useRef(0);
  const resolver = useRef<Resolver | null>(null);

  const finish = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpen(false);
    setPin("");
    setError(null);
  }, []);

  const requirePin = useCallback((r?: string) => {
    return new Promise<boolean>((resolve) => {
      resolver.current?.(false);
      resolver.current = resolve;
      setReason(r);
      setPin("");
      setError(null);
      setOpen(true);
    });
  }, []);

  const submit = useCallback(
    async (value: string) => {
      if (Date.now() < lockedUntil.current) {
        setError(`잠시 후 다시 시도해 주세요 (${Math.ceil((lockedUntil.current - Date.now()) / 1000)}초)`);
        return;
      }
      setBusy(true);
      try {
        const ok = await verifyPin(value);
        if (ok) {
          fails.current = 0;
          finish(true);
        } else {
          fails.current += 1;
          setPin("");
          if (fails.current >= MAX_FAILS) {
            lockedUntil.current = Date.now() + LOCK_MS;
            fails.current = 0;
            setError("5회 틀렸습니다. 30초 뒤에 다시 시도해 주세요.");
          } else {
            setError("PIN 이 맞지 않습니다");
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "확인하지 못했습니다");
      } finally {
        setBusy(false);
      }
    },
    [verifyPin, finish],
  );

  const press = (d: string) => {
    if (busy) return;
    const next = (pin + d).slice(0, 4);
    setPin(next);
    setError(null);
    if (next.length === 4) void submit(next);
  };

  return (
    <Ctx.Provider value={requirePin}>
      {children}
      <Sheet open={open} title="관리자 PIN" onClose={() => finish(false)}>
        {reason && <p className="text-[14px] font-semibold text-muted">{reason}</p>}
        <div className="mt-4 flex justify-center gap-3" aria-label="입력한 자리 수">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={"size-4 rounded-full " + (i < pin.length ? "bg-blue-deep" : "bg-line")}
              aria-hidden
            />
          ))}
        </div>
        <p className="mt-2 min-h-[20px] text-center text-[13px] font-semibold text-peach-deep" role="alert">
          {error ?? ""}
        </p>
        <div className="mx-auto mt-2 grid max-w-[280px] grid-cols-3 gap-2" role="group" aria-label="숫자 입력">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <Button key={d} tone="panel" size="lg" onClick={() => press(d)} aria-label={d} disabled={busy}>
              {d}
            </Button>
          ))}
          <span />
          <Button tone="panel" size="lg" onClick={() => press("0")} aria-label="0" disabled={busy}>
            0
          </Button>
          <Button tone="surface" size="lg" onClick={() => setPin((p) => p.slice(0, -1))} aria-label="지우기" disabled={busy}>
            <Delete size={20} strokeWidth={2.2} />
          </Button>
        </div>
      </Sheet>
    </Ctx.Provider>
  );
}

export function usePinGate() {
  return useContext(Ctx);
}
