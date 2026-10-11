"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Pencil, Plus, LogOut, KeyRound } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { ChipGroup, Field, Select, TextInput } from "@/components/ui/Field";
import { useReadyFamily } from "@/lib/store/FamilyStore";
import { useActions } from "@/lib/store/actions";
import { usePinGate } from "@/components/app/PinGate";
import { useToast } from "@/components/app/Toast";
import { toneStyle } from "@/lib/design/tokens";
import type { MemberColor, MemberRow } from "@/lib/db/types";

const COLORS: { value: MemberColor; label: string }[] = [
  { value: "blue", label: "파랑" }, { value: "peach", label: "살구" }, { value: "mint", label: "민트" }, { value: "lavender", label: "라벤더" }, { value: "pink", label: "분홍" },
];

type Draft = Pick<MemberRow, "display_name" | "role" | "is_minor" | "color" | "birth_year_month" | "sex" | "height_cm" | "active">;

/** 설정: 가족 이름, 구성원 관리, PIN 변경, 계획 만들기, 로그아웃 */
export function SettingsScreen() {
  const { snapshot, me, demo, signOut, setPin, repo, reload, changePassword, user } = useReadyFamily();
  const { run } = useActions();
  const requirePin = usePinGate();
  const toast = useToast();
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [familyName, setFamilyName] = useState(snapshot.family.name);
  const [newPin, setNewPin] = useState("");
  const [newPin2, setNewPin2] = useState("");
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");

  const members = [...snapshot.members].sort((a, b) => a.sort_order - b.sort_order);

  const openEdit = async (m: MemberRow | null) => {
    const ok = await requirePin("구성원 정보 변경에는 관리자 PIN 이 필요합니다");
    if (!ok) return;
    setEditing({
      id: m?.id ?? null,
      draft: m
        ? { display_name: m.display_name, role: m.role, is_minor: m.is_minor, color: m.color, birth_year_month: m.birth_year_month, sex: m.sex, height_cm: m.height_cm, active: m.active }
        : { display_name: "", role: "member", is_minor: true, color: COLORS[members.length % COLORS.length].value, birth_year_month: null, sex: null, height_cm: null, active: true },
    });
  };

  const saveMember = async () => {
    if (!editing) return;
    const d = { ...editing.draft, display_name: editing.draft.display_name.trim() };
    if (!d.display_name) return toast("이름을 입력해 주세요", "error");
    if (editing.id === null && members.filter((m) => m.active).length >= 5) return toast("구성원은 최대 5명입니다", "error");
    if (editing.id) {
      await run("저장", (s) => ({ ...s, members: s.members.map((m) => (m.id === editing.id ? { ...m, ...d } : m)) }), (r) => r.update("members", editing.id!, d)).catch(() => {});
    } else {
      const sort_order = (members.at(-1)?.sort_order ?? -1) + 1;
      await run("추가", (s) => s, (r) => r.insert("members", { ...d, sort_order })).catch(() => {});
    }
    setEditing(null);
    toast("저장했습니다");
  };

  const changePin = async () => {
    if (!/^\d{4}$/.test(newPin)) return toast("PIN 은 숫자 4자리입니다", "error");
    if (newPin !== newPin2) return toast("두 번 입력이 다릅니다", "error");
    const ok = await requirePin("현재 PIN 을 입력해 주세요");
    if (!ok) return;
    try {
      await setPin(newPin);
      toast("PIN 을 바꿨습니다");
      setPinOpen(false);
      setNewPin("");
      setNewPin2("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "변경 실패", "error");
    }
  };

  const savePassword = async () => {
    if (newPw.length < 6) return toast("비밀번호는 6자 이상이어야 합니다", "error");
    if (newPw !== newPw2) return toast("두 번 입력이 다릅니다", "error");
    const ok = await requirePin("계정 비밀번호 변경에는 관리자 PIN 이 필요합니다");
    if (!ok) return;
    try {
      await changePassword(newPw);
      toast("비밀번호를 바꿨습니다");
      setPwOpen(false);
      setNewPw("");
      setNewPw2("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "변경 실패", "error");
    }
  };

  const saveName = async () => {
    const n = familyName.trim();
    if (!n || !repo) return;
    const ok = await requirePin("가족 이름 변경에는 관리자 PIN 이 필요합니다");
    if (!ok) return;
    await repo.updateFamilyName(n).catch((e: Error) => toast(e.message, "error"));
    await reload();
    setNameOpen(false);
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-5">
      <h1 className="text-[28px] font-extrabold">설정</h1>

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-semibold text-muted">가족 이름</p>
          <p className="text-[16px] font-bold">{snapshot.family.name}</p>
        </div>
        <Button tone="panel" onClick={() => setNameOpen(true)} aria-label="가족 이름 변경"><Pencil size={16} strokeWidth={2.2} /></Button>
      </Card>

      {me.role === "admin" && (
        <Link href="/settings/plan" className="block">
          <Card tone="gold" className="flex items-center justify-between">
            <div>
              <p className="text-[16px] font-bold">계획 만들기</p>
              <p className="text-[12px] opacity-80">체중 목표에서 단계별 퀘스트를 자동 생성</p>
            </div>
            <ChevronRight size={22} strokeWidth={2.2} aria-hidden />
          </Card>
        </Link>
      )}

      <Card className="p-0">
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="text-[16px] font-bold">구성원</h2>
          <Button tone="panel" onClick={() => void openEdit(null)} disabled={members.filter((m) => m.active).length >= 5}>
            <Plus size={16} strokeWidth={2.4} aria-hidden /> 추가
          </Button>
        </div>
        <ul className="mt-2 divide-y divide-line">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-(--face) text-[15px] font-extrabold text-(--deep)" style={toneStyle(m.color)}>{m.display_name.slice(0, 1)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold">
                  {m.display_name} {!m.active && <span className="text-[12px] font-semibold text-muted">(비활성)</span>}
                </p>
                <p className="text-[12px] text-muted">
                  {m.role === "admin" ? "관리자" : m.is_minor ? "구성원 · 미성년" : "구성원"}
                  {m.birth_year_month ? ` · ${m.birth_year_month}` : ""}
                  {m.height_cm ? ` · ${m.height_cm}cm` : ""}
                </p>
              </div>
              <Button tone="surface" onClick={() => void openEdit(m)} aria-label={`${m.display_name} 수정`}><Pencil size={16} strokeWidth={2.2} /></Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound size={20} strokeWidth={2.2} aria-hidden />
          <p className="text-[15px] font-bold">관리자 PIN 변경</p>
        </div>
        <Button tone="panel" onClick={() => setPinOpen(true)}>변경</Button>
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-[15px] font-bold">가족 계정 비밀번호</p>
          <p className="text-[12px] text-muted">{user?.email ?? ""}</p>
        </div>
        <Button tone="panel" onClick={() => setPwOpen(true)}>변경</Button>
      </Card>

      <Button tone="surface" block onClick={() => void signOut()}>
        <LogOut size={16} strokeWidth={2.2} aria-hidden /> 로그아웃
      </Button>
      <p className="text-center text-[11px] text-muted">{demo ? "데모 모드 (Supabase 미설정)" : "Supabase 연결됨"} · 가족 퀘스트</p>

      <Sheet open={!!editing} title={editing?.id ? "구성원 수정" : "구성원 추가"} onClose={() => setEditing(null)}>
        {editing && (
          <div className="flex flex-col gap-3">
            <Field label="이름"><TextInput maxLength={20} value={editing.draft.display_name} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, display_name: e.target.value } })} /></Field>
            <div><span className="mb-1.5 block text-[13px] font-bold text-muted">역할</span>
              <ChipGroup ariaLabel="역할" options={[{ value: "admin", label: "관리자(성인)" }, { value: "member", label: "구성원" }]} value={editing.draft.role} onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, role: v, is_minor: v === "admin" ? false : editing.draft.is_minor } })} /></div>
            <div><span className="mb-1.5 block text-[13px] font-bold text-muted">색상</span>
              <ChipGroup ariaLabel="색상" options={COLORS} value={editing.draft.color} onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, color: v } })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="생년월"><TextInput type="month" value={editing.draft.birth_year_month ?? ""} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, birth_year_month: e.target.value || null } })} /></Field>
              <Field label="성별"><Select value={editing.draft.sex ?? ""} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, sex: (e.target.value || null) as Draft["sex"] } })}><option value="">선택 안 함</option><option value="female">여</option><option value="male">남</option></Select></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="키(cm)" hint="(월 1회 갱신 권장)"><TextInput type="number" step="0.1" min={50} max={250} value={editing.draft.height_cm ?? ""} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, height_cm: e.target.value ? Number(e.target.value) : null } })} /></Field>
              <div className="flex flex-col justify-end gap-2">
                {editing.draft.role === "member" && (
                  <label className="flex min-h-[44px] items-center gap-2 text-[14px] font-bold"><input type="checkbox" className="size-5" checked={editing.draft.is_minor} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, is_minor: e.target.checked } })} />만 19세 미만</label>
                )}
                {editing.id && editing.id !== me.id && (
                  <label className="flex min-h-[44px] items-center gap-2 text-[14px] font-bold"><input type="checkbox" className="size-5" checked={editing.draft.active} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, active: e.target.checked } })} />활성</label>
                )}
              </div>
            </div>
            <Button tone="gold" size="lg" block onClick={() => void saveMember()}>저장</Button>
          </div>
        )}
      </Sheet>

      <Sheet open={pinOpen} title="관리자 PIN 변경" onClose={() => setPinOpen(false)}>
        <div className="flex flex-col gap-3">
          <Field label="새 PIN" hint="(숫자 4자리)"><TextInput inputMode="numeric" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} /></Field>
          <Field label="새 PIN 확인"><TextInput inputMode="numeric" maxLength={4} value={newPin2} onChange={(e) => setNewPin2(e.target.value.replace(/\D/g, ""))} /></Field>
          <Button tone="gold" size="lg" block onClick={() => void changePin()}>현재 PIN 확인 후 변경</Button>
        </div>
      </Sheet>

      <Sheet open={pwOpen} title="가족 계정 비밀번호 변경" onClose={() => setPwOpen(false)}>
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-muted">모든 기기에서 같은 계정으로 로그인하므로, 바꾼 뒤 가족에게 알려 주세요.</p>
          <Field label="새 비밀번호" hint="(6자 이상)"><TextInput type="password" autoComplete="new-password" minLength={6} value={newPw} onChange={(e) => setNewPw(e.target.value)} /></Field>
          <Field label="새 비밀번호 확인"><TextInput type="password" autoComplete="new-password" minLength={6} value={newPw2} onChange={(e) => setNewPw2(e.target.value)} /></Field>
          <Button tone="gold" size="lg" block onClick={() => void savePassword()}>관리자 PIN 확인 후 변경</Button>
        </div>
      </Sheet>

      <Sheet open={nameOpen} title="가족 이름" onClose={() => setNameOpen(false)}>
        <Field label="가족 이름"><TextInput maxLength={40} value={familyName} onChange={(e) => setFamilyName(e.target.value)} /></Field>
        <Button tone="gold" size="lg" block className="mt-3" onClick={() => void saveName()}>저장</Button>
      </Sheet>
    </div>
  );
}
