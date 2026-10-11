import { Send } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { MockMember } from "@/lib/mock/today";

interface CheerRowProps {
  members: MockMember[];
  meId: string;
}

/** 응원 보내기. 전송 기능은 6단계에서 연결한다 (1단계: 정적). */
export function CheerRow({ members, meId }: CheerRowProps) {
  const others = members.filter((m) => m.id !== meId).sort((a, b) => a.sort_order - b.sort_order);
  return (
    <Card>
      <h2 className="text-[16px] font-bold">응원 보내기</h2>
      <p className="mt-0.5 text-[13px] text-muted">가족에게 짧은 응원을 보냅니다</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {others.map((m) => (
          <Button key={m.id} tone={m.color} size="md" aria-label={`${m.display_name}에게 응원 보내기`}>
            <Send size={16} strokeWidth={2.2} aria-hidden />
            {m.display_name}
          </Button>
        ))}
      </div>
    </Card>
  );
}
