"use client";

import { useState } from "react";
import { Send, Heart } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextInput } from "@/components/ui/Field";
import { useReadyFamily } from "@/lib/store/FamilyStore";
import { useActions } from "@/lib/store/actions";
import { useToast } from "@/components/app/Toast";
import type { MemberRow } from "@/lib/db/types";

const PRESETS = ["오늘도 힘내!", "잘하고 있어", "같이 해보자", "멋져!", "조금만 더!"];

/** 응원 보내기 + 오늘 받은 응원 */
export function CheerRow() {
  const { snapshot, me, today, online } = useReadyFamily();
  const { sendCheer } = useActions();
  const toast = useToast();
  const [target, setTarget] = useState<MemberRow | null>(null);
  const [custom, setCustom] = useState("");

  const others = snapshot.members.filter((m) => m.active && m.id !== me.id).sort((a, b) => a.sort_order - b.sort_order);
  const byId = new Map(snapshot.members.map((m) => [m.id, m]));
  const received = snapshot.cheers.filter((c) => c.to_member_id === me.id && c.date === today);

  const send = async (message: string) => {
    if (!target) return;
    const msg = message.trim().slice(0, 60);
    if (!msg) return;
    await sendCheer(target.id, msg).catch(() => {});
    toast(`${target.display_name}에게 응원을 보냈습니다`);
    setTarget(null);
    setCustom("");
  };

  return (
    <Card>
      <h2 className="text-[16px] font-bold">응원</h2>
      {received.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5" aria-label="오늘 받은 응원">
          {received.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-[14px] bg-pink px-3 py-2 text-[14px] font-semibold text-pink-deep">
              <Heart size={16} strokeWidth={2.2} aria-hidden />
              <span className="font-bold">{byId.get(c.from_member_id)?.display_name ?? "가족"}</span> {c.message}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-[13px] text-muted">가족에게 짧은 응원을 보냅니다</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {others.map((m) => (
          <Button key={m.id} tone={m.color} disabled={!online} onClick={() => setTarget(m)} aria-label={`${m.display_name}에게 응원 보내기`}>
            <Send size={16} strokeWidth={2.2} aria-hidden />
            {m.display_name}
          </Button>
        ))}
      </div>

      <Sheet open={!!target} title={`${target?.display_name ?? ""}에게 응원`} onClose={() => setTarget(null)}>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button key={p} tone="panel" onClick={() => void send(p)}>
              {p}
            </Button>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(custom);
          }}
        >
          <TextInput value={custom} maxLength={60} placeholder="직접 입력 (60자)" onChange={(e) => setCustom(e.target.value)} aria-label="응원 문구" />
          <Button type="submit" tone="gold" disabled={!custom.trim()}>
            보내기
          </Button>
        </form>
      </Sheet>
    </Card>
  );
}
