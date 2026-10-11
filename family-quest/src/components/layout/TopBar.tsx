"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, House, CircleHelp } from "lucide-react";
import clsx from "clsx";
import { toneStyle } from "@/lib/design/tokens";

const iconBtn =
  "flex size-11 items-center justify-center rounded-[14px] bg-(--face) text-(--deep) raised-3 disabled:opacity-40 disabled:pointer-events-none";

/**
 * 상단 바. 왼쪽: 뒤로가기·홈, 오른쪽: 이용방법.
 * 첫 화면("/")에서는 뒤로가기·홈을 비활성화한다 (갈 곳이 없음).
 */
export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const atHome = pathname === "/";

  const goBack = () => {
    // 직접 URL 로 들어온 경우 등 이전 기록이 없으면 홈으로
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  };

  return (
    <div className="sticky top-0 z-20 bg-bg/85 px-4 pb-2 pt-[max(10px,env(safe-area-inset-top))] backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2" style={toneStyle("surface")}>
          <button type="button" onClick={goBack} disabled={atHome} aria-label="뒤로가기" className={iconBtn}>
            <ChevronLeft size={24} strokeWidth={2.4} aria-hidden />
          </button>
          <Link
            href="/"
            aria-label="홈"
            aria-disabled={atHome || undefined}
            tabIndex={atHome ? -1 : undefined}
            className={clsx(iconBtn, atHome && "pointer-events-none opacity-40")}
          >
            <House size={22} strokeWidth={2.2} aria-hidden />
          </Link>
        </div>
        <Link
          href="/guide"
          className="flex min-h-[44px] items-center gap-1.5 rounded-[14px] bg-(--face) px-3 text-[14px] font-bold text-(--deep) raised-3"
          style={toneStyle("lavender")}
        >
          <CircleHelp size={18} strokeWidth={2.2} aria-hidden />
          이용방법
        </Link>
      </div>
    </div>
  );
}
