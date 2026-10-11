/**
 * 소아청소년 BMI 백분위수 판정 (순수 함수).
 * 근거: 2017 소아청소년 성장도표 이용지침서 (연령 계산 6쪽, BMI 7쪽, 백분위수 13쪽, 선별 기준 14쪽).
 * 화면 로직을 섞지 않는다. 결과 문구는 호출하는 쪽에서 LABELS 를 써서 표시한다.
 */
import { normalCdf } from "./normal";
import {
  BMI_TABLE,
  TABLE_MAX_MONTHS,
  TABLE_MIN_MONTHS,
  WHO_RANGE_MAX_MONTHS,
  isTableLoaded,
  lookupLms,
  type BmiTable,
  type LmsRow,
  type Sex,
} from "./table";

export { erf, normalCdf } from "./normal";
export {
  BMI_TABLE,
  TABLE_MAX_MONTHS,
  TABLE_MIN_MONTHS,
  WHO_RANGE_MAX_MONTHS,
  isTableLoaded,
  lookupLms,
  type BmiTable,
  type LmsRow,
  type Sex,
};

// ---------------------------------------------------------------------------
// 3.1 만 나이(개월)
// ---------------------------------------------------------------------------

export interface YmdDate {
  year: number;
  month: number; // 1~12
  day: number; // 1~31
}

/** 한 달을 30.4일로 보는 지침서 규칙 */
export const DAYS_PER_MONTH = 30.4;

/**
 * 만나이(개월) = floor((측정년−출생년)×12 + (측정월−출생월) + (측정일−출생일)÷30.4)
 * 측정일이 생년월일보다 앞서면 null.
 */
export function ageInMonths(birth: YmdDate, measured: YmdDate): number | null {
  const raw =
    (measured.year - birth.year) * 12 +
    (measured.month - birth.month) +
    (measured.day - birth.day) / DAYS_PER_MONTH;
  if (raw < 0) return null;
  return Math.floor(raw);
}

/**
 * 생년월만 아는 경우(members.birth_year_month). 일(day) 항을 빼고 월 차이만 쓴다.
 * 이 규칙은 명세에 없으며 사용자 확인이 필요하다 (생일을 1일로 가정하는 방식과 최대 1개월 차이).
 */
export function ageInMonthsFromYearMonth(
  birth: { year: number; month: number },
  measured: YmdDate,
): number | null {
  const raw = (measured.year - birth.year) * 12 + (measured.month - birth.month);
  return raw < 0 ? null : raw;
}

/** 나이(세)만 아는 경우 해당 연령의 시작 월령. 예: 3세 → 36 */
export function ageMonthsFromYears(years: number): number {
  return Math.floor(years) * 12;
}

// ---------------------------------------------------------------------------
// 3.2 BMI
// ---------------------------------------------------------------------------

/** BMI = 체중 ÷ 신장(cm) ÷ 신장(cm) × 10000, 소수 첫째 자리 반올림. 입력이 0 이하이면 null */
export function calcBmi(weightKg: number, heightCm: number): number | null {
  if (!(weightKg > 0) || !(heightCm > 0)) return null;
  return round1((weightKg / heightCm / heightCm) * 10000);
}

export function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

// ---------------------------------------------------------------------------
// 3.3 Z점수와 백분위수 (LMS)
// ---------------------------------------------------------------------------

export function zScore(bmi: number, { L, M, S }: Pick<LmsRow, "L" | "M" | "S">): number {
  if (L === 0) return Math.log(bmi / M) / S;
  return (Math.pow(bmi / M, L) - 1) / (L * S);
}

export function percentileFromZ(z: number): number {
  return normalCdf(z) * 100;
}

/** 극단값 규칙: Z 가 ±3 을 넘으면 "0.1 미만" / "99.9 초과" */
export const Z_EXTREME = 3;

export function formatPercentile(z: number, percentile: number): string {
  if (z > Z_EXTREME) return "99.9 초과";
  if (z < -Z_EXTREME) return "0.1 미만";
  return percentile.toFixed(1);
}

// ---------------------------------------------------------------------------
// 3.4 판정
// ---------------------------------------------------------------------------

export type BmiCategory = "obese" | "overweight" | "none";

export const OBESE_PERCENTILE = 95;
export const OVERWEIGHT_PERCENTILE = 85;
/** 백분위수가 95 미만이어도 BMI 25 이상이면 주의 표시 */
export const CAUTION_BMI = 25;

export interface BmiVerdict {
  category: BmiCategory;
  /** 백분위수 95 미만 + BMI 25 이상 */
  caution: boolean;
}

/**
 * 판정은 표시값(소수 첫째 자리 반올림)과 같은 값으로 한다.
 * 화면의 숫자와 판정이 서로 어긋나지 않게 하기 위한 결정이며, 명세 3.4 의 "계산한 백분위수" 해석에 해당한다.
 */
export function classify(percentile: number, bmi: number): BmiVerdict {
  const p = round1(percentile);
  if (p >= OBESE_PERCENTILE) return { category: "obese", caution: false };
  if (p >= OVERWEIGHT_PERCENTILE) return { category: "overweight", caution: bmi >= CAUTION_BMI };
  return { category: "none", caution: bmi >= CAUTION_BMI };
}

// ---------------------------------------------------------------------------
// 종합
// ---------------------------------------------------------------------------

export interface ChildBmiInput {
  sex: Sex;
  ageMonths: number;
  weightKg: number;
  heightCm: number;
}

export type ChildBmiResult =
  | {
      status: "ok";
      ageMonths: number;
      bmi: number;
      z: number;
      /** 0~100, 반올림 전 */
      percentile: number;
      /** 화면 표시용 ("76.3", "0.1 미만", "99.9 초과") */
      percentileLabel: string;
      verdict: BmiVerdict;
      /** 그래프·표시용 기준값 (p85, p95 등) */
      reference: LmsRow;
      /** 24~35개월: WHO 기준 구간. 36개월 경계에서 값이 급변할 수 있다 */
      whoRange: boolean;
    }
  | { status: "table_missing"; ageMonths: number }
  | { status: "under_24m"; ageMonths: number }
  | { status: "over_range"; ageMonths: number; bmi: number | null }
  | { status: "invalid_input"; reason: "weight_height" | "age" };

export function assessChildBmi(input: ChildBmiInput, table: BmiTable = BMI_TABLE): ChildBmiResult {
  const { sex, ageMonths, weightKg, heightCm } = input;

  if (!Number.isFinite(ageMonths) || ageMonths < 0) return { status: "invalid_input", reason: "age" };
  const bmi = calcBmi(weightKg, heightCm);
  if (bmi === null) return { status: "invalid_input", reason: "weight_height" };

  if (!isTableLoaded(table)) return { status: "table_missing", ageMonths };
  if (ageMonths < TABLE_MIN_MONTHS) return { status: "under_24m", ageMonths };
  if (ageMonths > TABLE_MAX_MONTHS) return { status: "over_range", ageMonths, bmi };

  const row = lookupLms(sex, Math.floor(ageMonths), table);
  if (!row) return { status: "over_range", ageMonths, bmi };

  const z = zScore(bmi, row);
  const percentile = percentileFromZ(z);

  return {
    status: "ok",
    ageMonths,
    bmi,
    z,
    percentile,
    percentileLabel: formatPercentile(z, percentile),
    verdict: classify(percentile, bmi),
    reference: row,
    whoRange: ageMonths <= WHO_RANGE_MAX_MONTHS,
  };
}

// ---------------------------------------------------------------------------
// 화면 문구 (명세 6절). 진단 표현을 쓰지 않는다.
// ---------------------------------------------------------------------------

export const BMI_LABELS = {
  category: {
    obese: "비만",
    overweight: "과체중",
    none: "해당 없음",
  } satisfies Record<BmiCategory, string>,
  caution: "주의: BMI 25 이상",
  status: {
    table_missing: "성장도표 기준 미입력",
    under_24m: "24개월 미만은 BMI 백분위수 판정 대상이 아닙니다.",
    over_range: "만 19세 이상은 소아청소년 성장도표 범위 밖입니다.",
    invalid_input: "신장·체중·나이 입력값을 확인해 주세요.",
  },
  disclaimer:
    "선별 기준은 같은 성별·연령 참조 집단과의 비교이며, 범위를 벗어나도 질환을 뜻하지 않습니다.",
  growthNote: "성장기에 열량을 급격히 줄이는 체중 관리는 성장을 방해할 수 있습니다.",
  whoRangeNote: "24~35개월은 WHO 성장 기준 값이라 36개월 경계에서 백분위수가 달라질 수 있습니다.",
  source: "2017 소아청소년 성장도표 (질병관리청·대한소아청소년과학회)",
} as const;
