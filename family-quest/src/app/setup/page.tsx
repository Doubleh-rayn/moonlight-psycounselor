"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChipGroup, Field, Select, TextInput } from "@/components/ui/Field";
import { useFamily } from "@/lib/store/FamilyStore";
import type { NewMemberInput } from "@/lib/repo";
import type { MemberColor } from "@/lib/db/types";
import { Plus, Trash2 } from "lucide-react";

const COLORS: { value: MemberColor; label: string }[] = [
  { value: "blue", label: "파랑" },
  { value: "peach", label: "살구" },
  { value: "mint", label: "민트" },
  { value: "lavender", label: "라벤더" },
  { value: "pink", label: "분홍" },
];

function emptyMember(i: number): NewMemberInput {
  return {
    display_name: "",
    role: i === 0 ? "admin" : "member",
    is_minor: false,
    color: COLORS[i % COLORS.length].value,
    birth_year_month: null,
    sex: null,
    height_cm: null,
  };
}

/** 최초 가족 생성: 이름, 관리자 PIN, 구성원 2~5명 */
export default function SetupPage() {
  const { createFamily, signOut } = useFamily();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [members, setMembers] = useState<NewMemberInput[]>([emptyMember(0), emptyMember(1)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (i: number, p: Partial<NewMemberInput>) =>
    setMembers((ms) => ms.map((m, j) => (j === i ? { ...m, ...p } : m)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}$/.test(pin)) return setError("PIN 은 숫자 4자리입니다");
    if (pin !== pin2) return setError("PIN 두 번 입력이 다릅니다");
    if (members.some((m) => !m.display_name.trim())) return setError("구성원 이름을 모두 입력해 주세요");
    if (!members.some((m) => m.role === "admin")) return setError("관리자(성인)가 한 명 이상 필요합니다");
    setBusy(true);
    try {
      await createFamily({ name: name.trim(), pin, members: members.map((m) => ({ ...m, display_name: m.display_name.trim() })) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "가족을 만들지 못했습니다");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-4 py-6">
      <h1 className="text-[28px] font-extrabold">가족 만들기</h1>
      <p className="mt-1 text-[14px] text-muted">처음 한 번만 설정합니다. 구성원과 PIN 은 나중에 설정에서 바꿀 수 있습니다.</p>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <Field label="가족 이름">
            <TextInput required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 우리 가족" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="관리자 PIN" hint="(숫자 4자리)">
              <TextInput inputMode="numeric" pattern="\d{4}" maxLength={4} required value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field label="PIN 확인">
              <TextInput inputMode="numeric" pattern="\d{4}" maxLength={4} required value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} />
            </Field>
          </div>
          <p className="text-[12px] text-muted">PIN 은 승인, 보상 지급, 설정 변경, 다른 구성원 기록 수정에 쓰입니다. 자녀에게 알려주지 않습니다.</p>
        </Card>

        {members.map((m, i) => (
          <Card key={i} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-bold">구성원 {i + 1}</h2>
              {members.length > 2 && (
                <button type="button" aria-label="구성원 삭제" className="flex size-11 items-center justify-center text-muted" onClick={() => setMembers((ms) => ms.filter((_, j) => j !== i))}>
                  <Trash2 size={20} strokeWidth={2.2} />
                </button>
              )}
            </div>
            <Field label="이름">
              <TextInput required maxLength={20} value={m.display_name} onChange={(e) => patch(i, { display_name: e.target.value })} />
            </Field>
            <div>
              <span className="mb-1.5 block text-[13px] font-bold text-muted">역할</span>
              <ChipGroup
                ariaLabel="역할"
                options={[
                  { value: "admin", label: "관리자(성인)" },
                  { value: "member", label: "구성원" },
                ]}
                value={m.role}
                onChange={(v) => patch(i, { role: v, is_minor: v === "admin" ? false : m.is_minor })}
              />
            </div>
            <div>
              <span className="mb-1.5 block text-[13px] font-bold text-muted">색상</span>
              <ChipGroup ariaLabel="색상" options={COLORS} value={m.color} onChange={(v) => patch(i, { color: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="생년월" hint="(선택)">
                <TextInput type="month" value={m.birth_year_month ?? ""} onChange={(e) => patch(i, { birth_year_month: e.target.value || null })} />
              </Field>
              <Field label="성별" hint="(선택)">
                <Select value={m.sex ?? ""} onChange={(e) => patch(i, { sex: (e.target.value || null) as NewMemberInput["sex"] })}>
                  <option value="">선택 안 함</option>
                  <option value="female">여</option>
                  <option value="male">남</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="키(cm)" hint="(선택)">
                <TextInput type="number" inputMode="decimal" step="0.1" min={50} max={250} value={m.height_cm ?? ""} onChange={(e) => patch(i, { height_cm: e.target.value ? Number(e.target.value) : null })} />
              </Field>
              {m.role === "member" && (
                <label className="flex min-h-[48px] items-center gap-2 self-end text-[14px] font-bold">
                  <input type="checkbox" className="size-5" checked={m.is_minor} onChange={(e) => patch(i, { is_minor: e.target.checked })} />
                  만 19세 미만
                </label>
              )}
            </div>
          </Card>
        ))}

        {members.length < 5 && (
          <Button tone="panel" block onClick={() => setMembers((ms) => [...ms, emptyMember(ms.length)])}>
            <Plus size={18} strokeWidth={2.4} /> 구성원 추가
          </Button>
        )}

        {error && (
          <p role="alert" className="text-[13px] font-semibold text-peach-deep">
            {error}
          </p>
        )}
        <Button type="submit" tone="gold" size="lg" block disabled={busy}>
          가족 만들기
        </Button>
        <button type="button" className="min-h-[44px] text-[14px] font-bold text-muted" onClick={() => void signOut()}>
          다른 계정으로 로그인
        </button>
      </form>
    </main>
  );
}
