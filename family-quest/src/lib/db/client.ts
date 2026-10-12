import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export type Db = SupabaseClient<Database>;

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** 환경 변수가 둘 다 있어야 Supabase 모드. 없으면 데모(메모리) 모드로 동작한다. */
export function hasSupabaseEnv(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

let cached: Db | null = null;

/**
 * 브라우저용 Supabase 클라이언트 (싱글턴).
 * 세션은 localStorage 에 저장한다. 서버 컴포넌트에서는 호출하지 않는다.
 */
export function getSupabase(): Db {
  if (!cached) {
    if (!hasSupabaseEnv()) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 설정되지 않았습니다.");
    }
    cached = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return cached;
}
