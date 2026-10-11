"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Map, ChartColumn, Gift, Settings, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import { toneStyle } from "@/lib/design/tokens";

interface Tab {
  href: "/" | "/quest" | "/records" | "/rewards" | "/settings";
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { href: "/", label: "오늘", icon: House },
  { href: "/quest", label: "퀘스트", icon: Map },
  { href: "/records", label: "기록", icon: ChartColumn },
  { href: "/rewards", label: "보상", icon: Gift },
  { href: "/settings", label: "설정", icon: Settings },
];

/**
 * 하단 메뉴: 화면에서 떠 있는 둥근 막대 (radius 26px, 좌우 여백 16px).
 * 활성 탭은 blue 토큰.
 */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주 메뉴"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[480px] px-4 pb-[max(16px,env(safe-area-inset-bottom))]"
    >
      <div
        className="flex items-stretch justify-between rounded-tabbar bg-(--face) raised-card px-2 py-2"
        style={toneStyle("surface")}
      >
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex min-h-[48px] min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] text-[11px] font-bold",
                active ? "bg-(--face) text-(--deep)" : "text-muted",
              )}
              style={active ? toneStyle("blue") : undefined}
            >
              <Icon size={22} strokeWidth={2.2} aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
