"use client";

import { Button } from "@/components/ui/Button";

/** 화면 오류 경계 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-[18px] font-extrabold">문제가 생겼습니다</p>
      <p className="text-[13px] text-muted">{error.message || "화면을 표시하지 못했습니다."}</p>
      <Button tone="gold" onClick={reset}>
        다시 시도
      </Button>
    </main>
  );
}
