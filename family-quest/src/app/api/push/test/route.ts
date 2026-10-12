/**
 * POST /api/push/test  { endpoint?: string }
 * 로그인한 사용자가 자기 기기로 테스트 알림을 보낸다.
 * Authorization: Bearer <Supabase access token>. 구독 행은 RLS(user_id = auth.uid()) 로 본인 것만 보인다.
 */
import { NextResponse } from "next/server";
import { pushServerReady, sendOne, serverSupabase } from "@/lib/push/server";


export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!pushServerReady()) return NextResponse.json({ error: "push server not configured" }, { status: 503 });

  let endpoint: string | null = null;
  try {
    endpoint = ((await req.json()) as { endpoint?: string }).endpoint ?? null;
  } catch {
    endpoint = null;
  }

  const db = serverSupabase(token);
  let q = db.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (endpoint) q = q.eq("endpoint", endpoint);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 401 });
  if (!data || data.length === 0) return NextResponse.json({ error: "no subscription" }, { status: 404 });

  const results = await Promise.all(
    data.map(async (s) => ({
      id: s.id,
      status: await sendOne(s, { title: "가족 퀘스트", body: "테스트 알림입니다. 이렇게 아침·저녁에 알려드려요!", url: "/", tag: "family-quest-test" }),
    })),
  );
  const gone = results.filter((r) => r.status === "gone").map((r) => r.id);
  if (gone.length) await db.from("push_subscriptions").delete().in("id", gone);
  return NextResponse.json({ sent: results.filter((r) => r.status === "ok").length, gone: gone.length, fail: results.filter((r) => r.status === "fail").length });
}
