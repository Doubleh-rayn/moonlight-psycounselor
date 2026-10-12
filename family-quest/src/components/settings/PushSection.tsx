"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useReadyFamily } from "@/lib/store/FamilyStore";
import { useToast } from "@/components/app/Toast";
import { currentPushSubscription, pushSupport, subscribePush, subscriptionKeys, type PushSupport } from "@/lib/push/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

type State =
  | { kind: "loading" }
  | { kind: "unavailable"; reason: string }
  | { kind: "off"; support: PushSupport }
  | { kind: "on"; endpoint: string };

/**
 * 설정 > 알림. 이 기기(브라우저)를 현재 구성원의 알림 대상으로 등록/해제한다.
 * 발송 시각은 서버 일정(아침 8시·저녁 8시, 한국 시간)으로 고정 (supabase/cron/push_schedule.sql).
 */
export function PushSection() {
  const { me, demo, repo } = useReadyFamily();
  const toast = useToast();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (demo || !repo) return { kind: "unavailable", reason: "데모 모드에서는 알림을 보낼 수 없습니다" } as State;
      if (!VAPID_PUBLIC_KEY) return { kind: "unavailable", reason: "알림 서버 키가 설정되지 않았습니다" } as State;
      const support = pushSupport();
      if (support === "unsupported" || support === "needs_install") return { kind: "off", support } as State;
      const sub = await currentPushSubscription().catch(() => null);
      if (!sub) return { kind: "off", support } as State;
      const row = await repo.getPushSubscription(sub.endpoint).catch(() => null);
      if (row && row.member_id === me.id) return { kind: "on", endpoint: sub.endpoint } as State;
      return { kind: "off", support } as State;
    };
    void load().then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, [demo, repo, me.id]);

  const turnOn = async () => {
    if (!repo) return;
    setBusy(true);
    try {
      const sub = await subscribePush(VAPID_PUBLIC_KEY);
      const keys = subscriptionKeys(sub);
      await repo.savePushSubscription({ member_id: me.id, ...keys, user_agent: navigator.userAgent });
      setState({ kind: "on", endpoint: keys.endpoint });
      toast("이 기기에 알림을 켰습니다");
    } catch (e) {
      toast(e instanceof Error ? e.message : "알림을 켜지 못했습니다", "error");
      setState({ kind: "off", support: pushSupport() });
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    if (!repo || state.kind !== "on") return;
    setBusy(true);
    try {
      await repo.deletePushSubscription(state.endpoint);
      const sub = await currentPushSubscription().catch(() => null);
      if (sub) await sub.unsubscribe().catch(() => false);
      setState({ kind: "off", support: pushSupport() });
      toast("알림을 껐습니다");
    } catch (e) {
      toast(e instanceof Error ? e.message : "알림을 끄지 못했습니다", "error");
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    if (!repo || state.kind !== "on") return;
    setBusy(true);
    try {
      const token = await repo.getAccessToken();
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ endpoint: state.endpoint }),
      });
      const json = (await res.json().catch(() => ({}))) as { sent?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? `서버 오류 (${res.status})`);
      toast(json.sent ? "테스트 알림을 보냈습니다. 잠시 뒤 알림을 확인해 주세요" : "보낼 구독이 없습니다", json.sent ? "info" : "error");
    } catch (e) {
      toast(e instanceof Error ? e.message : "테스트 알림을 보내지 못했습니다", "error");
    } finally {
      setBusy(false);
    }
  };

  const on = state.kind === "on";
  const help =
    state.kind === "unavailable"
      ? state.reason
      : state.kind === "off" && state.support === "needs_install"
        ? "iPhone 은 공유 → 홈 화면에 추가로 설치한 뒤 켤 수 있습니다"
        : state.kind === "off" && state.support === "unsupported"
          ? "이 브라우저는 푸시 알림을 지원하지 않습니다"
          : state.kind === "off" && state.support === "denied"
            ? "브라우저 설정에서 이 사이트의 알림을 허용한 뒤 다시 켜 주세요"
            : "매일 아침 8시·저녁 8시(한국 시간)에 오늘 퀘스트를 알려드려요";
  const canToggle = state.kind === "on" || (state.kind === "off" && state.support === "ok");

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {on ? <Bell size={20} strokeWidth={2.2} aria-hidden /> : <BellOff size={20} strokeWidth={2.2} aria-hidden />}
          <div className="min-w-0">
            <p className="text-[15px] font-bold">퀘스트 알림 (이 기기)</p>
            <p className="text-[12px] text-muted">{state.kind === "loading" ? "확인 중…" : help}</p>
          </div>
        </div>
        <Button
          tone={on ? "surface" : "panel"}
          disabled={busy || !canToggle}
          onClick={() => void (on ? turnOff() : turnOn())}
          aria-pressed={on}
        >
          {on ? "끄기" : "켜기"}
        </Button>
      </div>
      {on && (
        <Button tone="surface" block disabled={busy} onClick={() => void sendTest()}>
          <Send size={16} strokeWidth={2.2} aria-hidden /> 테스트 알림 보내기
        </Button>
      )}
    </Card>
  );
}
