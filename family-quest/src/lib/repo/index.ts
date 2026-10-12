import { hasSupabaseEnv } from "@/lib/db/client";
import type { FamilyRepo } from "./types";

let instance: FamilyRepo | null = null;

/**
 * 저장소 싱글턴. Supabase 환경 변수가 있으면 SupabaseRepo, 없으면 데모용 MemoryRepo.
 * 브라우저에서만 호출한다.
 */
export async function getRepo(): Promise<FamilyRepo> {
  if (instance) return instance;
  if (hasSupabaseEnv()) {
    const { SupabaseRepo } = await import("./supabase");
    instance = new SupabaseRepo();
  } else {
    const { MemoryRepo } = await import("./memory");
    instance = new MemoryRepo();
  }
  return instance;
}

export function isDemoMode(): boolean {
  return !hasSupabaseEnv();
}

export * from "./types";
