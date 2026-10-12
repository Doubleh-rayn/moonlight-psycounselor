/**
 * 서버 쪽 발송 (Node 런타임 전용). web-push 로 VAPID 서명 + 암호화해 보낸다.
 * 비밀값은 환경 변수에서만 읽는다: VAPID_PRIVATE_KEY, PUSH_SECRET.
 */
import "server-only";
import { timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import type { Database, PushTarget } from "@/lib/db/types";

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@family-quest.local";
export const PUSH_SECRET = process.env.PUSH_SECRET ?? "";

export function pushServerReady(): boolean {
  return VAPID_PUBLIC_KEY.length > 0 && VAPID_PRIVATE_KEY.length > 0;
}

let configured = false;
function ensureVapid() {
  if (configured) return;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
}

/** 길이가 달라도 시간 차가 나지 않도록 비교 */
export function secretMatches(given: string | null, expected: string): boolean {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** 익명(publishable) 키로 만든 서버용 클라이언트. 세션을 저장하지 않는다 */
export function serverSupabase(accessToken?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) throw new Error("Supabase 환경 변수가 없습니다");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

export type SendStatus = "ok" | "gone" | "fail";

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

/** 한 구독에 보낸다. 404/410 은 만료(gone) → 호출자가 지운다 */
export async function sendOne(target: Pick<PushTarget, "endpoint" | "p256dh" | "auth">, payload: PushPayload): Promise<SendStatus> {
  ensureVapid();
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { TTL: 6 * 3600, urgency: "normal" },
    );
    return "ok";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    return "fail";
  }
}

/** 동시에 너무 많이 보내지 않도록 묶음으로 */
export async function sendAll(targets: PushTarget[], batch = 10): Promise<{ id: string; status: SendStatus }[]> {
  const results: { id: string; status: SendStatus }[] = [];
  for (let i = 0; i < targets.length; i += batch) {
    const slice = targets.slice(i, i + batch);
    const r = await Promise.all(
      slice.map(async (t) => ({ id: t.id, status: await sendOne(t, { title: t.title, body: t.body, url: t.url }) })),
    );
    results.push(...r);
  }
  return results;
}
