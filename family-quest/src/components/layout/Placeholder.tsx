import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";

/** 아직 구현 전인 화면의 자리 표시. 해당 단계에서 교체한다. */
export function Placeholder({ title, stage }: { title: string; stage: number }) {
  return (
    <AppShell>
      <div className="px-4 pt-6">
        <h1 className="text-[28px] font-extrabold">{title}</h1>
        <Card className="mt-4">
          <p className="text-[16px] font-semibold">{stage}단계에서 구현 예정입니다.</p>
        </Card>
      </div>
    </AppShell>
  );
}
