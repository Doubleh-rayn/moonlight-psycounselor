/**
 * Supabase 저장소 — 실서비스.
 * 모든 쓰기에 family_id 를 넣고, 읽기는 RLS 가 가족 범위로 제한한다.
 */
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, type Db } from "@/lib/db/client";
import type { CheckinRow, FamilyRow, RealtimeTable, StickerBonusRow, WeightLogRow } from "@/lib/db/types";
import { REALTIME_TABLES } from "@/lib/db/types";
import { todayKey } from "@/lib/date";
import {
  RepoError,
  type AuthUser,
  type FamilyRepo,
  type FamilySnapshot,
  type InsertInput,
  type NewMemberInput,
  type Row,
  type TableName,
} from "./types";

function toRepoError(e: unknown, fallback = "요청을 처리하지 못했습니다"): RepoError {
  if (e instanceof RepoError) return e;
  const msg = (e as { message?: string })?.message ?? fallback;
  if (/fetch|network|Failed to fetch/i.test(msg)) return new RepoError("인터넷 연결이 필요합니다", "network");
  if (/duplicate|unique/i.test(msg)) return new RepoError("이미 있는 항목입니다", "conflict");
  return new RepoError(msg, "unknown");
}

export class SupabaseRepo implements FamilyRepo {
  readonly mode = "supabase" as const;
  private db: Db;
  private familyId: string | null = null;

  constructor(db: Db = getSupabase()) {
    this.db = db;
  }

  // 제네릭 테이블 이름으로 .from() 을 부르면 타입이 맞지 않아 이 한 곳에서만 느슨하게 다룬다.
  private table(name: TableName) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.db.from(name as any) as any;
  }

  private async requireFamilyId(): Promise<string> {
    if (this.familyId) return this.familyId;
    const f = await this.getFamily();
    if (!f) throw new RepoError("가족이 없습니다", "not_found");
    return f.id;
  }

  // ---------------------------------------------------------------- 인증

  async getUser(): Promise<AuthUser | null> {
    const { data } = await this.db.auth.getSession();
    const u = data.session?.user;
    return u ? { id: u.id, email: u.email ?? null } : null;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.db.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new RepoError("이메일 또는 비밀번호가 맞지 않습니다", "auth");
  }

  async signUp(email: string, password: string): Promise<{ needsEmailConfirm: boolean }> {
    const { data, error } = await this.db.auth.signUp({ email: email.trim(), password });
    if (error) throw toRepoError(error);
    return { needsEmailConfirm: !data.session };
  }

  async signOut(): Promise<void> {
    await this.db.auth.signOut();
    this.familyId = null;
  }

  async changePassword(newPassword: string): Promise<void> {
    const { error } = await this.db.auth.updateUser({ password: newPassword });
    if (error) throw toRepoError(error, "비밀번호를 바꾸지 못했습니다");
  }

  onAuthChange(cb: (user: AuthUser | null) => void): () => void {
    const { data } = this.db.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      if (!u) this.familyId = null;
      cb(u ? { id: u.id, email: u.email ?? null } : null);
    });
    return () => data.subscription.unsubscribe();
  }

  // ---------------------------------------------------------------- 가족

  async getFamily(): Promise<FamilyRow | null> {
    const { data, error } = await this.db.from("families").select("*").maybeSingle();
    if (error) throw toRepoError(error);
    this.familyId = data?.id ?? null;
    return data;
  }

  async createFamily(input: { name: string; pin: string; members: NewMemberInput[] }): Promise<string> {
    const { data, error } = await this.db.rpc("create_family", {
      family_name: input.name,
      pin: input.pin,
      members_json: input.members,
    });
    if (error) throw toRepoError(error);
    this.familyId = data;
    return data;
  }

  async updateFamilyName(name: string): Promise<void> {
    const fid = await this.requireFamilyId();
    const { error } = await this.db.from("families").update({ name }).eq("id", fid);
    if (error) throw toRepoError(error);
  }

  async verifyPin(pin: string): Promise<boolean> {
    const { data, error } = await this.db.rpc("verify_admin_pin", { pin });
    if (error) throw toRepoError(error);
    return data === true;
  }

  async setPin(pin: string): Promise<void> {
    const { error } = await this.db.rpc("set_admin_pin", { pin });
    if (error) throw toRepoError(error);
  }

  // ---------------------------------------------------------------- 조회

  async loadSnapshot(checkinsFrom: string): Promise<FamilySnapshot> {
    const fid = await this.requireFamilyId();
    const today = todayKey();
    const q = <T>(p: PromiseLike<{ data: T | null; error: unknown }>) =>
      Promise.resolve(p).then(({ data, error }) => {
        if (error) throw toRepoError(error);
        return data as T;
      });

    const [family, members, goals, checkins, rewards, redemptions, plans, planWeeks, weightLogs, cheers, bonuses, memberBalances, familyBalance] =
      await Promise.all([
        q(this.db.from("families").select("*").eq("id", fid).single()),
        q(this.db.from("members").select("*").order("sort_order")),
        q(this.db.from("quests").select("*").order("created_at")),
        q(this.db.from("checkins").select("*").gte("date", checkinsFrom).lte("date", today)),
        q(this.db.from("rewards").select("*").order("created_at")),
        q(this.db.from("redemptions").select("*").order("requested_at", { ascending: false })),
        q(this.db.from("plans").select("*").order("created_at")),
        q(this.db.from("plan_weeks").select("*").order("week_no")),
        q(this.db.from("weight_logs").select("*").order("date")),
        q(this.db.from("cheers").select("*").gte("date", checkinsFrom).order("created_at", { ascending: false })),
        q(this.db.from("sticker_bonuses").select("*")),
        q(this.db.from("member_sticker_balances").select("*")),
        q(this.db.from("family_sticker_balances").select("*").maybeSingle()),
      ]);

    if (!family) throw new RepoError("가족이 없습니다", "not_found");

    return {
      family: family as FamilyRow,
      members,
      goals,
      checkins,
      checkinsFrom,
      rewards,
      redemptions,
      plans,
      planWeeks,
      weightLogs,
      cheers,
      bonuses,
      memberBalances,
      familyBalance,
    };
  }

  // ---------------------------------------------------------------- 변경

  async insert<T extends TableName>(table: T, row: InsertInput<T>): Promise<Row<T>> {
    const [r] = await this.insertMany(table, [row]);
    return r;
  }

  async insertMany<T extends TableName>(table: T, rows: InsertInput<T>[]): Promise<Row<T>[]> {
    if (rows.length === 0) return [];
    const fid = await this.requireFamilyId();
    const { data, error } = await this.table(table)
      .insert(rows.map((r) => ({ ...r, family_id: fid })))
      .select();
    if (error) throw toRepoError(error);
    return data as Row<T>[];
  }

  async update<T extends TableName>(table: T, id: string, patch: Partial<Row<T>>): Promise<Row<T>> {
    const { data, error } = await this.table(table).update(patch).eq("id", id).select().single();
    if (error) throw toRepoError(error);
    return data as Row<T>;
  }

  async upsertCheckin(input: { goal_id: string; member_id: string; date: string; done: boolean; value: number }) {
    const fid = await this.requireFamilyId();
    const { data, error } = await this.db
      .from("checkins")
      .upsert({ ...input, family_id: fid }, { onConflict: "goal_id,member_id,date" })
      .select()
      .single();
    if (error) throw toRepoError(error);
    return data as CheckinRow;
  }

  async upsertWeightLog(input: { member_id: string; date: string; weight: number }) {
    const fid = await this.requireFamilyId();
    const { data, error } = await this.db
      .from("weight_logs")
      .upsert({ ...input, family_id: fid }, { onConflict: "member_id,date" })
      .select()
      .single();
    if (error) throw toRepoError(error);
    return data as WeightLogRow;
  }

  async insertBonusOnce(input: { member_id: string; amount: number; reason: string; reason_key: string }) {
    const fid = await this.requireFamilyId();
    const { data, error } = await this.db
      .from("sticker_bonuses")
      .upsert({ ...input, family_id: fid }, { onConflict: "reason_key", ignoreDuplicates: true })
      .select()
      .maybeSingle();
    if (error) throw toRepoError(error);
    return (data as StickerBonusRow | null) ?? null;
  }

  // ---------------------------------------------------------------- 실시간

  subscribe(cb: (table: RealtimeTable) => void): () => void {
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    this.requireFamilyId()
      .then((fid) => {
        if (cancelled) return;
        let ch = this.db.channel(`family:${fid}`);
        for (const table of REALTIME_TABLES) {
          ch = ch.on(
            "postgres_changes",
            { event: "*", schema: "public", table, filter: `family_id=eq.${fid}` },
            () => cb(table),
          );
        }
        channel = ch.subscribe();
      })
      .catch(() => {
        /* 가족이 없으면 구독하지 않는다 */
      });
    return () => {
      cancelled = true;
      if (channel) this.db.removeChannel(channel);
    };
  }
}
