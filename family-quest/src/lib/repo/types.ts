import type {
  CheckinRow,
  CheerRow,
  Database,
  FamilyRow,
  FamilyStickerBalanceRow,
  GoalRow,
  MemberColor,
  MemberRole,
  MemberRow,
  MemberStickerBalanceRow,
  PlanRow,
  PlanWeekRow,
  RealtimeTable,
  RedemptionRow,
  RewardRow,
  Sex,
  StickerBonusRow,
  WeightLogRow,
} from "@/lib/db/types";

export type TableName = keyof Database["public"]["Tables"];
export type Row<T extends TableName> = Database["public"]["Tables"][T]["Row"];
export type Insert<T extends TableName> = Database["public"]["Tables"][T]["Insert"];

/** family_id 는 저장소가 채운다 */
export type InsertInput<T extends TableName> = Omit<Insert<T>, "family_id">;

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface NewMemberInput {
  display_name: string;
  role: MemberRole;
  is_minor: boolean;
  color: MemberColor;
  birth_year_month: string | null;
  sex: Sex | null;
  height_cm: number | null;
}

/** 한 가족의 데이터 전체 (체크·응원은 기간 제한) */
export interface FamilySnapshot {
  family: FamilyRow;
  members: MemberRow[];
  goals: GoalRow[];
  checkins: CheckinRow[];
  /** checkins 가 이 날짜(포함)부터 로드되어 있다 */
  checkinsFrom: string;
  rewards: RewardRow[];
  redemptions: RedemptionRow[];
  plans: PlanRow[];
  planWeeks: PlanWeekRow[];
  weightLogs: WeightLogRow[];
  cheers: CheerRow[];
  bonuses: StickerBonusRow[];
  memberBalances: MemberStickerBalanceRow[];
  familyBalance: FamilyStickerBalanceRow | null;
}

export class RepoError extends Error {
  constructor(
    message: string,
    public readonly code: "auth" | "not_found" | "conflict" | "network" | "unknown" = "unknown",
  ) {
    super(message);
    this.name = "RepoError";
  }
}

/**
 * 화면이 데이터에 접근하는 유일한 통로.
 * SupabaseRepo(실서비스)와 MemoryRepo(데모·테스트)가 같은 인터페이스를 구현한다.
 */
export interface FamilyRepo {
  readonly mode: "supabase" | "demo";

  // ---- 인증 ----
  getUser(): Promise<AuthUser | null>;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<{ needsEmailConfirm: boolean }>;
  signOut(): Promise<void>;
  /** 로그인한 계정의 비밀번호 변경 */
  changePassword(newPassword: string): Promise<void>;
  onAuthChange(cb: (user: AuthUser | null) => void): () => void;

  // ---- 가족 ----
  getFamily(): Promise<FamilyRow | null>;
  createFamily(input: { name: string; pin: string; members: NewMemberInput[] }): Promise<string>;
  updateFamilyName(name: string): Promise<void>;
  verifyPin(pin: string): Promise<boolean>;
  setPin(pin: string): Promise<void>;

  // ---- 조회 ----
  /** checkinsFrom: 'YYYY-MM-DD'. 이 날짜부터 오늘까지의 체크와 응원을 함께 읽는다 */
  loadSnapshot(checkinsFrom: string): Promise<FamilySnapshot>;

  // ---- 변경 (모두 family_id 자동 주입) ----
  insert<T extends TableName>(table: T, row: InsertInput<T>): Promise<Row<T>>;
  insertMany<T extends TableName>(table: T, rows: InsertInput<T>[]): Promise<Row<T>[]>;
  update<T extends TableName>(table: T, id: string, patch: Partial<Row<T>>): Promise<Row<T>>;
  /** 체크 저장: (goal_id, member_id, date) 유일 키로 upsert */
  upsertCheckin(input: {
    goal_id: string;
    member_id: string;
    date: string;
    done: boolean;
    value: number;
  }): Promise<CheckinRow>;
  /** 체중 저장: (member_id, date) 유일 키로 upsert */
  upsertWeightLog(input: { member_id: string; date: string; weight: number }): Promise<WeightLogRow>;
  /** 보너스 지급: reason_key 가 이미 있으면 건너뛴다 (중복 지급 방지) */
  insertBonusOnce(input: {
    member_id: string;
    amount: number;
    reason: string;
    reason_key: string;
  }): Promise<StickerBonusRow | null>;

  // ---- 실시간 ----
  subscribe(cb: (table: RealtimeTable) => void): () => void;
}

export type { FamilyRow, MemberRow, GoalRow, CheckinRow, RewardRow, RedemptionRow, PlanRow, PlanWeekRow, WeightLogRow, CheerRow, StickerBonusRow };
