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
