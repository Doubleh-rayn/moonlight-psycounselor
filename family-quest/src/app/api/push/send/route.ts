/**
 * POST /api/push/send  { slot: "morning" | "evening" }
 * 헤더 x-push-secret 이 PUSH_SECRET 과 같아야 한다. Supabase pg_cron 이 하루 두 번 부른다
 * (supabase/cron/push_schedule.sql). 대상·문구는 DB 함수 push_due() 가 정한다.
 */
import { NextResponse } from "next/server";
import { PUSH_SECRET, pushServerReady, secretMatches, sendAll, serverSupabase } from "@/lib/push/server";

export async function POST(req: Request) {
  if (!secretMatches(req.headers.get("x-push-secret"), PUSH_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!pushServerReady()) return NextResponse.json({ error: "push server not configured" }, { status: 503 });

  let slot = "";
  try {
    slot = String(((await req.json()) as { slot?: string }).slot ?? "");
  } catch {
    slot = "";
  }
  if (slot !== "morning" && slot !== "evening") return NextResponse.json({ error: "invalid slot" }, { status: 400 });

  const db = serverSupabase();
  const { data: targets, error } = await db.rpc("push_due", { p_secret: PUSH_SECRET, p_slot: slot });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = await sendAll(targets ?? []);
  if (results.length > 0) {
    const { error: reportError } = await db.rpc("push_report", { p_secret: PUSH_SECRET, p_results: results });
    if (reportError) return NextResponse.json({ error: reportError.message, results }, { status: 500 });
  }
  const count = (s: string) => results.filter((r) => r.status === s).length;
  return NextResponse.json({ slot, targets: results.length, ok: count("ok"), gone: count("gone"), fail: count("fail") });
}
