"use client";

import { useRouter } from "next/navigation";
import { useFamily } from "@/lib/store/FamilyStore";
import { toneStyle } from "@/lib/design/tokens";
import { Button } from "@/components/ui/Button";

/** 구성원 선택 (넷플릭스 방식). 선택은 이 기기에 저장된다 */
export default function ProfilesPage() {
  const { snapshot, selectMember, signOut } = useFamily();
  const router = useRouter();
  if (!snapshot) return null;
  const members = snapshot.members.filter((m) => m.active);

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-4 py-8">
      <p className="text-[14px] font-semibold text-muted">{snapshot.family.name}</p>
      <h1 className="text-[28px] font-extrabold">누구인가요?</h1>
      <ul className="mt-6 grid grid-cols-2 gap-4">
        {members.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              className="flex w-full flex-col items-center gap-3 rounded-card bg-(--face) p-5 text-(--deep) raised-card"
              style={toneStyle(m.color)}
              onClick={() => {
                selectMember(m.id);
                router.replace("/");
              }}
            >
              <span className="flex size-16 items-center justify-center rounded-full bg-white/70 text-[24px] font-extrabold">
                {m.display_name.slice(0, 1)}
              </span>
              <span className="text-[16px] font-bold">{m.display_name}</span>
              <span className="text-[12px] font-semibold opacity-80">{m.role === "admin" ? "관리자" : "구성원"}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-8">
        <Button tone="surface" block onClick={() => void signOut()}>
          로그아웃
        </Button>
      </div>
    </main>
  );
}
