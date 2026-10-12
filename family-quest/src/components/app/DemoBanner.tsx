"use client";

import { useFamily } from "@/lib/store/FamilyStore";

/** 데모 모드·오프라인 안내 띠 */
export function DemoBanner() {
  const { demo, online } = useFamily();
  if (!demo && online) return null;
  return (
    <div className="mx-auto w-full max-w-[480px] px-4 pt-2" role="status">
      {!online && (
        <div className="rounded-[14px] bg-peach px-3 py-2 text-center text-[13px] font-bold text-peach-deep">
          인터넷 연결이 필요합니다. 연결되면 다시 체크할 수 있습니다.
        </div>
      )}
      {demo && (
        <div className="mt-1 rounded-[14px] bg-lavender px-3 py-1.5 text-center text-[12px] font-bold text-lavender-deep">
          데모 모드 · 이 브라우저에만 저장되며 Supabase 설정 후 실제 저장됩니다
        </div>
      )}
    </div>
  );
}
