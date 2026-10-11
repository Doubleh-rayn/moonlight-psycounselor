import { TabBar } from "@/components/ui/TabBar";

/** 모바일 기준(390px) 가운데 정렬 컬럼 + 하단 떠 있는 탭바 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto w-full max-w-[480px] flex-1 pb-[112px]">{children}</main>
      <TabBar />
    </>
  );
}
