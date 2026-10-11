"use client";

import { useState } from "react";
import { Star, Users, Plus, Gift } from "lucide-react";
import clsx from "clsx";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Sheet } from "@/components/ui/Sheet";
import { ChipGroup, Field, TextInput } from "@/components/ui/Field";
import { useReadyFamily } from "@/lib/store/FamilyStore";
import { useActions } from "@/lib/store/actions";
import { usePinGate } from "@/components/app/PinGate";
import { useToast } from "@/components/app/Toast";
import { toneStyle } from "@/lib/design/tokens";
import type { RedemptionRow, RewardRow, RewardScope } from "@/lib/db/types";

const STATUS_LABEL: Record<RedemptionRow["status"], string> = {
  requested: "승인 대기",
  approved: "승인됨 · 지급 대기",
  fulfilled: "지급 완료",
  rejected: "거절됨",
};

/** 보상 화면: 잔액, 보상 목록(필요 스티커, 진행 막대, 교환 신청), 신청→승인→지급 흐름, 보상 제안 */
export function RewardsScreen() {
  const { snapshot, me, online } = useReadyFamily();
  const { run } = useActions();
  const requirePin = usePinGate();
  const toast = useToast();
  const [adding, setAdding] = useState(false);

  const myBalance = snapshot.memberBalances.find((b) => b.member_id === me.id)?.balance ?? 0;
  const familyBalance = snapshot.familyBalance?.balance ?? 0;
  const byMember = new Map(snapshot.members.map((m) => [m.id, m]));
  const byReward = new Map(snapshot.rewards.map((r) => [r.id, r]));
  const isAdmin = me.role === "admin";

  const rewards = snapshot.rewards.filter((r) => r.active && r.status === "approved");
  const proposals = snapshot.rewards.filter((r) => r.active && r.status === "proposed");
  const openRequests = snapshot.redemptions.filter((r) => r.status === "requested" || r.status === "approved");
  const myHistory = snapshot.redemptions.filter((r) => r.member_id === me.id).slice(0, 10);

  const hasOpen = (r: RewardRow) => openRequests.some((x) => x.reward_id === r.id && (r.scope === "family" || x.member_id === me.id));

  const request = async (r: RewardRow) => {
    const now = new Date().toISOString();
    await run<RedemptionRow>(
      "교환 신청",
      (s) => ({
        ...s,
        redemptions: [{ id: `tmp-${Date.now()}`, family_id: s.family.id, reward_id: r.id, member_id: me.id, status: "requested", requested_at: now, approved_at: null, fulfilled_at: null }, ...s.redemptions],
      }),
      (repo) => repo.insert("redemptions", { reward_id: r.id, member_id: me.id }),
    ).catch(() => {});
    toast("교환을 신청했습니다. 관리자 승인 후 스티커가 차감됩니다.");
  };

  const setStatus = async (red: RedemptionRow, status: RedemptionRow["status"]) => {
    const reason = status === "approved" ? "승인하면 스티커가 차감됩니다" : status === "fulfilled" ? "실제로 지급한 뒤 완료 처리합니다" : "신청을 거절합니다";
    const ok = await requirePin(`${reason}. 관리자 PIN 을 입력해 주세요.`);
    if (!ok) return;
    const reward = byReward.get(red.reward_id);
    if (status === "approved" && reward) {
      const bal = reward.scope === "family" ? familyBalance : (snapshot.memberBalances.find((b) => b.member_id === red.member_id)?.balance ?? 0);
      if (bal < reward.cost) return toast(`스티커가 부족합니다 (${bal}/${reward.cost})`, "error");
    }
    const now = new Date().toISOString();
    const patch: Partial<RedemptionRow> = { status, ...(status === "approved" ? { approved_at: now } : status === "fulfilled" ? { fulfilled_at: now } : {}) };
    await run(
      "처리",
      (s) => ({ ...s, redemptions: s.redemptions.map((x) => (x.id === red.id ? { ...x, ...patch } : x)) }),
      (repo) => repo.update("redemptions", red.id, patch),
    ).catch(() => {});
    toast(status === "approved" ? "승인했습니다. 스티커를 차감했습니다." : status === "fulfilled" ? "지급 완료로 표시했습니다." : "거절했습니다.");
  };

  const decideProposal = async (r: RewardRow, approve: boolean) => {
    const ok = await requirePin("보상 제안 처리에는 관리자 PIN 이 필요합니다");
    if (!ok) return;
    const patch: Partial<RewardRow> = approve ? { status: "approved" } : { active: false };
    await run("처리", (s) => ({ ...s, rewards: s.rewards.map((x) => (x.id === r.id ? { ...x, ...patch } : x)) }), (repo) => repo.update("rewards", r.id, patch)).catch(() => {});
  };

  const retire = async (r: RewardRow) => {
    const ok = await requirePin("보상 삭제(숨김)에는 관리자 PIN 이 필요합니다");
    if (!ok) return;
    await run("삭제", (s) => ({ ...s, rewards: s.rewards.map((x) => (x.id === r.id ? { ...x, active: false } : x)) }), (repo) => repo.update("rewards", r.id, { active: false })).catch(() => {});
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-5">
      <h1 className="text-[28px] font-extrabold">보상</h1>

      <div className="grid grid-cols-2 gap-3">
        <Card tone="gold" className="flex items-center gap-3">
          <Star size={26} strokeWidth={2.2} aria-hidden />
          <div>
            <p className="text-[12px] font-semibold opacity-80">내 스티커</p>
            <p className="text-[24px] font-extrabold leading-tight">{myBalance}</p>
          </div>
        </Card>
        <Card tone="pink" className="flex items-center gap-3">
          <Users size={26} strokeWidth={2.2} aria-hidden />
          <div>
            <p className="text-[12px] font-semibold opacity-80">가족 스티커</p>
            <p className="text-[24px] font-extrabold leading-tight">{familyBalance}</p>
          </div>
        </Card>
      </div>

      {openRequests.length > 0 && (
        <Card tone="lavender">
          <h2 className="text-[16px] font-bold">교환 신청</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {openRequests.map((red) => {
              const r = byReward.get(red.reward_id);
              return (
                <li key={red.id} className="flex flex-wrap items-center gap-2 rounded-[16px] bg-white/60 p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold">{r?.title ?? "보상"}</p>
                    <p className="text-[12px] opacity-80">
                      {byMember.get(red.member_id)?.display_name} · {r?.cost}개 · {STATUS_LABEL[red.status]}
                    </p>
                  </div>
                  {isAdmin && red.status === "requested" && (
                    <>
                      <Button tone="surface" onClick={() => void setStatus(red, "rejected")} aria-label={`${r?.title} 거절`}>거절</Button>
                      <Button tone="gold" onClick={() => void setStatus(red, "approved")} aria-label={`${r?.title} 승인`}>승인</Button>
                    </>
                  )}
                  {isAdmin && red.status === "approved" && (
                    <Button tone="mint" onClick={() => void setStatus(red, "fulfilled")} aria-label={`${r?.title} 지급 완료`}>지급 완료</Button>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <RewardSection scope="personal" list={rewards.filter((r) => r.scope === "personal")} balance={myBalance} hasOpen={hasOpen} online={online} isAdmin={isAdmin} onRequest={request} onRetire={retire} />
      <RewardSection scope="family" list={rewards.filter((r) => r.scope === "family")} balance={familyBalance} hasOpen={hasOpen} online={online} isAdmin={isAdmin} onRequest={request} onRetire={retire} />

      {rewards.length === 0 && (
        <Card>
          <p className="text-center text-[14px] font-semibold text-muted">아직 보상이 없습니다. 아래에서 보상을 제안해 보세요.</p>
        </Card>
      )}

      {proposals.length > 0 && (
        <Card tone="panel">
          <h2 className="text-[16px] font-bold">제안된 보상 {isAdmin ? "" : "(승인 대기)"}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {proposals.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-[16px] bg-white/60 p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold">{r.title}</p>
                  <p className="text-[12px] text-muted">
                    {r.scope === "family" ? "가족" : "개인"} · {r.cost}개 · {byMember.get(r.proposed_by_member_id ?? "")?.display_name ?? ""} 제안
                  </p>
                </div>
                {isAdmin && (
                  <>
                    <Button tone="surface" onClick={() => void decideProposal(r, false)}>거절</Button>
                    <Button tone="gold" onClick={() => void decideProposal(r, true)}>승인</Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Button tone="gold" size="lg" block onClick={() => setAdding(true)}>
        <Plus size={18} strokeWidth={2.4} aria-hidden /> 보상 {isAdmin ? "추가" : "제안"}
      </Button>

      {myHistory.length > 0 && (
        <Card>
          <h2 className="text-[16px] font-bold">내 교환 내역</h2>
          <ul className="mt-2 divide-y divide-line">
            {myHistory.map((red) => (
              <li key={red.id} className="flex items-center justify-between py-2 text-[13px]">
                <span className="font-semibold">{byReward.get(red.reward_id)?.title}</span>
                <span className={clsx("font-bold", red.status === "rejected" ? "text-muted" : "text-ink")}>{STATUS_LABEL[red.status]}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <AddRewardSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function RewardSection({ scope, list, balance, hasOpen, online, isAdmin, onRequest, onRetire }: {
  scope: RewardScope;
  list: RewardRow[];
  balance: number;
  hasOpen: (r: RewardRow) => boolean;
  online: boolean;
  isAdmin: boolean;
  onRequest: (r: RewardRow) => Promise<void>;
  onRetire: (r: RewardRow) => Promise<void>;
}) {
  if (list.length === 0) return null;
  return (
    <Card className="p-0">
      <h2 className="px-4 pt-4 text-[16px] font-bold">{scope === "family" ? "가족 보상" : "내 보상"}</h2>
      <ul className="mt-2 divide-y divide-line">
        {list.map((r) => {
          const pct = Math.min(100, Math.round((balance / r.cost) * 100));
          const open = hasOpen(r);
          const can = balance >= r.cost && !open && online;
          return (
            <li key={r.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-tile bg-(--face) text-(--deep) raised-4" style={toneStyle(scope === "family" ? "pink" : "gold")}>
                  {scope === "family" ? <Users size={22} strokeWidth={2.2} aria-hidden /> : <Gift size={22} strokeWidth={2.2} aria-hidden />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{r.title}</p>
                  <p className="text-[12px] text-muted">
                    스티커 {r.cost}개 · 모은 스티커 {Math.min(balance, r.cost)}/{r.cost}
                  </p>
                  <ProgressBar className="mt-1.5" value={pct} color={scope === "family" ? "var(--color-graph-pink)" : "var(--color-gold-edge)"} height={6} label={`${r.title} 진행 ${pct}%`} />
                </div>
                <Button tone={can ? "gold" : "surface"} disabled={!can} onClick={() => void onRequest(r)} aria-label={`${r.title} 교환 신청`}>
                  {open ? "신청됨" : "교환 신청"}
                </Button>
              </div>
              {isAdmin && (
                <button type="button" className="mt-1 min-h-[32px] text-[12px] font-bold text-muted" onClick={() => void onRetire(r)}>
                  목록에서 숨기기
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function AddRewardSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { me } = useReadyFamily();
  const { run } = useActions();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("10");
  const [scope, setScope] = useState<RewardScope>("personal");
  const isAdmin = me.role === "admin";

  const save = async () => {
    const t = title.trim();
    const c = Number(cost);
    if (!t) return toast("보상 이름을 입력해 주세요", "error");
    if (!(c >= 1 && c <= 999)) return toast("필요 스티커는 1~999 사이입니다", "error");
    const status: RewardRow["status"] = isAdmin ? "approved" : "proposed";
    const now = new Date().toISOString();
    await run<RewardRow>(
      "보상 추가",
      (s) => ({ ...s, rewards: [...s.rewards, { id: `tmp-${Date.now()}`, family_id: s.family.id, title: t, cost: c, scope, status, proposed_by_member_id: me.id, active: true, created_at: now }] }),
      (repo) => repo.insert("rewards", { title: t, cost: c, scope, status, proposed_by_member_id: me.id }),
    ).catch(() => {});
    toast(isAdmin ? "보상을 추가했습니다" : "제안했습니다. 관리자 승인 후 목록에 나타납니다.");
    setTitle("");
    setCost("10");
    onClose();
  };

  return (
    <Sheet open={open} title={isAdmin ? "보상 추가" : "보상 제안"} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <p className="rounded-[14px] bg-mint px-3 py-2 text-[13px] font-semibold text-mint-deep">음식은 보상으로 넣지 않기를 권장합니다. 함께 하는 활동이나 경험을 보상으로 정해 보세요.</p>
        <Field label="보상 이름">
          <TextInput maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 주말 영화 고르기" />
        </Field>
        <Field label="필요 스티커">
          <TextInput type="number" inputMode="numeric" min={1} max={999} value={cost} onChange={(e) => setCost(e.target.value)} />
        </Field>
        <div>
          <span className="mb-1.5 block text-[13px] font-bold text-muted">누구의 스티커로</span>
          <ChipGroup ariaLabel="범위" options={[{ value: "personal", label: "개인 스티커" }, { value: "family", label: "가족 스티커" }]} value={scope} onChange={setScope} />
        </div>
        <Button tone="gold" size="lg" block onClick={() => void save()}>
          {isAdmin ? "추가" : "제안하기"}
        </Button>
      </div>
    </Sheet>
  );
}
