/**
 * 메모리 저장소 — 데모 모드와 테스트용.
 * 브라우저에서는 localStorage 에 저장하고, 다른 탭의 변경은 storage 이벤트로 받아
 * Supabase Realtime 과 비슷하게 화면을 갱신한다. 서버 없이 전체 흐름을 확인하는 용도이며
 * 실제 가족 데이터 저장에는 쓰지 않는다.
 */
import type { FamilyRow, RealtimeTable } from "@/lib/db/types";
import { REALTIME_TABLES } from "@/lib/db/types";
import { todayKey } from "@/lib/date";
import { computeFamilyBalance, computeMemberBalances } from "@/lib/stats/stickers";
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

interface DemoUser {
  id: string;
  email: string;
  password: string;
}

type Tables = { [T in TableName]: Row<T>[] };

interface MemoryState {
  users: DemoUser[];
  sessionUserId: string | null;
  pins: Record<string, string>; // familyId → pin (데모 전용, 해시 없음)
  tables: Tables;
}

const STORAGE_KEY = "fq.demo.v1";

function emptyTables(): Tables {
  return {
    families: [],
    members: [],
    plans: [],
    plan_weeks: [],
    quests: [],
    goal_changes: [],
    checkins: [],
    rewards: [],
    redemptions: [],
    weight_logs: [],
    cheers: [],
    sticker_bonuses: [],
  };
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** DB 의 default 값과 같은 기본값 */
const DEFAULTS: { [T in TableName]?: Partial<Row<T>> } = {
  members: { is_minor: false, birth_year_month: null, sex: null, height_cm: null, sort_order: 0, active: true },
  plans: { activity_level: "light", kind: "loss", status: "active" },
  plan_weeks: { daily_deficit: 0, diet_kcal: 0, exercise_kcal: 0, exercise_minutes_per_week: 0, passed: null, extended: false },
  quests: {
    category: null, measure: "done", target_value: 1, days_of_week: [], weekly_target: null, stickers: 1,
    status: "approved", source: "manual", plan_id: null, plan_stage: null, created_by_member_id: null, active: true,
  },
  goal_changes: { old_target: null, new_target: null, changed_by: null },
  checkins: { value: 0, done: false },
  rewards: { scope: "personal", status: "approved", proposed_by_member_id: null, active: true },
  redemptions: { status: "requested", approved_at: null, fulfilled_at: null },
  sticker_bonuses: { reason_key: null },
};

export class MemoryRepo implements FamilyRepo {
  readonly mode = "demo" as const;
  private state: MemoryState;
  private listeners = new Set<(t: RealtimeTable) => void>();
  private authListeners = new Set<(u: AuthUser | null) => void>();
  private readonly persist: boolean;

  constructor(opts: { persist?: boolean; initial?: MemoryState } = {}) {
    this.persist = opts.persist ?? typeof window !== "undefined";
    this.state = opts.initial ?? this.load() ?? { users: [], sessionUserId: null, pins: {}, tables: emptyTables() };
    if (this.persist && typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key !== STORAGE_KEY || !e.newValue) return;
        try {
          this.state = JSON.parse(e.newValue) as MemoryState;
          for (const t of REALTIME_TABLES) this.emit(t);
        } catch {
          /* 무시 */
        }
      });
    }
  }

  // ---------------------------------------------------------------- 내부

  private load(): MemoryState | null {
    if (!this.persist || typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as MemoryState) : null;
    } catch {
      return null;
    }
  }

  private save(): void {
    if (!this.persist || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* 저장 공간 부족 등은 무시 */
    }
  }

  private emit(table: RealtimeTable): void {
    for (const l of this.listeners) l(table);
  }

  private commit(table: TableName): void {
    this.save();
    if ((REALTIME_TABLES as readonly string[]).includes(table)) this.emit(table as RealtimeTable);
  }

  private get user(): DemoUser | null {
    return this.state.users.find((u) => u.id === this.state.sessionUserId) ?? null;
  }

  private familyOf(userId: string): FamilyRow | null {
    return this.state.tables.families.find((f) => f.owner_user_id === userId) ?? null;
  }

  private requireFamilyId(): string {
    const u = this.user;
    if (!u) throw new RepoError("로그인이 필요합니다", "auth");
    const f = this.familyOf(u.id);
    if (!f) throw new RepoError("가족이 없습니다", "not_found");
    return f.id;
  }

  /** 테스트·시드용: 현재 상태를 통째로 바꾼다 */
  replaceState(state: MemoryState): void {
    this.state = state;
    this.save();
    for (const t of REALTIME_TABLES) this.emit(t);
  }

  getState(): MemoryState {
    return this.state;
  }

  reset(): void {
    this.state = { users: [], sessionUserId: null, pins: {}, tables: emptyTables() };
    this.save();
  }

  // ---------------------------------------------------------------- 인증

  async getUser(): Promise<AuthUser | null> {
    const u = this.user;
    return u ? { id: u.id, email: u.email } : null;
  }

  async signIn(email: string, password: string): Promise<void> {
    const u = this.state.users.find((x) => x.email === email.trim().toLowerCase());
    if (!u || u.password !== password) throw new RepoError("이메일 또는 비밀번호가 맞지 않습니다", "auth");
    this.state.sessionUserId = u.id;
    this.save();
    this.notifyAuth();
  }

  async signUp(email: string, password: string): Promise<{ needsEmailConfirm: boolean }> {
    const e = email.trim().toLowerCase();
    if (this.state.users.some((x) => x.email === e)) throw new RepoError("이미 가입된 이메일입니다", "conflict");
    if (password.length < 6) throw new RepoError("비밀번호는 6자 이상이어야 합니다", "auth");
    const u: DemoUser = { id: uuid(), email: e, password };
    this.state.users.push(u);
    this.state.sessionUserId = u.id;
    this.save();
    this.notifyAuth();
    return { needsEmailConfirm: false };
  }

  async signOut(): Promise<void> {
    this.state.sessionUserId = null;
    this.save();
    this.notifyAuth();
  }

  async changePassword(newPassword: string): Promise<void> {
    const u = this.user;
    if (!u) throw new RepoError("로그인이 필요합니다", "auth");
    if (newPassword.length < 6) throw new RepoError("비밀번호는 6자 이상이어야 합니다", "auth");
    u.password = newPassword;
    this.save();
  }

  onAuthChange(cb: (user: AuthUser | null) => void): () => void {
    this.authListeners.add(cb);
    return () => this.authListeners.delete(cb);
  }

  private notifyAuth(): void {
    const u = this.user;
    for (const l of this.authListeners) l(u ? { id: u.id, email: u.email } : null);
  }

  // ---------------------------------------------------------------- 가족

  async getFamily(): Promise<FamilyRow | null> {
    const u = this.user;
    return u ? this.familyOf(u.id) : null;
  }

  async createFamily(input: { name: string; pin: string; members: NewMemberInput[] }): Promise<string> {
    const u = this.user;
    if (!u) throw new RepoError("로그인이 필요합니다", "auth");
    if (this.familyOf(u.id)) throw new RepoError("이미 가족이 있습니다", "conflict");
    if (!/^\d{4}$/.test(input.pin)) throw new RepoError("PIN 은 숫자 4자리여야 합니다");
    if (input.members.length < 2 || input.members.length > 5) throw new RepoError("구성원은 2~5명이어야 합니다");
    const now = new Date().toISOString();
    const family: FamilyRow = { id: uuid(), owner_user_id: u.id, name: input.name, admin_pin_hash: "demo", created_at: now };
    this.state.tables.families.push(family);
    this.state.pins[family.id] = input.pin;
    input.members.forEach((m, i) => {
      this.state.tables.members.push({ id: uuid(), family_id: family.id, ...m, sort_order: i, active: true, created_at: now });
    });
    this.save();
    this.emit("members");
    return family.id;
  }

  async updateFamilyName(name: string): Promise<void> {
    const fid = this.requireFamilyId();
    const f = this.state.tables.families.find((x) => x.id === fid)!;
    f.name = name;
    this.save();
  }

  async verifyPin(pin: string): Promise<boolean> {
    const fid = this.requireFamilyId();
    return this.state.pins[fid] === pin;
  }

  async setPin(pin: string): Promise<void> {
    if (!/^\d{4}$/.test(pin)) throw new RepoError("PIN 은 숫자 4자리여야 합니다");
    const fid = this.requireFamilyId();
    this.state.pins[fid] = pin;
    this.save();
  }

  // ---------------------------------------------------------------- 조회

  async loadSnapshot(checkinsFrom: string): Promise<FamilySnapshot> {
    const fid = this.requireFamilyId();
    const t = this.state.tables;
    const inFamily = <R extends { family_id: string }>(rows: R[]) => rows.filter((r) => r.family_id === fid);
    const members = inFamily(t.members).sort((a, b) => a.sort_order - b.sort_order);
    const goals = inFamily(t.quests);
    const checkins = inFamily(t.checkins).filter((c) => c.date >= checkinsFrom);
    const rewards = inFamily(t.rewards);
    const redemptions = inFamily(t.redemptions);
    const bonuses = inFamily(t.sticker_bonuses);
    const ledger = { familyId: fid, members, goals, checkins: inFamily(t.checkins), rewards, redemptions, bonuses };
    return {
      family: t.families.find((f) => f.id === fid)!,
      members,
      goals,
      checkins,
      checkinsFrom,
      rewards,
      redemptions,
      plans: inFamily(t.plans),
      planWeeks: inFamily(t.plan_weeks).sort((a, b) => a.week_no - b.week_no),
      weightLogs: inFamily(t.weight_logs).sort((a, b) => a.date.localeCompare(b.date)),
      cheers: inFamily(t.cheers).filter((c) => c.date >= checkinsFrom),
      bonuses,
      memberBalances: computeMemberBalances(ledger),
      familyBalance: computeFamilyBalance(ledger),
    };
  }

  // ---------------------------------------------------------------- 변경

  async insert<T extends TableName>(table: T, row: InsertInput<T>): Promise<Row<T>> {
    const [r] = await this.insertMany(table, [row]);
    return r;
  }

  async insertMany<T extends TableName>(table: T, rows: InsertInput<T>[]): Promise<Row<T>[]> {
    const fid = this.requireFamilyId();
    const now = new Date().toISOString();
    const out: Row<T>[] = [];
    for (const row of rows) {
      const full = {
        ...(DEFAULTS[table] ?? {}),
        id: uuid(),
        created_at: now,
        updated_at: now,
        requested_at: now,
        changed_at: now,
        date: table === "cheers" ? todayKey() : undefined,
        ...(row as object),
        family_id: fid,
      } as unknown as Row<T>;
      (this.state.tables[table] as Row<T>[]).push(full);
      out.push(full);
    }
    this.commit(table);
    return out;
  }

  async update<T extends TableName>(table: T, id: string, patch: Partial<Row<T>>): Promise<Row<T>> {
    const fid = this.requireFamilyId();
    const rows = this.state.tables[table] as Row<T>[];
    const i = rows.findIndex((r) => (r as { id: string }).id === id && (r as { family_id: string }).family_id === fid);
    if (i < 0) throw new RepoError("행을 찾을 수 없습니다", "not_found");
    const next = { ...rows[i], ...patch, family_id: fid } as Row<T>;
    if ("updated_at" in next) (next as { updated_at: string }).updated_at = new Date().toISOString();
    rows[i] = next;
    this.commit(table);
    return next;
  }

  async upsertCheckin(input: { goal_id: string; member_id: string; date: string; done: boolean; value: number }) {
    const fid = this.requireFamilyId();
    const existing = this.state.tables.checkins.find(
      (c) => c.family_id === fid && c.goal_id === input.goal_id && c.member_id === input.member_id && c.date === input.date,
    );
    if (existing) return this.update("checkins", existing.id, { done: input.done, value: input.value });
    return this.insert("checkins", input);
  }

  async upsertWeightLog(input: { member_id: string; date: string; weight: number }) {
    const fid = this.requireFamilyId();
    const existing = this.state.tables.weight_logs.find(
      (w) => w.family_id === fid && w.member_id === input.member_id && w.date === input.date,
    );
    if (existing) return this.update("weight_logs", existing.id, { weight: input.weight });
    return this.insert("weight_logs", input);
  }

  async insertBonusOnce(input: { member_id: string; amount: number; reason: string; reason_key: string }) {
    if (this.state.tables.sticker_bonuses.some((b) => b.reason_key === input.reason_key)) return null;
    return this.insert("sticker_bonuses", input);
  }

  // ---------------------------------------------------------------- 실시간

  subscribe(cb: (table: RealtimeTable) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}

export type { MemoryState };
