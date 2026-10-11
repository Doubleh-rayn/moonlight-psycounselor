"use client";

/**
 * 화면 진입 조건을 한 곳에서 처리한다.
 *  로그인 전 → /login
 *  가족 없음 → /setup
 *  구성원 미선택 → /profiles
 */
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useFamily } from "@/lib/store/FamilyStore";
import { Button } from "@/components/ui/Button";

const PUBLIC = new Set(["/login"]);

function Splash({ text }: { text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="size-10 animate-pulse rounded-full bg-blue" aria-hidden />
      <p className="text-[14px] font-semibold text-muted">{text}</p>
    </div>
  );
}

export function AppGate({ children }: { children: ReactNode }) {
  const { authStatus, familyStatus, me, meId, snapshot, error, reload, signOut, lockedToMember } = useFamily();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = PUBLIC.has(pathname);
  const isSetup = pathname === "/setup";
  const isProfiles = pathname === "/profiles";

  // 리다이렉트 결정
  let target: string | null = null;
  if (authStatus === "signed_out" && !isPublic) target = "/login";
  else if (authStatus === "signed_in") {
    if (familyStatus === "none" && !isSetup) target = "/setup";
    else if (familyStatus === "ready") {
      if (isPublic || isSetup) target = me ? "/" : "/profiles";
      else if (!me && !isProfiles) target = "/profiles";
      else if (isProfiles && lockedToMember) target = "/";
    }
  }

  useEffect(() => {
    if (target && target !== pathname) router.replace(target);
  }, [target, pathname, router]);

  if (isPublic && authStatus !== "signed_in") return <>{children}</>;
  if (authStatus === "loading") return <Splash text="확인 중…" />;
  if (target && target !== pathname) return <Splash text="이동 중…" />;
  if (isSetup) return <>{children}</>;

  if (familyStatus === "loading" || familyStatus === "unknown") return <Splash text="가족 정보를 불러오는 중…" />;
  if (familyStatus === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[16px] font-bold">데이터를 불러오지 못했습니다</p>
        <p className="text-[13px] text-muted">{error}</p>
        <Button tone="gold" onClick={() => void reload()}>
          다시 시도
        </Button>
        <Button tone="surface" onClick={() => void signOut()}>
          로그아웃
        </Button>
      </div>
    );
  }
  if (!snapshot) return <Splash text="불러오는 중…" />;
  if (!me && !isProfiles) {
    // 저장된 구성원이 비활성화된 경우 등
    if (meId) return <Splash text="구성원을 다시 선택해 주세요" />;
    return <Splash text="이동 중…" />;
  }
  return <>{children}</>;
}
