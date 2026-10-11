import raw from "../../../data/bmi_lms_2017.json";

/**
 * 2017 소아청소년 성장도표 "연령별 체질량지수" LMS 표.
 * 파일(data/bmi_lms_2017.json)은 코드와 분리해 두어 2027 개정 시 교체만 하면 된다.
 */
export interface LmsRow {
  L: number;
  M: number;
  S: number;
  p1: number;
  p3: number;
  p5: number;
  p10: number;
  p15: number;
  p25: number;
  p50: number;
  p75: number;
  p85: number;
  p90: number;
  p95: number;
  p97: number;
  p99: number;
}

export interface BmiTable {
  source: string;
  data: Record<"1" | "2", Record<string, LmsRow>>;
}

/** members.sex 값과 같다 */
export type Sex = "male" | "female";

/** JSON 의 성별 키: "1" = 남자, "2" = 여자 */
const SEX_KEY: Record<Sex, "1" | "2"> = { male: "1", female: "2" };

/** 표가 다루는 월령 범위 (만 개월) */
export const TABLE_MIN_MONTHS = 24;
export const TABLE_MAX_MONTHS = 227;

/** 24~35개월은 WHO Growth Standards 값, 36개월부터 2017 국내 도표 값 */
export const WHO_RANGE_MAX_MONTHS = 35;

export const BMI_TABLE: BmiTable = raw as BmiTable;

/** 표에 행이 하나라도 있으면 true. 비어 있으면 PLAN.md 8.3 대로 검사를 건너뛴다. */
export function isTableLoaded(table: BmiTable = BMI_TABLE): boolean {
  return Object.keys(table.data?.["1"] ?? {}).length > 0 && Object.keys(table.data?.["2"] ?? {}).length > 0;
}

/** 성별·월령에 해당하는 LMS 행. 범위 밖이면 undefined */
export function lookupLms(sex: Sex, ageMonths: number, table: BmiTable = BMI_TABLE): LmsRow | undefined {
  if (!Number.isInteger(ageMonths)) return undefined;
  return table.data[SEX_KEY[sex]]?.[String(ageMonths)];
}
