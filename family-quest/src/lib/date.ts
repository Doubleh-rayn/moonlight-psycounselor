/**
 * 날짜 계산은 항상 한국 시간(Asia/Seoul) 기준 (PLAN.md 4절 규칙).
 * 서버(Vercel, UTC)와 브라우저(기기 시간대)가 달라도 같은 "오늘"을 얻기 위해
 * Date 객체를 직접 쓰지 않고 Intl 로 Seoul 기준 구성 요소를 뽑는다.
 */
export const SEOUL_TZ = "Asia/Seoul";

export interface SeoulDateParts {
  year: number;
  month: number; // 1~12
  day: number; // 1~31
  weekday: number; // 0(일)~6(토)
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function seoulDateParts(now: Date = new Date()): SeoulDateParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: SEOUL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: WEEKDAY_INDEX[parts.weekday] ?? 0,
  };
}

/** 'YYYY-MM-DD' (checkins.date 와 같은 형식) */
export function todayKey(now: Date = new Date()): string {
  const { year, month, day } = seoulDateParts(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 화면용: "10월 11일 토요일" */
export function formatKoreanDate(now: Date = new Date()): string {
  const { month, day, weekday } = seoulDateParts(now);
  return `${month}월 ${day}일 ${WEEKDAY_KO[weekday]}요일`;
}

// ---------------------------------------------------------------------------
// 'YYYY-MM-DD' 문자열 연산 (시간대 영향 없음)
// ---------------------------------------------------------------------------

export function parseKey(key: string): { year: number; month: number; day: number } {
  const [y, m, d] = key.split("-").map(Number);
  return { year: y, month: m, day: d };
}

export function toKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 날짜 키에 일수를 더한다 (UTC 로 계산해 DST·시간대 영향을 없앤다) */
export function addDays(key: string, days: number): string {
  const { year, month, day } = parseKey(key);
  const t = Date.UTC(year, month - 1, day + days);
  const d = new Date(t);
  return toKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** 요일 0(일)~6(토) */
export function weekdayOf(key: string): number {
  const { year, month, day } = parseKey(key);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** 주의 시작: 월요일 (한국 관행). 일요일은 그 주의 마지막 날 */
export function startOfWeek(key: string): string {
  const wd = weekdayOf(key);
  const back = wd === 0 ? 6 : wd - 1;
  return addDays(key, -back);
}

export function endOfWeek(key: string): string {
  return addDays(startOfWeek(key), 6);
}

/** 두 날짜 키의 차이 (b − a, 일) */
export function diffDays(a: string, b: string): number {
  const pa = parseKey(a);
  const pb = parseKey(b);
  return Math.round((Date.UTC(pb.year, pb.month - 1, pb.day) - Date.UTC(pa.year, pa.month - 1, pa.day)) / 86_400_000);
}

/** from~to 사이의 날짜 키 목록 (양 끝 포함) */
export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

export function startOfMonth(key: string): string {
  const { year, month } = parseKey(key);
  return toKey(year, month, 1);
}

export function endOfMonth(key: string): string {
  const { year, month } = parseKey(key);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return toKey(year, month, last);
}

export function addMonths(key: string, months: number): string {
  const { year, month } = parseKey(key);
  const d = new Date(Date.UTC(year, month - 1 + months, 1));
  return toKey(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}

/** "10월 11일 (토)" */
export function formatShortDate(key: string): string {
  const { month, day } = parseKey(key);
  return `${month}월 ${day}일 (${WEEKDAY_KO[weekdayOf(key)]})`;
}

export const WEEKDAY_LABELS = WEEKDAY_KO;
