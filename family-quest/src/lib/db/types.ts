/**
 * Supabase 스키마 타입 (supabase/migrations/0001_init.sql 과 1:1).
 * `supabase gen types` 대신 손으로 작성했다. 스키마를 바꾸면 이 파일도 함께 바꾼다.
 */

export type MemberRole = "admin" | "member";
export type MemberColor = "blue" | "peach" | "mint" | "lavender" | "pink";
export type Sex = "male" | "female";
export type GoalType = "diet" | "exercise" | "habit";
export type HabitCategory = "tidy" | "study" | "sleep" | "etc";
export type Measure = "done" | "count" | "minutes";
export type GoalStatus = "proposed" | "approved";
export type GoalSource = "manual" | "plan";
export type RewardScope = "personal" | "family";
export type RewardStatus = "proposed" | "approved";
export type RedemptionStatus = "requested" | "approved" | "fulfilled" | "rejected";
export type PlanStage = "adapt" | "expand" | "strengthen" | "maintain";
export type PlanStatus = "active" | "done";
export type PlanKind = "loss" | "maintain";
export type ActivityLevel = "light" | "moderate" | "active";

export type FamilyRow = {
  id: string;
  owner_user_id: string;
  name: string;
  admin_pin_hash: string | null;
  created_at: string;
}

export type MemberRow = {
  id: string;
  family_id: string;
  display_name: string;
  role: MemberRole;
  is_minor: boolean;
  color: MemberColor;
  birth_year_month: string | null; // 'YYYY-MM'
  sex: Sex | null;
  height_cm: number | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export type PlanRow = {
  id: string;
  family_id: string;
  member_id: string;
  start_weight: number;
  target_weight: number;
  weeks: number;
  activity_level: ActivityLevel;
  kind: PlanKind;
  start_date: string; // 'YYYY-MM-DD'
  status: PlanStatus;
  created_at: string;
}

export type PlanWeekRow = {
  id: string;
  family_id: string;
  plan_id: string;
  week_no: number;
  stage: PlanStage;
  diet_ratio: number;
  daily_deficit: number;
  diet_kcal: number;
  exercise_kcal: number;
  exercise_minutes_per_week: number;
  passed: boolean | null;
  extended: boolean;
}

export type GoalRow = {
  id: string;
  family_id: string;
  owner_member_id: string | null; // null = 가족 공동
  type: GoalType;
  category: HabitCategory | null;
  title: string;
  measure: Measure;
  target_value: number;
  days_of_week: number[];
  weekly_target: number | null;
  stickers: number;
  status: GoalStatus;
  source: GoalSource;
  plan_id: string | null;
  plan_stage: PlanStage | null;
  created_by_member_id: string | null;
  active: boolean;
  created_at: string;
}

export type GoalChangeRow = {
  id: string;
  family_id: string;
  goal_id: string;
  old_target: number | null;
  new_target: number | null;
  changed_by: string | null;
  changed_at: string;
}

export type CheckinRow = {
  id: string;
  family_id: string;
  goal_id: string;
  member_id: string;
  date: string; // 'YYYY-MM-DD'
  value: number;
  done: boolean;
  created_at: string;
  updated_at: string;
}

export type RewardRow = {
  id: string;
  family_id: string;
  title: string;
  cost: number;
  scope: RewardScope;
  status: RewardStatus;
  proposed_by_member_id: string | null;
  active: boolean;
  created_at: string;
}

export type RedemptionRow = {
  id: string;
  family_id: string;
  reward_id: string;
  member_id: string;
  status: RedemptionStatus;
  requested_at: string;
  approved_at: string | null;
  fulfilled_at: string | null;
}

export type WeightLogRow = {
  id: string;
  family_id: string;
  member_id: string;
  date: string;
  weight: number;
  created_at: string;
}

export type CheerRow = {
  id: string;
  family_id: string;
  from_member_id: string;
  to_member_id: string;
  date: string;
  message: string;
  created_at: string;
}

export type StickerBonusRow = {
  id: string;
  family_id: string;
  member_id: string;
  amount: number;
  reason: string;
  reason_key: string | null;
  created_at: string;
}

export type MemberStickerBalanceRow = {
  family_id: string;
  member_id: string;
  earned: number;
  bonus: number;
  spent: number;
  balance: number;
}

export type FamilyStickerBalanceRow = {
  family_id: string;
  earned: number;
  spent: number;
  balance: number;
}

/** DB 가 기본값을 채우는 공통 컬럼 */
type Generated = "id" | "created_at" | "updated_at";

type Table<Row, Optional extends keyof Row = never> = {
  Row: Row;
  Insert: Omit<Row, Extract<Generated | Optional, keyof Row>> &
    Partial<Pick<Row, Extract<Generated | Optional, keyof Row>>>;
  Update: Partial<Row>;
  Relationships: [];
};

type View<Row> = { Row: Row; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      families: Table<FamilyRow, "admin_pin_hash">;
      members: Table<
        MemberRow,
        "is_minor" | "birth_year_month" | "sex" | "height_cm" | "sort_order" | "active"
      >;
      plans: Table<PlanRow, "activity_level" | "kind" | "start_date" | "status">;
      plan_weeks: Table<
        PlanWeekRow,
        "daily_deficit" | "diet_kcal" | "exercise_kcal" | "exercise_minutes_per_week" | "passed" | "extended"
      >;
      goals: Table<
        GoalRow,
        | "category"
        | "measure"
        | "target_value"
        | "days_of_week"
        | "weekly_target"
        | "stickers"
        | "status"
        | "source"
        | "plan_id"
        | "plan_stage"
        | "created_by_member_id"
        | "active"
      >;
      goal_changes: Table<GoalChangeRow, "old_target" | "new_target" | "changed_by" | "changed_at">;
      checkins: Table<CheckinRow, "value" | "done">;
      rewards: Table<RewardRow, "scope" | "status" | "proposed_by_member_id" | "active">;
      redemptions: Table<RedemptionRow, "status" | "requested_at" | "approved_at" | "fulfilled_at">;
      weight_logs: Table<WeightLogRow>;
      cheers: Table<CheerRow, "date">;
      sticker_bonuses: Table<StickerBonusRow, "reason_key">;
    };
    Views: {
      member_sticker_balances: View<MemberStickerBalanceRow>;
      family_sticker_balances: View<FamilyStickerBalanceRow>;
    };
    Functions: {
      my_family_id: { Args: Record<string, never>; Returns: string | null };
      seoul_today: { Args: Record<string, never>; Returns: string };
      set_admin_pin: { Args: { pin: string }; Returns: undefined };
      verify_admin_pin: { Args: { pin: string }; Returns: boolean };
      create_family: {
        Args: { family_name: string; pin: string; members_json: unknown };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** Realtime 으로 구독하는 테이블 (PLAN.md 5.7 + 화면 갱신에 필요한 것) */
export const REALTIME_TABLES = [
  "checkins",
  "goals",
  "redemptions",
  "weight_logs",
  "cheers",
  "rewards",
  "members",
  "plans",
  "plan_weeks",
  "sticker_bonuses",
] as const;
export type RealtimeTable = (typeof REALTIME_TABLES)[number];
